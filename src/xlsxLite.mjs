/* Bağımlılıksız, asgari .xlsx okuyucu.

   Banka ekstrelerini Excel dosyasından okuyabilmek için yazıldı: ZIP kabı
   açılır, paylaşılan metin tablosu (sharedStrings) ve hücre stilleri (tarih
   biçimleri) çözülür, sayfa satır satır metin matrisine dönüştürülür.

   Kapsam bilinçli olarak dar: banka ekstresi düz bir tablodur. Önbelleğe
   alınmış formül sonuçları (<v>), satır içi metin ve tarih seri numaraları
   desteklenir. Makro, grafik, ZIP64 ve şifreli dosyalar desteklenmez.

   Metin çözme (deflate) tarayıcıdaki DecompressionStream ile yapılır; bu
   yüzden modül hem tarayıcıda hem Node 18 ve üzerinde çalışır. */

const TD = new TextDecoder("utf-8");

/* ---------------------------------------------------------------- ZIP ---- */

async function inflateRaw(veri) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Tarayıcı deflate açmayı desteklemiyor (DecompressionStream yok).");
  }
  const ds = new DecompressionStream("deflate-raw");
  const yazici = ds.writable.getWriter();
  yazici.write(veri);
  yazici.close();
  const okuyucu = ds.readable.getReader();
  const parcalar = [];
  let toplam = 0;
  for (;;) {
    const { done, value } = await okuyucu.read();
    if (done) break;
    parcalar.push(value);
    toplam += value.length;
  }
  const cikti = new Uint8Array(toplam);
  let konum = 0;
  for (const p of parcalar) {
    cikti.set(p, konum);
    konum += p.length;
  }
  return cikti;
}

// Merkezî dizin kaydının (EOCD) yerini dosyanın sonundan geriye doğru arar.
function eocdBul(u8) {
  const alt = Math.max(0, u8.length - 65557);
  for (let i = u8.length - 22; i >= alt; i--) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) {
      return i;
    }
  }
  return -1;
}

/** ZIP içindeki tüm dosyaları ad -> Uint8Array olarak döndürür. */
export async function zipOku(arrayBuffer) {
  const u8 = new Uint8Array(arrayBuffer);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const eocd = eocdBul(u8);
  if (eocd < 0) throw new Error("Dosya geçerli bir ZIP/Excel kabı değil.");

  const adet = dv.getUint16(eocd + 10, true);
  let imlec = dv.getUint32(eocd + 16, true);
  const dosyalar = new Map();

  for (let i = 0; i < adet; i++) {
    if (dv.getUint32(imlec, true) !== 0x02014b50) break;
    const yontem = dv.getUint16(imlec + 10, true);
    const sikistirilmisBoyut = dv.getUint32(imlec + 20, true);
    const adUzunluk = dv.getUint16(imlec + 28, true);
    const ekUzunluk = dv.getUint16(imlec + 30, true);
    const yorumUzunluk = dv.getUint16(imlec + 32, true);
    const yerelKonum = dv.getUint32(imlec + 42, true);
    const ad = TD.decode(u8.subarray(imlec + 46, imlec + 46 + adUzunluk));

    // Yerel başlıktaki ad/ek alan uzunlukları merkezî dizinden farklı olabilir.
    const yerelAdUzunluk = dv.getUint16(yerelKonum + 26, true);
    const yerelEkUzunluk = dv.getUint16(yerelKonum + 28, true);
    const veriBaslangic = yerelKonum + 30 + yerelAdUzunluk + yerelEkUzunluk;
    const ham = u8.subarray(veriBaslangic, veriBaslangic + sikistirilmisBoyut);

    if (yontem === 0) {
      dosyalar.set(ad, ham.slice());
    } else if (yontem === 8) {
      dosyalar.set(ad, await inflateRaw(ham));
    }

    imlec += 46 + adUzunluk + ekUzunluk + yorumUzunluk;
  }
  return dosyalar;
}

/* ------------------------------------------------------- XML yardımcıları ---- */

export function xmlKacisCoz(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function butunTleriAl(parca) {
  const sonuc = [];
  const re = /<t[^>]*>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(parca))) sonuc.push(xmlKacisCoz(m[1]));
  return sonuc.join("");
}

function paylasilanMetinler(xml) {
  if (!xml) return [];
  const parcalar = xml.match(/<si(?:\s[^>]*)?>[\s\S]*?<\/si>|<si\s*\/>/g) || [];
  return parcalar.map(butunTleriAl);
}

// Hücre biçimlerindeki tarih numaraları (yerleşik + özel biçimler).
const YERLESIK_TARIH = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58
]);

