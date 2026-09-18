/* Banka ekstresi ayrıştırıcı ve eşleştirme motoru testi.
   Çalıştır: node src/statementParser.test.mjs   (ya da: npm test)             */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { xlsxSatirlariniOku } from "./xlsxLite.mjs";
import {
  tutarCoz,
  tarihCoz,
  metindenHareketler,
  satirlardanHareketler,
  kisiEslesmesi,
  birimEslesmesi,
  eslesmeleriBul
} from "./statementParser.mjs";

let gecen = 0;
const hatalar = [];

const esit = (ad, gercek, beklenen) => {
  if (String(gercek) === String(beklenen)) {
    gecen++;
  } else {
    hatalar.push(`${ad}: beklenen "${beklenen}", gelen "${gercek}"`);
  }
};

/* =========================================================================
   1) TUTAR VE TARİH ÇÖZÜMLEME
   ========================================================================= */
esit("tutar TR binlik", tutarCoz("30.000,00"), 30000);
esit("tutar TR binlik (kuruşsuz)", tutarCoz("30.000"), 30000);
esit("tutar EN binlik", tutarCoz("30,000.00"), 30000);
esit("tutar büyük", tutarCoz("1.234.567,89"), 1234567.89);
esit("tutar EN binlik çoklu", tutarCoz("1,234,567"), 1234567);
esit("tutar ondalık nokta", tutarCoz("2500.5"), 2500.5);
esit("tutar çıplak", tutarCoz("30000"), 30000);
esit("tutar negatif", tutarCoz("-1.250,50"), -1250.5);
esit("tutar parantezli", tutarCoz("(450)"), -450);
esit("tutar para birimli", tutarCoz("30.000 TL"), 30000);
esit("tutar sembollü", tutarCoz("₺ 44.000,00"), 44000);
esit("tutar boş", tutarCoz(""), "null");
esit("tutar metin", tutarCoz("KIRA"), "null");

esit("tarih ISO", tarihCoz("2026-09-10"), "2026-09-10");
esit("tarih TR", tarihCoz("10.09.2026"), "2026-09-10");
esit("tarih TR kısa yıl", tarihCoz("10/09/26"), "2026-09-10");
esit("tarih ay adı", tarihCoz("10 Eylül 2026"), "2026-09-10");
esit("tarih çöp", tarihCoz("32.13.2026"), "");
esit("tarih boş", tarihCoz(""), "");

/* =========================================================================
   2) GERÇEK EXCEL DOSYASI
   Fixture: binlerce banka dışa aktarımı gibi sharedStrings + tarih stilleri
   içerir. Yeniden üretmek için: paylaşılan metin/tarih biçimli bir Excel
   dosyasını .xlsx olarak kaydedip src/fixtures/ altına koyun.
   ========================================================================= */
const kok = dirname(fileURLToPath(import.meta.url));
const xlsxBuf = readFileSync(join(kok, "fixtures", "ornek-banka-ekstresi.xlsx"));
const xlsxAb = xlsxBuf.buffer.slice(xlsxBuf.byteOffset, xlsxBuf.byteOffset + xlsxBuf.byteLength);
const matris = await xlsxSatirlariniOku(xlsxAb);

esit("xlsx satır sayısı", matris.length, 8);
esit("xlsx başlık", matris[0].join("|"), "Tarih|Açıklama|Borç|Alacak|Bakiye");
esit("xlsx tarih (yerleşik biçim)", matris[1][0], "2026-09-10");
esit("xlsx tarih (özel biçim dd.MM.yyyy)", matris[2][0], "2026-10-12");
esit("xlsx para biçimi tarih sayılmaz", matris[1][3], "30000");
esit("xlsx boş hücre kolonu kaydırmaz", matris[1][2], "");
esit("xlsx birleşik metin parçaları", matris[6][1], "ADI SOYADI KIRA");
esit("xlsx xml kaçışı çözülür", matris[2][1].slice(-8), "14&Daire");

const excelHareketleri = satirlardanHareketler(matris);
esit("excel hareket sayısı (TOPLAM atlandı)", excelHareketleri.length, 6);
esit("excel 1. tarih", excelHareketleri[0].tarih, "2026-09-10");
esit("excel 1. tutar (Alacak kolonu)", excelHareketleri[0].tutar, 30000);
esit("excel 1. yön", excelHareketleri[0].yon, "giris");
esit("excel 1. açıklama", excelHareketleri[0].aciklama.slice(0, 11), "FAZIL GUNES");
esit("excel 2. tutar", excelHareketleri[1].tutar, 44000);
esit("excel 3. yön (Borç kolonu)", excelHareketleri[2].yon, "cikis");
esit("excel 3. tutar", excelHareketleri[2].tutar, 2500.5);
esit("excel 4. açıklama", excelHareketleri[3].aciklama, "BILINMEYEN KISI ODEME");
esit("excel 5. açıklama", excelHareketleri[4].aciklama, "ADI SOYADI KIRA");

