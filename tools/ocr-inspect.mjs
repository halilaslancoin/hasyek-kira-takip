/* Teşhis aracı: bir PDF'in sayfalarını görüntüye çevirip OCR metnini yazdırır.
   Uygulamadaki akışın aynısını (2x render + Tesseract tur+eng) Node'da çalıştırır,
   böylece ayrıştırma kuralları gerçek OCR çıktısına göre ayarlanabilir.

   Gerekli: npm install --no-save @napi-rs/canvas

   Kullanım:
     node tools/ocr-inspect.mjs "/yol/belge.pdf" [sayfaSayisi] [--kaydet]
------------------------------------------------------------------------- */

import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

globalThis.DOMMatrix ??= DOMMatrix;
globalThis.ImageData ??= ImageData;
globalThis.Path2D ??= Path2D;

const dosya = process.argv[2];
if (!dosya) {
  console.error("Kullanım: node tools/ocr-inspect.mjs <pdf> [sayfaSayisi]");
  process.exit(1);
}
const sayfaSayisi = Number(process.argv[3] || 1);
const kaydet = process.argv.includes("--kaydet");
const olcekArg = (process.argv.find((a) => a.startsWith("--olcek=")) || "").split("=")[1];
const olcek = Number(olcekArg || 2);
const kontrast = process.argv.includes("--kontrast");
const adaptif = process.argv.includes("--adaptif");

// Yerel (adaptif) eşikleme: eğik çekim / gölgeli fotokopilerde tek global
// eşikten çok daha iyi sonuç verir. Ortalama tabanlı (Bradley) yöntem.
function adaptifEsik(canvas, yaricap = 15, sabit = 10) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const gri = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    gri[p] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
  }
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let satir = 0;
    for (let x = 0; x < w; x++) {
      satir += gri[y * w + x];
      I[(y + 1) * (w + 1) + (x + 1)] = I[y * (w + 1) + (x + 1)] + satir;
    }
  }
  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - yaricap);
    const y2 = Math.min(h - 1, y + yaricap);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - yaricap);
      const x2 = Math.min(w - 1, x + yaricap);
      const toplam =
        I[(y2 + 1) * (w + 1) + (x2 + 1)] -
        I[y1 * (w + 1) + (x2 + 1)] -
        I[(y2 + 1) * (w + 1) + x1] +
        I[y1 * (w + 1) + x1];
      const ortalama = toplam / ((y2 - y1 + 1) * (x2 - x1 + 1));
      const p = y * w + x;
      const v = gri[p] > ortalama - sabit ? 255 : 0;
      const q = p * 4;
      d[q] = d[q + 1] = d[q + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Fotokopi/soluk taramalarda OCR öncesi gri tonlama + otomatik kontrast
// germe (min-max) doğruluğu belirgin artırabilir.
function griVeKontrast(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    d[i] = d[i + 1] = d[i + 2] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const aralik = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - min) * 255) / aralik));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const { createWorker } = await import("tesseract.js");

const veri = new Uint8Array(readFileSync(dosya));
const pdf = await pdfjs.getDocument({ data: veri, isEvalSupported: false }).promise;
console.log(`Belge: ${dosya} · ${pdf.numPages} sayfa`);

// Dil verisi proje köküne değil geçici dizine insin.
const worker = await createWorker("tur+eng", 1, {
  logger: () => {},
  cachePath: tmpdir(),
});

let tumMetin = "";
for (let i = 1; i <= Math.min(pdf.numPages, sayfaSayisi); i++) {
  const sayfa = await pdf.getPage(i);
  const viewport = sayfa.getViewport({ scale: olcek });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await sayfa.render({ canvasContext: ctx, canvas, viewport }).promise;
  if (kontrast) griVeKontrast(canvas);
  if (adaptif) adaptifEsik(canvas);

  const png = canvas.encodeSync("png");
  console.log(`Sayfa ${i} çizildi (${canvas.width}x${canvas.height}), OCR başlıyor...`);

  const { data } = await worker.recognize(Buffer.from(png));
  tumMetin += data.text + "\n";

  if (kaydet) {
    writeFileSync(`/tmp/ocr-sayfa-${i}.png`, Buffer.from(png));
    console.log(`  -> /tmp/ocr-sayfa-${i}.png kaydedildi`);
  }
  console.log(`\n========== SAYFA ${i} OCR METNİ ==========\n`);
  console.log(data.text);
}

await worker.terminate();

if (process.argv.includes("--parse")) {
  const { sozlesmeAlanlariniCikar, bulunanEtiketler } = await import(
    "../src/contractParser.mjs"
  );
  // Uygulamadaki gibi dosya adı da ipucu olarak verilir.
  const alanlar = sozlesmeAlanlariniCikar(tumMetin, {
    dosyaAdi: dosya.split("/").pop(),
  });
  console.log("\n========== AYRIŞTIRMA SONUCU ==========\n");
  console.log("Tanınan başlıklar:", bulunanEtiketler(tumMetin).join(", ") || "(yok)");
  console.log();
  for (const [k, v] of Object.entries(alanlar)) {
    if (String(v).trim() !== "") console.log(`  ${k.padEnd(16)} ${v}`);
  }
  const bos = Object.entries(alanlar)
    .filter(([, v]) => String(v).trim() === "")
    .map(([k]) => k);
  console.log("\n  (boş alanlar:", bos.join(", ") || "yok", ")");
}

if (kaydet) {
  writeFileSync("/tmp/ocr-metin.txt", tumMetin);
  console.log("\n-> /tmp/ocr-metin.txt kaydedildi");
}