function tarihBicimliStiller(xml) {
  const tarihli = new Set();
  if (!xml) return tarihli;

  const ozel = new Map();
  const ozelBlok = xml.match(/<numFmts[\s\S]*?<\/numFmts>/);
  if (ozelBlok) {
    const re = /<numFmt[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g;
    let m;
    while ((m = re.exec(ozelBlok[0]))) ozel.set(Number(m[1]), xmlKacisCoz(m[2]));
  }

  const xfBlok = xml.match(/<cellXfs[\s\S]*?<\/cellXfs>/);
  if (!xfBlok) return tarihli;
  const re = /<xf[^>]*\/?>/g;
  let m;
  let i = 0;
  while ((m = re.exec(xfBlok[0]))) {
    const id = Number((m[0].match(/numFmtId="(\d+)"/) || [])[1]);
    const kod = ozel.get(id);
    const tarihMi =
      YERLESIK_TARIH.has(id) ||
      (kod ? tarihKoduMu(kod) : false);
    if (tarihMi) tarihli.add(i);
    i++;
  }
  return tarihli;
}

function tarihKoduMu(kod) {
  // Tırnak içindeki metni ve renk/koşul bloklarını at, sonra tarih harfi ara.
  const sade = String(kod)
    .replace(/"[^"]*"/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\\./g, "");
  return /[yd]/i.test(sade) && !/^[#0.,%\s]*$/i.test(sade);
}

// Excel tarih serisi (1900 tarih sistemi) -> YYYY-AA-GG
export function seriTarih(deger) {
  const gun = Math.floor(Number(deger));
  if (!Number.isFinite(gun)) return "";
  const ms = Date.UTC(1899, 11, 30) + gun * 86400000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function sutunIndeksi(ad) {
  let n = 0;
  for (const ch of String(ad || "")) {
    const k = ch.charCodeAt(0);
    if (k < 65 || k > 90) return null;
    n = n * 26 + (k - 64);
  }
  return n > 0 ? n - 1 : null;
}

function hucreDegeri(hucre, paylasilan, tarihliStiller) {
  const tip = (hucre.match(/\st="([^"]+)"/) || [])[1] || "";
  const stil = (hucre.match(/\ss="(\d+)"/) || [])[1];

  if (tip === "inlineStr") {
    const blok = hucre.match(/<is>[\s\S]*?<\/is>/);
    return blok ? butunTleriAl(blok[0]) : "";
  }

  const vBlok = hucre.match(/<v>([\s\S]*?)<\/v>/);
  const ham = vBlok ? xmlKacisCoz(vBlok[1]) : "";

  if (tip === "s") {
    const idx = Number(ham);
    return paylasilan[idx] !== undefined ? paylasilan[idx] : "";
  }
  if (tip === "str" || tip === "d" || tip === "e") return ham;
  if (tip === "b") return ham === "1" ? "DOĞRU" : "YANLIŞ";
  if (ham === "") return "";
  if (stil !== undefined && tarihliStiller.has(Number(stil))) {
    return seriTarih(ham);
  }
  return ham;
}

function sayfaSatirlari(xml, paylasilan, tarihliStiller) {
  const satirlar = [];
  const satirRe = /<row(?:\s[^>]*)?>([\s\S]*?)<\/row>|<row\s*\/>/g;
  let satir;
  while ((satir = satirRe.exec(xml))) {
    const govde = satir[1] || "";
    const hucreler = [];
    const hucreRe = /<c(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/c>)/g;
    let hucre;
    let sira = 0;
    while ((hucre = hucreRe.exec(govde))) {
      const tam = hucre[0];
      const indeks = sutunIndeksi((tam.match(/\sr="([A-Z]+)\d+"/) || [])[1]);
      const yer = indeks === null || indeks === undefined ? sira : indeks;
      while (hucreler.length < yer) hucreler.push("");
      hucreler[yer] = hucreDegeri(tam, paylasilan, tarihliStiller);
      sira = yer + 1;
    }
    satirlar.push(hucreler);
  }
  return satirlar;
}

/* --------------------------------------------------------------- Dışa açık ---- */

/** .xlsx dosyasını satır satır metin matrisine çevirir. */
export async function xlsxSatirlariniOku(arrayBuffer) {
  const dosyalar = await zipOku(arrayBuffer);
  const metin = (ad) => {
    const v = dosyalar.get(ad);
    return v ? TD.decode(v) : "";
  };

  const paylasilan = paylasilanMetinler(metin("xl/sharedStrings.xml"));
  const tarihliStiller = tarihBicimliStiller(metin("xl/styles.xml"));

  const sayfaAdlari = [...dosyalar.keys()]
    .filter((ad) => /^xl\/worksheets\/sheet\d+\.xml$/.test(ad))
    .sort((a, b) => {
      const no = (s) => Number((s.match(/(\d+)\.xml$/) || [])[1] || 0);
      return no(a) - no(b);
    });

  if (sayfalarBosMu(sayfaAdlari)) {
    throw new Error("Excel dosyasında okunabilir bir sayfa bulunamadı.");
  }

  const tumSatirlar = [];
  for (const ad of sayfaAdlari) {
    tumSatirlar.push(...sayfaSatirlari(metin(ad), paylasilan, tarihliStiller));
  }
  return tumSatirlar;
}

function sayfalarBosMu(adlar) {
  return !adlar || adlar.length === 0;
}