/* =========================================================================
   3) PDF/OCR METNİ
   ========================================================================= */
const pdfMetni = `Hesap Hareketleri
10.09.2026 FAZIL GUNES YAPI INSAAT SANAYI VE TICARET LTD.STI. KIRA ODEMESI C BLOK 27 30.000,00 130.000,00
12.10.2026 IBRAHIM SAFA KAYAR KIRA D BLOK 14 44.000,00 174.000,00
15.10.2026 HAS YEK YAPI INSAAT TICARET A.S. ORTAK GIDER -2.500,50 171.499,50
TOPLAM 74.000,00`;

const pdfHareketleri = metindenHareketler(pdfMetni);
esit("pdf hareket sayısı", pdfHareketleri.length, 3);
esit("pdf 1. tarih", pdfHareketleri[0].tarih, "2026-09-10");
esit("pdf 1. tutar (tarih/tutar karışmaz)", pdfHareketleri[0].tutar, 30000);
esit("pdf 1. bakiye ikinci aday", pdfHareketleri[0].tutarlar[1], 130000);
esit("pdf 1. açıklama tarihten arınmış", pdfHareketleri[0].aciklama.includes("10.09.2026"), "false");
esit("pdf 1. açıklama tutardan arınmış", pdfHareketleri[0].aciklama.includes("30.000"), "false");
esit("pdf 1. açıklamada blok var", pdfHareketleri[0].aciklama.includes("C BLOK 27"), "true");
esit("pdf 2. tutar (adresteki 14 tutar sayılmaz)", pdfHareketleri[1].tutar, 44000);
esit("pdf 3. yön (eksi tutar)", pdfHareketleri[2].yon, "cikis");
esit("pdf 3. tutar", pdfHareketleri[2].tutar, 2500.5);

/* =========================================================================
   4) AD / TAŞINMAZ EŞLEŞMESİ
   ========================================================================= */
const FAZIL = "FAZIL GÜNEŞ YAPI İNŞAAT SANAYİ VE TİCARET LTD.ŞTİ.";
const IBRAHIM = "İBRAHİM SAFA KAYAR";

esit(
  "kiracı adı eşleşir (Türkçe karakterler)",
  kisiEslesmesi(excelHareketleri[0].aciklama, FAZIL).eslesti,
  "true"
);
esit(
  "başka kiracı adı eşleşmez",
  kisiEslesmesi("HAS YEK YAPI INSAAT TICARET A.S. ORTAK GIDER", FAZIL).eslesti,
  "false"
);
esit("alakasız açıklama", kisiEslesmesi("BILINMEYEN KISI ODEME", IBRAHIM).eslesti, "false");
esit("taşınmaz eşleşir", birimEslesmesi(excelHareketleri[0].aciklama, "C Blok 27").eslesti, "true");
esit("başka taşınmaz eşleşmez", birimEslesmesi("IBRAHIM SAFSA KAYAR D BLOK 14", "C Blok 27").eslesti, "false");

/* =========================================================================
   5) EŞLEŞTİRME
   ========================================================================= */
const mulkler = [
  { id: "p1", tasinmazNo: "C Blok 27", ad: "DAİRE MESKEN" },
  { id: "p2", tasinmazNo: "D Blok 14", ad: "DAİRE MESKEN" }
];
const kisiler = [
  { id: "t1", name: FAZIL, propertyId: "p1" },
  { id: "t2", name: IBRAHIM, propertyId: "p2" }
];
const sozlesmeler = [
  { id: "c1", tenantId: "t1", propertyId: "p1", status: "Aktif" },
  { id: "c2", tenantId: "t2", propertyId: "p2", status: "Aktif" }
];
const taksitler = [
  { id: "y1", contractId: "c1", amount: 30000, dueDate: "2026-09-10" },
  { id: "y2", contractId: "c2", amount: 44000, dueDate: "2026-10-10" },
  { id: "y3", contractId: "c2", amount: 44000, dueDate: "2026-11-10" }
];
const senetler = [
  {
    id: "s1",
    tenantId: "t2",
    tenantName: IBRAHIM,
    senetNo: "SNT-03",
    amount: 44000,
    dueDate: "2026-12-10",
    status: "Ödenmedi (Senet)"
  }
];
const kayitlar = {
  people: kisiler,
  properties: mulkler,
  contracts: sozlesmeler,
  payments: taksitler,
  notes: senetler
};

const sonuc = eslesmeleriBul(excelHareketleri, kayitlar);
esit("sonuç sayısı", sonuc.length, 6);

esit("h0 güven", sonuc[0].guven, "kesin");
esit("h0 hedef taksit", sonuc[0].hedef.id, "y1");
esit("h0 hedef türü", sonuc[0].hedef.tur, "odeme");
esit("h0 nedeni kiracı", sonuc[0].nedenler.join(" ").includes("kiracı adı geçiyor"), "true");
esit("h0 nedeni taşınmaz", sonuc[0].nedenler.join(" ").includes("C Blok 27"), "true");

esit("h1 güven", sonuc[1].guven, "kesin");
esit("h1 hedef taksit", sonuc[1].hedef.id, "y2");

esit("h2 (hesaptan çıkış) hedefsiz", sonuc[2].hedef, "null");
esit("h2 nedeni", sonuc[2].nedenler[0].includes("tahsilat değil"), "true");

esit("h3 (tanınmayan tutar) hedefsiz", sonuc[3].hedef, "null");
esit("h3 güven", sonuc[3].guven, "yok");

esit("h4 (adsız ama tutar uyuşan) onay bekler", sonuc[4].guven, "olasi");
esit("h4 kalan senede bağlanır", sonuc[4].hedef.id, "s1");
esit("h4 hedef türü", sonuc[4].hedef.tur, "senet");
esit("h4 onay notu", sonuc[4].nedenler.join(" ").includes("Onayınızla kapatılacak"), "true");

esit("h5 güven", sonuc[5].guven, "kesin");
esit("h5 hedef taksit", sonuc[5].hedef.id, "y3");

esit(
  "aynı taksit iki kez kapatılmaz",
  new Set([sonuc[0].hedef.id, sonuc[1].hedef.id, sonuc[4].hedef.id, sonuc[5].hedef.id]).size,
  4
);
esit("pdf metninden eşleşme", eslesmeleriBul(pdfHareketleri, kayitlar)[0].hedef.id, "y1");
esit("pdf metninde çıkış eşleşmez", eslesmeleriBul(pdfHareketleri, kayitlar)[2].guven, "yok");

/* Bakiye tuzağı: satırdaki ilk tutar 30.000 ama bakiye 44.000 ve bakiye de
   bir taksitle uyuşuyor. Bakiye otomatik kapatmamalı, onaya düşmelidir. */
const bakiyeTuzagi = [
  {
    tarih: "2026-10-12",
    aciklama: "IBRAHIM SAFA KAYAR KIRA D BLOK 14",
    tutar: 30000,
    tutarlar: [30000, 44000],
    yon: "giris"
  }
];
const tuzakSonuc = eslesmeleriBul(bakiyeTuzagi, kayitlar)[0];
esit("bakiye otomatik kapatmaz", tuzakSonuc.guven, "olasi");
esit("bakiye adayı taksit olur", tuzakSonuc.hedef.id, "y2");
esit("bakiye uyarısı", tuzakSonuc.nedenler.join(" ").includes("ilk tutar değil"), "true");

/* Vade yakınlığı: Kasım ödemesi Kasım taksidini kapatır (FIFO'ya düşmez). */
const kasim = [{ tarih: "2026-11-09", aciklama: "IBRAHIM SAFA KAYAR D BLOK 14", tutar: 44000, yon: "giris" }];
esit("vadesi yakın taksit seçilir", eslesmeleriBul(kasim, kayitlar)[0].hedef.id, "y3");

/* Yalnızca kapanmamış taksitler adaydır. */
const odenmisKayitlar = {
  ...kayitlar,
  payments: taksitler.map((t) => (t.id === "y1" ? { ...t, paidAmount: t.amount } : t))
};
esit(
  "ödenmiş taksit yeniden eşleşmez",
  eslesmeleriBul([excelHareketleri[0]], odenmisKayitlar)[0].hedef,
  "null"
);

/* Senede bağlı taksit ayrı aday olmaz: aksi hâlde aynı ay iki kayda düşer ve
   biri ödendi işaretlense bile diğeri açık kalır. */
// y2 senede bağlanır ve y3 kaldırılır: açık kalan tek 44.000 hedefi senettir.
// Kural çalışmasaydı hareket y2 taksidine bağlanırdı (bkz. yukarıdaki h1).
const bagliKayitlar = {
  ...kayitlar,
  payments: taksitler.filter((t) => t.id !== "y3"),
  notes: [{ ...senetler[0], paymentId: "y2" }]
};
const bagliSonuc = eslesmeleriBul([excelHareketleri[1]], bagliKayitlar)[0];
esit("senede bağlı taksit aday olmaz", bagliSonuc.hedef.id !== "y2", "true");
esit("senede bağlı taksit yerine senet seçilir", bagliSonuc.hedef.id, "s1");
esit("senede bağlı taksit türü", bagliSonuc.hedef.tur, "senet");

/* Özet */
console.log(`\n${gecen} kontrol geçti.`);
if (hatalar.length) {
  console.error(`\n❌ ${hatalar.length} hata:`);
  hatalar.forEach((h) => console.error(" - " + h));
  process.exit(1);
}
console.log("✅ Tüm testler geçti.");
