/* Banka ekstresi ayrıştırma ve akıllı eşleştirme motoru.

   Saf tutulur (dosya/ağ/localStorage erişimi yok) ki testlerle doğrulanabilsin;
   dosyadan metin çıkarma işi uygulama tarafında yapılır (pdf.js / Tesseract /
   xlsxLite).

   Akış:   satırlar ya da serbest metin -> hareketler -> eşleştirme önerileri

   Eşleştirme kuralı: bir tahsilat "kesin" sayılır ancak tutarı bekleyen bir
   taksitle birebir uyuşuyor VE açıklamada kiracı adı ya da taşınmaz numarası
   geçiyorsa. Yalnızca tutar uyuşanlar "olası" olarak işaretlenir ve kullanıcı
   onayına bırakılır; böylece yanlış borç kapatılmaz. Bir taksit tek bir
   hareketle kapatılır (aynı taksit iki kez eşleşmez). */

import { trSadelestir } from "./contractParser.mjs";

/* ------------------------------------------------------------ sayı/tarih ---- */

// "30.000,00" · "30,000.00" · "30000.5" · "-1.250" · "(450)" -> Number
export function tutarCoz(ham) {
  if (ham === null || ham === undefined) return null;
  const s = String(ham).trim();
  if (!s || !/\d/.test(s)) return null;

  const parantezli = /^\(.*\)$/.test(s);
  // "30.000,00-" gösterimi de çıkış (borç) anlamına gelir.
  const negatif = parantezli || /^\s*-/.test(s) || /\s-\s*$/.test(s) || /\d\s*-\s*$/.test(s);
  let govde = s.replace(/[^\d.,]/g, "");
  if (!/\d/.test(govde)) return null;

  const noktaSayisi = (govde.match(/\./g) || []).length;
  const virgulSayisi = (govde.match(/,/g) || []).length;

  if (noktaSayisi && virgulSayisi) {
    // Son ayıraç ondalıktır, diğeri binlik ayıracıdır.
    const ondalikAyrac = govde.lastIndexOf(".") > govde.lastIndexOf(",") ? "." : ",";
    const binlikAyrac = ondalikAyrac === "." ? "," : ".";
    govde = govde.split(binlikAyrac).join("");
    govde = govde.replace(ondalikAyrac, ".");
  } else if (virgulSayisi) {
    const parcalar = govde.split(",");
    const ondalik = parcalar[parcalar.length - 1] || "";
    // "30,00" ondalık; "1,234" ve "1,234,567" ise binlik ayracıdır.
    govde =
      virgulSayisi === 1 && ondalik.length > 0 && ondalik.length <= 2
        ? parcalar[0] + "." + ondalik
        : parcalar.join("");
  } else if (noktaSayisi) {
    const parcalar = govde.split(".");
    const ondalik = parcalar[parcalar.length - 1] || "";
    // "30.000" binliktir; "30000.5" ve "2500.25" ondalıktır.
    govde =
      noktaSayisi > 1 || ondalik.length === 3
        ? parcalar.join("")
        : parcalar.slice(0, -1).join("") + "." + ondalik;
  }

  const sayi = Number(govde);
  if (!Number.isFinite(sayi)) return null;
  return negatif ? -sayi : sayi;
}

const AYLAR = {
  ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7,
  agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12
};

const ikiHane = (n) => String(n).padStart(2, "0");

function tarihKur(yil, ay, gun) {
  const y = Number(yil);
  const a = Number(ay);
  const g = Number(gun);
  if (!y || !a || !g) return "";
  if (a < 1 || a > 12 || g < 1 || g > 31) return "";
  const tamYil = y < 100 ? 2000 + y : y;
  const d = new Date(Date.UTC(tamYil, a - 1, g));
  if (d.getUTCMonth() !== a - 1 || d.getUTCDate() !== g) return "";
  return `${tamYil}-${ikiHane(a)}-${ikiHane(g)}`;
}

// "2026-09-10" · "10.09.2026" · "10/09/26" · "10 Eylül 2026" -> "2026-09-10"
export function tarihCoz(ham) {
  const s = String(ham || "").trim();
  if (!s) return "";

  const iso = s.match(/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
  if (iso) return tarihKur(iso[1], iso[2], iso[3]);

  const gunAy = s.match(/(\d{1,2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{2,4})/);
  if (gunAy) return tarihKur(gunAy[3], gunAy[2], gunAy[1]);

  const ayAdli = trSadelestir(s).match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (ayAdli && AYLAR[ayAdli[2]]) return tarihKur(ayAdli[3], AYLAR[ayAdli[2]], ayAdli[1]);

  return "";
}

export const paraYaz = (n) =>
  Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

/* ------------------------------------------------------------ satır okuma ---- */

const BASLIK_ANAHTARLARI = [
  { alan: "tarih", re: /(^|[^a-z])(tarih|islem tarihi|valor)/ },
  { alan: "aciklama", re: /(aciklama|description|hesap hareketi|islem aciklamasi|detay)/ },
  { alan: "tutar", re: /(^|[^a-z])(tutar|miktar|amount|islem tutari)/ },
  { alan: "borc", re: /(borc|debit|cikan|giden|odenen)/ },
  { alan: "alacak", re: /(alacak|credit|giren|tahsil|yatirilan)/ },
  { alan: "bakiye", re: /(bakiye|balance|kalan)/ },
  // Fiş No / dekont no kolonu tutar değildir: tanınmazsa satır sonundaki tutar
  // bloğu yanlış kolondan (fiş numarasından) okunabilirdi.
  {
    alan: "fisNo",
    re: /(^|[^a-z])(fis|dekont|makbuz|referans|evrak|seri|belge|islem|hareket)\s*(no|no\.|nr|numarasi|numaralari|numarali)\s*$/
  }
];

const TOPLAM_RE = /^(genel\s+)?(toplam|ara toplam|bakiye|devir|acilis|kapanis|onceki bakiye|son bakiye)/;

/* Tarih taşımayan ekstre başlık/altlık satırları (IBAN, hesap no, sayfa
   bilgisi, bakiye özeti) hareket DEĞİLDİR. Aksi hâlde taranmış ekstrenin her
   sayfasındaki "Sayfa Sonu Bakiye 44.000,00" satırı ödeme sanılır ve yanlış
   borç kapatılabilir. Kelime sınırı gözetilir ("Özşube" gibi adlar etkilenmez). */
const GURULTU_RE =
  /(^|[^a-z])(iban|hesap|sube|musteri|sayfa|ekstre|swift|bakiye|devir|toplam|mutabakat|dekont tarihi)([^a-z]|$)/;

function baslikSatiriMi(satir) {
  const sade = satir.map((h) => trSadelestir(h));
  let sayi = 0;
  for (const k of BASLIK_ANAHTARLARI) {
    if (sade.some((h) => h && k.re.test(h))) sayi++;
  }
  return sayi;
}

function baslikHaritasi(satir) {
  const harita = {};
  satir.forEach((hucre, i) => {
    const s = trSadelestir(hucre);
    if (!s) return;
    for (const k of BASLIK_ANAHTARLARI) {
      if (harita[k.alan] !== undefined) continue;
      if (k.re.test(s)) harita[k.alan] = i;
    }
  });
  // Borç/Alacak kolonları varsa "tutar" tek başına anlam taşımaz.
  if (harita.alacak !== undefined || harita.borc !== undefined) delete harita.tutar;
  return harita;
}

/* Açıklama kolonu boşsa satırdaki en uzun METİN hücresi açıklama sayılır.
   Salt sayı hücreleri (tutar / bakiye / fiş no) ve sayı yoğun hücreler (IBAN,
   hesap no) elenir. Ancak kolonlar tek hücrede birleşmişse (colspan) açıklama
   hücresi fiş numarasını da taşır ("12345 IBRAHIM ... KIRA"); bu hücre
   reddedilirse açıklama tamamen kaybolur, bu yüzden harf yoğunluğu yeterliyse
   yedek olarak kabul edilir. */
function metinHucresi(satir) {
  let enIyi = "";
  let gevsek = "";
  for (const h of satir) {
    const s = String(h || "").trim();
    if (!s || !/[a-zçğıöşü]/i.test(s) || tutarHucresiMi(s)) continue;
    if (!/\d{4,}/.test(s)) {
      if (s.length > enIyi.length) enIyi = s;
    } else if ((s.match(/[a-zçğıöşü]/gi) || []).length >= 3 && s.length > gevsek.length) {
      gevsek = s;
    }
  }
  return enIyi || gevsek;
}

/* Banka ekstrelerinin kolon düzeni sağda sabittir: "... Açıklama | Tutar |
   Bakiye". Bu yüzden bir kolon başlığı tanınmadığında tutar, satırın sonundaki
   ARDIŞIK tutar hücrelerinden okunur: açıklama (metin) ya da Fiş No (tanınan
   kolon) bu zinciri keser ve tutar sanılmaz. */
const TUTAR_HUCRE_RE = /^[-+(]?\s*\d[\d.,]*\s*[-)]?\s*(?:tl|try|₺)?$/i;

const tutarHucresiMi = (deger) => {
  const s = String(deger === undefined || deger === null ? "" : deger).trim();
  return !!s && /\d/.test(s) && TUTAR_HUCRE_RE.test(s);
};

/* BİÇİMLİ tutar hücresi mi ("30.000,00", "2.500,50-")? Başlık satırı ayırt
   edilirken kullanılır: "2026" gibi çıplak sayı taşıyan bir kolon başlığı
   ("2026 | Açıklama | Tutar") yanlışlıkla hareket sayılmamalıdır. */
const bicimliTutarHucresiMi = (deger) => tutarHucresiMi(deger) && /[.,]\d/.test(String(deger).trim());

/* Satır kolon başlığı mı? En az iki kolon adı tanınmalı VE satır tarih ya da
   biçimli tutar taşımamalıdır: "Tarih: 10.09.2026 | Tutar: 30.000,00" gibi
   etiketli bir HAREKET satırı başlık sanılıp atlanmamalıdır. */
const baslikSatiriGibiMi = (satir) =>
  Array.isArray(satir) &&
  baslikSatiriMi(satir) >= 2 &&
  !satir.some((h) => tarihCoz(h)) &&
  !satir.some((h) => bicimliTutarHucresiMi(h));

function sondakiTutarBlogu(satir, haric = new Set()) {
  const blok = [];
  for (let i = satir.length - 1; i >= 0; i--) {
    const s = String(satir[i] === undefined || satir[i] === null ? "" : satir[i]).trim();
    if (!s) {
      // Satır sonundaki boş hücreler atlanır; blok başladıysa boşluk ayraçtır.
      if (blok.length) break;
      continue;
    }
    if (haric.has(i)) {
      if (blok.length) break;
      continue;
    }
    if (!tutarHucresiMi(s)) break;
    blok.unshift(s);
  }
  return blok;
}

function satiriYorumla(satir, harita) {
  const hucre = (i) => (i === undefined ? "" : String(satir[i] === undefined || satir[i] === null ? "" : satir[i]));

  let aciklama = harita.aciklama !== undefined ? hucre(harita.aciklama).trim() : "";
  let tarih = harita.tarih !== undefined ? tarihCoz(hucre(harita.tarih)) : "";

  // Başlık yoksa: tarih gibi görünen ilk hücre + en uzun metin hücresi.
  if (!tarih) {
    for (const h of satir) {
      const t = tarihCoz(h);
      if (t) {
        tarih = t;
        break;
      }
    }
  }
  if (!aciklama) aciklama = metinHucresi(satir);

  let tutar = null;
  let tutarlar = null;
  let yon = "giris";
  const alacak = harita.alacak !== undefined ? tutarCoz(hucre(harita.alacak)) : null;
  const borc = harita.borc !== undefined ? tutarCoz(hucre(harita.borc)) : null;

  if (harita.alacak !== undefined || harita.borc !== undefined) {
    // Borç/Alacak düzeni: hangi kolon doluysa yönü o belirler.
    if (alacak !== null && alacak !== 0) {
      tutar = Math.abs(alacak);
      yon = "giris";
    } else if (borc !== null && borc !== 0) {
      tutar = Math.abs(borc);
      yon = "cikis";
    }
  } else {
    // Tutar (+ Bakiye) düzeni: "Tutar" birincil, "Bakiye" yalnızca ikincil
    // adaydır; böylece bakiye ile borç otomatik kapatılmaz, öneri olarak kalır.
    const adaylar = [];
    const tutarHucresi = harita.tutar !== undefined ? hucre(harita.tutar).trim() : "";
    if (tutarHucresi) {
      adaylar.push(tutarHucresi);
      const bakiyeHucresi = harita.bakiye !== undefined ? hucre(harita.bakiye).trim() : "";
      if (tutarHucresiMi(bakiyeHucresi)) adaylar.push(bakiyeHucresi);
    } else {
      // Tutar kolonu yok ya da boş: satır sonundaki ardışık blok (Tutar, Bakiye).
      const haric = new Set();
      if (harita.tarih !== undefined) haric.add(harita.tarih);
      if (harita.fisNo !== undefined) haric.add(harita.fisNo);
      if (harita.bakiye !== undefined) haric.add(harita.bakiye);
      adaylar.push(...sondakiTutarBlogu(satir, haric));
    }

    const cozulen = adaylar
      .map((ham) => ({ ham, n: tutarCoz(ham) }))
      .filter((x) => x.n !== null && x.n !== 0);
    if (cozulen.length) {
      tutar = Math.abs(cozulen[0].n);
      if (cozulen.length > 1) tutarlar = cozulen.map((x) => Math.abs(x.n));
      yon = cozulen[0].n < 0 || /^\s*[-+(]/.test(cozulen[0].ham) ? "cikis" : "giris";
    }
  }

  return { tarih, aciklama, tutar, tutarlar, yon, satir };
}

/* Ekstre başlık/altlık satırı mı? İki biçim ayırt edilir:
   * "Etiket: değer" satırları ("Ekstre Tarihi: 18.09.2026", "Hesap No: ...")
     tarih taşısalar bile hareket değildir.
   * Tarih taşımayan ve başlık/altlık kelimesi içeren satırlar
     ("Sayfa Sonu Bakiye 44.000,00").
   Açıklamasında bu kelimeler geçen GERÇEK hareketler ("PENDIK SUBE KIRA
   TAHSILATI") elenmez: ikinci kural yalnızca tarihsiz satırlara uygulanır. */
/* Banka ekstrelerinin üst bilgisi "Etiket: değer" biçimindedir; bunlar tarih
   taşısalar bile hareket değildir. Etiket listesi bankaların yaygın kullandığı
   alanları kapsar; gerçek hareket açıklamaları (ör. "PENDIK SUBE KIRA
   TAHSILATI") iki nokta taşımadığı için etkilenmez. */
const BASLIK_ETIKET_RE =
  /(iban|hesap|sayfa|ekstre|swift|mutabakat|dekont tarihi|muhasebe|birim|sube|musteri|temsilci|adres|telefon|vergi|doviz|para birimi|kayit tarihi|islem tarihi)\s*(no|no\.|nr|numarasi|numaralari|tarihi|tarih|birimi|birim|temsilcisi|adresi|adi|soyadi)?\s*:/;

function gurultuSatiriMi(aciklama, tarih) {
  const sade = trSadelestir(aciklama).trim();
  if (!sade) return false;
  if (BASLIK_ETIKET_RE.test(sade)) return true;
  return !tarih && GURULTU_RE.test(sade);
}

/** Tablo satırlarını (xlsx matrisi, CSV) hesap hareketlerine çevirir. */
export function satirlardanHareketler(satirlar) {
  return satirlardanHareketlerAyrintili(satirlar).hareketler;
}

/* Raporlanacak en fazla satır: uzun ekstrelerde arayüzü boğmamak için. */
const RAPOR_MAKS = 40;

const satirDoluMu = (satir) =>
  Array.isArray(satir) &&
  satir.some((h) => String(h === undefined || h === null ? "" : h).trim());

const satirOzeti = (degerler) =>
  (Array.isArray(degerler) ? degerler : [degerler])
    .map((x) => String(x === undefined || x === null ? "" : x).trim())
    .filter(Boolean)
    .join(" | ")
    .slice(0, 180);

/**
 * Tablo satırlarını hareketlere çevirir ve OKUNAMAYAN satırları da bildirir.
 * Taranmış/eksik ekstrelerde bir satırın sessizce kaybolması, ödenmemiş
 * görünen bir taksit demektir; bu yüzden atlananlar kullanıcıya gösterilir.
 * Dönen: { hareketler, atlananlar, yoksayilanlar }
 */
export function satirlardanHareketlerAyrintili(satirlar) {
  const hareketler = [];
  const atlananlar = [];
  const yoksayilanlar = [];
  if (!Array.isArray(satirlar) || !satirlar.length) return { hareketler, atlananlar, yoksayilanlar };

  // İLK tanınan başlık satırı temel alınır (en yüksek puanlısı değil): çok
  // sayfalı ekstrede sonraki tablonun başlığı daha çok kolon tanısa bile ilk
  // tablonun hareket satırlarını yutmamalıdır. Tekrarlanan başlıklar döngü
  // içinde ele alınır ve kolon düzeni orada güncellenir.
  let baslikIndeksi = -1;
  for (let i = 0; i < Math.min(satirlar.length, 25); i++) {
    if (baslikSatiriGibiMi(satirlar[i] || [])) {
      baslikIndeksi = i;
      break;
    }
  }
  let harita = baslikIndeksi >= 0 ? baslikHaritasi(satirlar[baslikIndeksi]) : {};
  const baslangic = baslikIndeksi >= 0 ? baslikIndeksi + 1 : 0;

  const ekle = (satir, neden, yoksay) => {
    const hedef = yoksay ? yoksayilanlar : atlananlar;
    if (hedef.length >= RAPOR_MAKS) return;
    hedef.push({ satir: satirOzeti(satir), neden });
  };

  for (let i = baslangic; i < satirlar.length; i++) {
    const satir = satirlar[i] || [];
    if (!satirDoluMu(satir)) continue;
    // Çok sayfalı ekstrelerde (ör. HTML'de her sayfa ayrı bir <table>) kolon
    // başlığı her sayfada TEKRARLANIR. Tekrarlanan başlık bir hareket değildir:
    // "okunamayan satır" diye raporlanmamalı, ayrıca aşağıdaki satırlar için
    // yeni kolon düzeni geçerli olmalıdır.
    if (baslikSatiriGibiMi(satir)) {
      const yeniHarita = baslikHaritasi(satir);
      // Daha eksik bir alt başlık, tanınan kolonları kaybettirmesin.
      if (Object.keys(yeniHarita).length >= Object.keys(harita).length) harita = yeniHarita;
      continue;
    }
    const h = satiriYorumla(satir, harita);
    if (TOPLAM_RE.test(trSadelestir(h.aciklama).trim())) {
      ekle(satir, "Toplam/bakiye satırı", true);
      continue;
    }
    if (gurultuSatiriMi(h.aciklama, h.tarih)) {
      ekle(satir, "Ekstre başlığı/altlığı", true);
      continue;
    }
    if (h.tutar === null || h.tutar === 0) {
      // Tarih ya da açıklama varsa bu satır bir hareket olmalıydı.
      if (h.tarih || h.aciklama) ekle(satir, "Tutar okunamadı", false);
      continue;
    }
    if (!h.aciklama && !h.tarih) {
      ekle(satir, "Açıklama okunamadı", false);
      continue;
    }
    hareketler.push(h);
  }
  return { hareketler, atlananlar, yoksayilanlar };
}

/* --------------------------------------------------------------- HTML ----

   Banka internet şubeleri ekstreyi çoğu zaman HTML olarak indirir. Etiketleri
   boşlukla silmek tablo yapısını yok eder: bütün satırlar tek satıra düşer ve
   her şey tek bir "açıklama" olur (Tarih/Fiş No/Tutar/Bakiye ayrı ayrı
   okunamaz). Bu yüzden HTML önce satır/hücre matrisine çevrilir ve normal tablo
   yolu işletilir. Tablo yoksa blok etiketleri satır sonuna çevrilip metin yolu
   kullanılır. */

const HTML_VARLIKLARI = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", shy: "",
  ccedil: "ç", Ccedil: "Ç", gbreve: "ğ", Gbreve: "Ğ", imath: "ı", Idot: "İ",
  ouml: "ö", Ouml: "Ö", scedil: "ş", Scedil: "Ş", uuml: "ü", Uuml: "Ü",
  ndash: "-", mdash: "-", hellip: "...", middot: " ", bull: " ", deg: "°",
  euro: "€", pound: "£", copy: "©", reg: "®", trade: "™"
};

/** "&nbsp;" · "&#231;" · "&#xE7;" · "&amp;" gibi HTML varlıklarını karaktere çevirir. */
export function htmlVarliklariniCoz(metin) {
  return String(metin || "").replace(
    /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (tam, kod) => {
      if (kod[0] === "#") {
        const onalti = kod[1] === "x" || kod[1] === "X";
        const sayi = parseInt(kod.slice(onalti ? 2 : 1), onalti ? 16 : 10);
        if (!Number.isFinite(sayi) || sayi < 1 || sayi > 0x10ffff) return tam;
        try {
          return String.fromCodePoint(sayi);
        } catch {
          return tam;
        }
      }
      const ad = HTML_VARLIKLARI[kod] !== undefined ? kod : kod.toLowerCase();
      return HTML_VARLIKLARI[ad] !== undefined ? HTML_VARLIKLARI[ad] : tam;
    }
  );
}

const HTML_MI_RE =
  /<(?:!doctype\s+html|html|head|body|table|thead|tbody|tfoot|tr|td|th|div|span|meta|p|pre)\b/i;

/** Metin bir HTML belgesi/parçası mı? (PDF/OCR/CSV metinlerinde "<" olmaz.) */
export function htmlMi(metin) {
  return HTML_MI_RE.test(String(metin || ""));
}

/* Hücre içeriği: <br> ayraç, diğer etiketler boşluk olur. */
function htmlHucreMetni(parca) {
  return htmlVarliklariniCoz(
    String(parca || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(?:p|div|li|h[1-6])>/gi, " ")
      .replace(/<[^>]*>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * HTML ekstredeki tabloları satır/hücre matrisine çevirir (xlsx matrisi ile
 * aynı biçim). Özellikler:
 *   * Etiketler arası gerçek hücreler korunur; böylece "Tarih | Fiş No |
 *     Açıklama | Tutar | Bakiye" ayrı ayrı okunur.
 *   * Kapanış </td> etiketi eksik olsa da çalışır (HTML'de isteğe bağlıdır).
 *   * colspan kadar boş hücre eklenir ki sonraki kolonlar kaymasın.
 *   * Hücre içindeki iç içe tablonun metni hücreye katılır, satırları matrise
 *     karışmaz.
 * Tablo yoksa null döner; çağıran taraf düz metin yoluna düşer.
 */
export function htmlSatirlariniOku(html) {
  const kaynak = String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|head|title)\b[\s\S]*?<\/\1\s*>/gi, " ");
  if (!/<table\b/i.test(kaynak)) return null;

  const matris = [];
  const etiketRe = /<(\/?)(table|tr|td|th)\b([^>]*)>/gi;
  let tabloDerinlik = 0;
  let satir = null;
  let hucreBaslangic = -1;
  let hucreAttrs = "";
  let m;

  const satiriKapat = () => {
    if (satir && satir.some((h) => h)) matris.push(satir);
    satir = null;
  };
  const hucreyiKapat = (bitis) => {
    if (hucreBaslangic < 0) return;
    if (satir) {
      satir.push(htmlHucreMetni(kaynak.slice(hucreBaslangic, bitis)));
      const cs = hucreAttrs.match(/\bcolspan\s*=\s*["']?\s*(\d+)/i);
      const adet = cs ? Math.min(Math.max(Number(cs[1]) || 1, 1), 50) : 1;
      for (let k = 1; k < adet; k++) satir.push("");
    }
    hucreBaslangic = -1;
    hucreAttrs = "";
  };

  while ((m = etiketRe.exec(kaynak))) {
    const kapanis = m[1] === "/";
    const ad = m[2].toLowerCase();

    if (ad === "table") {
      if (!kapanis) {
        tabloDerinlik += 1;
      } else {
        const yeni = Math.max(0, tabloDerinlik - 1);
        // Yalnızca EN DIŞ tablo kapanırken satır/hücre bitirilir. İç içe tablo
        // kapanışı hücreyi bitirmemeli; aksi hâlde hücre metninin kalanı
        // ("... TAHSILATI") kaybolur.
        if (tabloDerinlik === 1 && yeni === 0) {
          hucreyiKapat(m.index);
          satiriKapat();
        }
        tabloDerinlik = yeni;
      }
      continue;
    }
    // Yalnızca en dış tablonun satırları toplanır; iç içe tablonun satırları
    // hücre metnine katılır (bkz. yukarıdaki açıklama).
    if (tabloDerinlik !== 1) continue;

    if (ad === "tr") {
      hucreyiKapat(m.index);
      satiriKapat();
      if (!kapanis) satir = [];
      continue;
    }
    // td / th
    if (kapanis) {
      hucreyiKapat(m.index);
    } else {
      hucreyiKapat(m.index); // kapanışsız bırakılmış önceki hücre
      if (!satir) satir = [];
      hucreBaslangic = etiketRe.lastIndex;
      hucreAttrs = m[3] || "";
    }
  }
  hucreyiKapat(kaynak.length);
  satiriKapat();

  return matris.length ? matris : null;
}

/** Tablo yoksa: blok etiketleri satır sonuna, satır içi etiketler boşluğa çevrilir. */
export function htmlMetneCevir(html) {
  return htmlVarliklariniCoz(
    String(html || "")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|head|title)\b[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(
        /<\/(?:tr|div|p|li|h[1-6]|table|thead|tbody|tfoot|section|article|header|footer|pre|dd|dt|form)>/gi,
        "\n"
      )
      .replace(
        /<(?:tr|div|p|li|h[1-6]|table|section|article|header|footer|pre|dd|dt|form)\b[^>]*>/gi,
        "\n"
      )
      .replace(/<[^>]*>/g, " ")
  );
}

/* -------------------------------------------------------------- metin ---- */

const TARIH_SAYI_RE =
  /\d{4}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{1,2}|\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{2,4}/;
const TARIH_ADLI_RE = /\d{1,2}\s+[a-zçğıöşü]+\s+\d{4}/i;

/* Satırdan tarihi ayıklar: sayısal ("10.09.2026") ya da ay adlı
   ("10 Eylül 2026") biçim. Ay adı yalnızca geçerli bir tarihe çözülürse
   ayıklanır; yoksa açıklamadaki "10 DAIRESI 2026" gibi metin korunur. */
function satirdanTarih(satir) {
  const sayisal = satir.match(TARIH_SAYI_RE);
  if (sayisal) return { tarih: tarihCoz(sayisal[0]), kalan: satir.replace(sayisal[0], " ") };

  const adli = satir.match(TARIH_ADLI_RE);
  const tarih = adli ? tarihCoz(adli[0]) : "";
  if (!tarih) return { tarih: "", kalan: satir };
  return { tarih, kalan: satir.replace(adli[0], " ") };
}

/* Taranmış ekstrelerde binlik ayracı boşluk olabilir: "30 000,00". Yalnızca
   "boşlukla ayrılmış rakam grubu" deseni birleştirilir: soldaki kısa bir tam
   sayı (1-3 rakam, isteğe bağlı 3'lü gruplar), sağdaki tam 3 rakam (+ kuruş).
   Böylece "30.000,00 130.000,00" gibi iki ayrı kolon yanlışlıkla birleşmez. */
function binlikBosluklariBirlestir(tokenler) {
  const sonuc = [];
  for (let i = 0; i < tokenler.length; i++) {
    let t = tokenler[i];
    while (
      i + 1 < tokenler.length &&
      /^\d{1,3}(\d{3})*$/.test(t) &&
      /^\d{3}([.,]\d{1,2})?$/.test(tokenler[i + 1])
    ) {
      t += tokenler[i + 1];
      i += 1;
    }
    sonuc.push(t);
  }
  return sonuc;
}

// Token (hücre) tutar gibi mi? Sondaki para birimi yok sayılır.
const metinTutarHucresiMi = (t) =>
  TUTAR_HUCRE_RE.test(String(t || "").replace(/(tl|try|₺)$/i, ""));

/* OCR metnini tokenlara ayırır. Üç düzeltme yapar:
   * Tek başına duran para birimi ("TL") tokeni atılır: tutar değildir.
   * İşaret sayıdan ayrılmışsa birleştirilir ("- 2.500,50" -> "-2.500,50",
     "( 450 )" -> "(450)"). Aksi hâlde çıkış hareketi giriş sanılır.
   * Boşluklu binlik ayracı kapatılır ("30 000,00" -> "30000,00"). */
function tokenlereAyir(metin) {
  const ham = String(metin || "").split(/\s+/).filter(Boolean);
  const tokenler = [];
  for (let i = 0; i < ham.length; i++) {
    const t = ham[i];
    if (/^(tl|try|₺)$/i.test(t)) continue;
    if (/^[-+(]$/.test(t) && i + 1 < ham.length) {
      if (t === "(") {
        const kapali = ham[i + 2] === ")";
        const birlesik = "(" + ham[i + 1] + (kapali ? ")" : "");
        if (TUTAR_HUCRE_RE.test(birlesik)) {
          tokenler.push(birlesik);
          i += kapali ? 2 : 1;
          continue;
        }
      } else if (metinTutarHucresiMi(t + ham[i + 1])) {
        tokenler.push(t + ham[i + 1]);
        i += 1;
        continue;
      }
    }
    tokenler.push(t);
  }
  return binlikBosluklariBirlestir(tokenler);
}

/* Bir satırın tutar adaylarını (Tutar ve Bakiye) seçer.
   Kolon sırası sağda sabittir: "... Açıklama | Tutar | Bakiye".
     * Biçimli sayılar (30.000,00) tutar/bakiyedir; son iki tanesi seçilir,
       açıklamadaki çıplak sayılar (adres/blok no: "27") elenir.
     * Hiç biçimli sayı yoksa satır sonundaki ARDIŞIK sayı bloğu tutar/bakiyedir;
       kısa çıplak sayılar (blok/daire no) bloktan çıkarılır.
   Dönen dizi [tutar] ya da [tutar, bakiye] biçimindedir.
   `haric`: indeksleri verilen tokenler (ör. Fiş No) aday sayılmaz. */
function metinTutarAdaylari(tokenler, haric = new Set()) {
  const sayilar = [];
  tokenler.forEach((t, i) => {
    if (haric.has(i)) return;
    const ham = String(t || "").replace(/(tl|try|₺)$/i, "");
    if (!TUTAR_HUCRE_RE.test(ham)) return;
    const n = tutarCoz(ham);
    if (n === null || n === 0) return;
    sayilar.push({ i, ham, n, bicimli: /[.,]\d/.test(ham) });
  });

  const bicimliler = sayilar.filter((x) => x.bicimli);
  if (bicimliler.length) return bicimliler.slice(-2);

  const blok = [];
  for (let k = sayilar.length - 1; k >= 0; k--) {
    const x = sayilar[k];
    if (blok.length && x.i !== blok[0].i - 1) break; // araya metin girdi
    if (String(Math.abs(x.n)).length < 3) break;     // "14" gibi kısa sayı
    blok.unshift(x);
  }
  return blok.slice(-2);
}

/* Satır TAMAMEN tutarlardan mı oluşuyor? Taranmış ekstrelerde uzun açıklama
   alta taşıp tutar/bakiye kendi satırında kalabilir; bu satır bir öncekine
   eklenir. Açıklama içeren satır bu koşulu sağlamaz. */
function tutarSatiriMi(metin) {
  const tokenler = tokenlereAyir(metin);
  return tokenler.length > 0 && tokenler.every(metinTutarHucresiMi);
}

/* Okunamayan bir metin satırının neden atlandığını açıklar. */
function metinAtlanmaNedeni(satir, tarih) {
  const sade = trSadelestir(satir).trim();
  if (TOPLAM_RE.test(sade)) return { neden: "Toplam/bakiye satırı", yoksay: true };
  if (gurultuSatiriMi(satir, tarih)) return { neden: "Ekstre başlığı/altlığı", yoksay: true };
  // Çok sayfalı PDF/HTML metinlerinde kolon başlığı her sayfada tekrarlanır
  // ("Tarih Açıklama Tutar"). Başlık bir hareket değildir; "okunamayan satır"
  // uyarısına düşmemelidir. Tarih taşıyan satır başlık sayılmaz.
  if (!tarih && baslikSatiriMi(String(satir).split(/\s+/)) >= 2) {
    return { neden: "Ekstre başlığı/altlığı", yoksay: true };
  }
  return { neden: "Tutar okunamadı", yoksay: false };
}

/** PDF/OCR/HTML metnini ya da noktalı virgülle ayrılmış CSV'yi hareketlere çevirir. */
export function metindenHareketler(metin) {
  return metindenHareketlerAyrintili(metin).hareketler;
}

/**
 * metindenHareketler ile aynı; ayrıca okunamayan satırları da bildirir.
 * HTML ekstreler önce TABLO olarak okunur: etiketleri silmek bütün satırları
 * tek satıra indirir ve her şey "açıklama" olurdu. Tablo okunamazsa düz metne
 * çevrilip metin yolu denenir.
 * Dönen: { hareketler, atlananlar, yoksayilanlar }
 */
export function metindenHareketlerAyrintili(metin) {
  const ham = String(metin || "");
  if (!htmlMi(ham)) return metinSatirlarindanHareketler(ham);

  const matris = htmlSatirlariniOku(ham);
  if (matris) {
    const ayrintili = satirlardanHareketlerAyrintili(matris);
    if (ayrintili.hareketler.length) return ayrintili;
    // Tablo bulundu ama hareket çıkmadı (ör. kolonlar hücre yerine <pre> içinde);
    // düz metin denemesi daha iyi sonuç verebilir.
    const duz = metinSatirlarindanHareketler(htmlMetneCevir(ham));
    return duz.hareketler.length ? duz : ayrintili;
  }
  return metinSatirlarindanHareketler(htmlMetneCevir(ham));
}

/** Satırlara ayrılmış düz metin (PDF/OCR/CSV) -> hareketler. */
function metinSatirlarindanHareketler(metin) {
  const satirListesi = String(metin || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const atlananlar = [];
  const yoksayilanlar = [];
  if (!satirListesi.length) return { hareketler: [], atlananlar, yoksayilanlar };

  const ekle = (satir, neden, yoksay) => {
    const hedef = yoksay ? yoksayilanlar : atlananlar;
    if (hedef.length >= RAPOR_MAKS) return;
    hedef.push({ satir: String(satir).slice(0, 180), neden });
  };

  const noktaliVirgul = satirListesi.filter((s) => s.includes(";")).length;
  if (noktaliVirgul >= 3) {
    const matris = satirListesi.map((s) => s.split(";").map((x) => x.trim()));
    const ayrintili = satirlardanHareketlerAyrintili(matris);
    if (ayrintili.hareketler.length) return ayrintili;
  }

  const hareketler = [];
  const tuketilen = new Set(); // bir önceki satıra eklenen (tutar) satırlar

  for (let s = 0; s < satirListesi.length; s++) {
    if (tuketilen.has(s)) continue;

    // Tarih önce ayıklanır; yoksa "10.09" parçası tutar sanılır.
    const ilkParca = satirdanTarih(satirListesi[s]);
    const tarih = ilkParca.tarih;
    // NOT: Binlik ayracı boşluk olabilir ("30 000,00"); bu düzeltme token
    // üretimi sırasında yapılır (bkz. tokenlereAyir).
    let kalanMetin = ilkParca.kalan;
    let tokenler = tokenlereAyir(kalanMetin);

    // "Tarih | Fiş No | Açıklama | Tutar | Bakiye" düzeninde tarihten hemen
    // sonra gelen çıplak tamsayı fiş numarasıdır: tutar sayılmaz ve açıklamaya
    // karışmaz. Karıştığında hem tutar hem kişi/taşınmaz eşleşmesi bozulur.
    const fisIndeksi =
      tokenler.length > 1 &&
      /^\d{3,}$/.test(tokenler[0]) &&
      tokenler.slice(1).some((t) => !metinTutarHucresiMi(t))
        ? 0
        : -1;
    const haric = fisIndeksi >= 0 ? new Set([fisIndeksi]) : new Set();
    let secilen = metinTutarAdaylari(tokenler, haric);

    // Taranmış ekstrelerde uzun açıklama alta taşıp tutar/bakiye kendi
    // satırında kalabilir; tutarsız kalan satır atılmak yerine birleştirilir.
    if (!secilen.length && s + 1 < satirListesi.length) {
      const sonraki = satirListesi[s + 1];
      if (!tuketilen.has(s + 1) && !satirdanTarih(sonraki).tarih && tutarSatiriMi(sonraki)) {
        const birlesik = kalanMetin + " " + sonraki;
        const birlesikTokenler = tokenlereAyir(birlesik);
        const birlesikSecilen = metinTutarAdaylari(birlesikTokenler, haric);
        if (birlesikSecilen.length) {
          kalanMetin = birlesik;
          tokenler = birlesikTokenler;
          secilen = birlesikSecilen;
          tuketilen.add(s + 1);
        }
      }
    }
    if (!secilen.length) {
      // Tarih ya da rakam taşıyan satır bir hareket olmalıydı; sessizce
      // kaybolmasın diye raporlanır (başlık/toplam satırları ayrı sayılır).
      if (tarih || /\d/.test(satirListesi[s])) {
        const { neden, yoksay } = metinAtlanmaNedeni(satirListesi[s], tarih);
        ekle(satirListesi[s], neden, yoksay);
      }
      continue;
    }

    // Yalnızca tutar/bakiye olarak kabul edilen parçalar açıklamadan çıkarılır;
    // zayıf adaylar (adres içindeki "27" gibi) açıklamada kalır.
    const atilan = new Set(secilen.map((x) => x.i));
    if (fisIndeksi >= 0) atilan.add(fisIndeksi);
    const aciklama = tokenler
      .filter((_, i) => !atilan.has(i))
      .join(" ")
      .trim();
    if (!aciklama) {
      ekle(satirListesi[s], "Açıklama okunamadı", false);
      continue;
    }
    if (TOPLAM_RE.test(trSadelestir(aciklama).trim())) {
      ekle(satirListesi[s], "Toplam/bakiye satırı", true);
      continue;
    }
    // Tarihsiz + başlık/altlık gibi görünen satır (IBAN, "Sayfa Sonu Bakiye")
    // hareket değildir; tutarı ödeme sanılmasın.
    if (!tarih && GURULTU_RE.test(trSadelestir(aciklama))) {
      ekle(satirListesi[s], "Ekstre başlığı/altlığı", true);
      continue;
    }

    const birincil = secilen[0];
    const cikis =
      birincil.n < 0 ||
      /^[-+(]/.test(birincil.ham) ||
      /\b(borc|giden|cikan|havale giden|odeme talimati)\b/.test(trSadelestir(kalanMetin));

    hareketler.push({
      tarih,
      aciklama,
      tutar: Math.abs(birincil.n),
      tutarlar: secilen.map((x) => Math.abs(x.n)),
      yon: cikis ? "cikis" : "giris",
      satir: satirListesi[s]
    });
  }
  return { hareketler, atlananlar, yoksayilanlar };
}

/* --------------------------------------------------------- eşleştirme ---- */

const UNVAN_GURULTU = new Set([
  "ltd", "sti", "limited", "sirket", "sirketi", "as", "anonim", "holding",
  "san", "tic", "sanayi", "ticaret", "insaat", "yapi", "turizm", "gida",
  "tekstil", "petrol", "kuyumculuk", "konfeksiyon", "ve", "ile", "the"
]);

function sadelesmisAciklama(metin) {
  return " " + trSadelestir(metin).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim() + " ";
}

function adTokenleri(ad) {
  return trSadelestir(ad)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !UNVAN_GURULTU.has(t));
}

/** Açıklamada kiracının ayırt edici ad parçaları geçiyor mu? */
export function kisiEslesmesi(aciklama, ad) {
  const sade = sadelesmisAciklama(aciklama);
  const tokenler = [...new Set(adTokenleri(ad))];
  if (!tokenler.length) return { eslesti: false, eslesen: [] };
  const eslesen = tokenler.filter((t) => {
    if (new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(sade)) return true;
    // Taramalarda unvan kısaltılabilir; uzun parçalarda kök eşleşmesi de kabul.
    return t.length >= 6 && sade.includes(t.slice(0, t.length - 2));
  });
  return {
    eslesti: eslesen.length >= 2 || (eslesen.length === 1 && eslesen[0].length >= 5),
    eslesen
  };
}

/** Açıklamada taşınmaz numarası ("C Blok 27") geçiyor mu? */
export function birimEslesmesi(aciklama, tasinmazNo) {
  const tokenler = trSadelestir(tasinmazNo)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 1 && !["blok", "daire", "no", "kat"].includes(t));
  if (!tokenler.length) return { eslesti: false, eslesen: [] };
  const sade = sadelesmisAciklama(aciklama);
  const eslesen = tokenler.filter((t) => new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(sade));
  return { eslesti: eslesen.length === tokenler.length, eslesen };
}

function gunFarki(a, b) {
  const x = Date.parse(a);
  const y = Date.parse(b);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return Math.round((x - y) / 86400000);
}

/** Eşleştirilebilecek bekleyen kayıtları (taksit + senet) hazırlar. */
function hedefleriHazirla({ payments = [], notes = [], people = [], properties = [], contracts = [] }) {
  const hedefler = [];
  const kisi = (id) => people.find((p) => p.id === id) || null;
  const mulk = (id) => properties.find((p) => p.id === id) || null;
  const sozlesme = (id) => contracts.find((c) => c.id === id) || null;

  // Bir taksit senede bağlıysa tahsilat senedin kendisiyle takip edilir; aksi
  // hâlde aynı ay iki ayrı kayda düşer ve biri açık kalır.
  const senetliTaksitler = new Set(notes.map((n) => n && n.paymentId).filter(Boolean));

  for (const p of payments) {
    if (senetliTaksitler.has(p.id)) continue;
    const toplam = Number(p.amount) || 0;
    const odenen = Number(p.paidAmount) || 0;
    const kalan = toplam - odenen;
    if (toplam <= 0 || kalan <= 0.009) continue;
    const c = sozlesme(p.contractId);
    const t = c ? kisi(c.tenantId) : null;
    const m = c ? mulk(c.propertyId) : null;
    hedefler.push({
      tur: "odeme",
      id: p.id,
      tutar: kalan,
      vade: p.dueDate || "",
      kiraciId: t ? t.id : "",
      kiraciAdi: (t && t.name) || "",
      mulkId: m ? m.id : "",
      mulk: m ? m.tasinmazNo || m.ad || "" : "",
      etiket: `Kira taksidi · ${p.dueDate || "vade yok"}`
    });
  }

  for (const n of notes) {
    if (!n || n.status === "Ödendi (Senet)") continue;
    const t = kisi(n.tenantId) || people.find((p) => p.name === n.tenantName);
    const m = t && t.propertyId ? mulk(t.propertyId) : null;
    hedefler.push({
      tur: "senet",
      id: n.id,
      tutar: Number(n.amount) || 0,
      vade: n.dueDate || "",
      kiraciId: t ? t.id : "",
      kiraciAdi: (t && t.name) || n.tenantName || "",
      mulkId: m ? m.id : "",
      mulk: m ? m.tasinmazNo || "" : "",
      etiket: `Senet ${n.senetNo || ""} · ${n.dueDate || "vade yok"}`
    });
  }
  return hedefler.filter((h) => h.tutar > 0);
}

function tutarAdaylari(hareket) {
  const liste =
    Array.isArray(hareket.tutarlar) && hareket.tutarlar.length ? hareket.tutarlar : [hareket.tutar];
  return liste.map((t) => Math.abs(Number(t) || 0)).filter((t) => t > 0);
}

/**
 * Hareketleri bekleyen taksit/senetlerle karşılaştırır.
 * Önce yalnızca "kesin" eşleşmeler yerleştirilir, sonra kalanlar; böylece
 * onay bekleyen bir öneri, güvenilir bir eşleşmenin taksidini kapmaz.
 * Her taksit yalnızca bir harekete bağlanır.
 */
export function eslesmeleriBul(hareketler, kayitlar = {}) {
  const hedefler = hedefleriHazirla(kayitlar);
  const liste = (hareketler || []).map((hareket, sira) => ({ hareket, sira }));
  const sirali = [...liste].sort((a, b) => {
    const ta = Date.parse(a.hareket.tarih);
    const tb = Date.parse(b.hareket.tarih);
    const ga = Number.isNaN(ta) ? Infinity : ta;
    const gb = Number.isNaN(tb) ? Infinity : tb;
    return ga === gb ? a.sira - b.sira : ga - gb;
  });

  const adaylariBul = (hareket, kullanilan) => {
    const sonuc = [];
    if (!hareket || hareket.yon !== "giris") return sonuc;
    const adaylar = tutarAdaylari(hareket);
    if (!adaylar.length) return sonuc;
    const birincilTutar = Math.abs(Number(hareket.tutar) || 0);

    for (const hedef of hedefler) {
      if (kullanilan && kullanilan.has(hedef.id)) continue;
      let puan = 0;
      let birincil = false;
      let neden = "";
      for (const a of adaylar) {
        const fark = Math.abs(a - hedef.tutar);
        if (fark < 0.01) {
          puan = 3;
          birincil = Math.abs(a - birincilTutar) < 0.01;
          neden = `Tutar ${paraYaz(hedef.tutar)} ₺ ile birebir aynı`;
          break;
        }
        if (fark <= Math.max(1, hedef.tutar * 0.005) && puan < 1) {
          puan = 1;
          birincil = Math.abs(a - birincilTutar) < 0.01;
          neden = `Tutar ${paraYaz(hedef.tutar)} ₺ ile ${paraYaz(fark)} ₺ farkla yakın`;
        }
      }
      if (!puan) continue;

      const kisi = hedef.kiraciAdi
        ? kisiEslesmesi(hareket.aciklama, hedef.kiraciAdi)
        : { eslesti: false, eslesen: [] };
      const birim = hedef.mulk
        ? birimEslesmesi(hareket.aciklama, hedef.mulk)
        : { eslesti: false, eslesen: [] };
      const gun = hareket.tarih && hedef.vade ? gunFarki(hareket.tarih, hedef.vade) : null;
      // Vadeye yakınlık ağırlıklıdır: ödeme genellikle ait olduğu ayın taksidini
      // kapatır; eşitlik hâlinde en eski vade tercih edilir (FIFO).
      const yakinlik =
        gun === null ? 0 : Math.abs(gun) <= 7 ? 2 : Math.abs(gun) <= 45 ? 1 : 0;
      const skor = puan + (kisi.eslesti ? 2 : 0) + (birim.eslesti ? 2 : 0) + yakinlik;

      sonuc.push({
        hedef,
        puan,
        birincil,
        neden,
        kisi,
        birim,
        gun,
        skor,
        kesin: puan === 3 && birincil && (kisi.eslesti || birim.eslesti)
      });
    }

    sonuc.sort((a, b) => {
      if (b.skor !== a.skor) return b.skor - a.skor;
      const va = Date.parse(a.hedef.vade);
      const vb = Date.parse(b.hedef.vade);
      return (Number.isNaN(va) ? Infinity : va) - (Number.isNaN(vb) ? Infinity : vb);
    });
    return sonuc;
  };

  const atanmis = new Map();
  const kullanilan = new Set();

  // 1. tur: yalnızca kesin eşleşmeler taksit kapatır.
  for (const x of sirali) {
    const aday = adaylariBul(x.hareket, kullanilan).find((a) => a.kesin);
    if (aday) {
      atanmis.set(x.sira, aday);
      kullanilan.add(aday.hedef.id);
    }
  }
  // 2. tur: kalan hareketler, kalan taksitlerle eşleştirilir.
  for (const x of sirali) {
    if (atanmis.has(x.sira)) continue;
    const aday = adaylariBul(x.hareket, kullanilan)[0];
    if (aday) {
      atanmis.set(x.sira, aday);
      kullanilan.add(aday.hedef.id);
    }
  }

  return liste.map(({ hareket, sira }) => {
    if (hareket.yon !== "giris") {
      return {
        hareket,
        hedef: null,
        guven: "yok",
        skor: 0,
        nedenler: ["Bu hareket bir tahsilat değil (hesaptan çıkış)."]
      };
    }

    const aday = atanmis.get(sira);
    if (!aday) {
      const bekleyenVar = adaylariBul(hareket, null).length > 0;
      return {
        hareket,
        hedef: null,
        guven: "yok",
        skor: 0,
        nedenler: [
          bekleyenVar
            ? "Bu tutarla uyuşan taksitler başka hareketlerle kapatıldı."
            : "Bu tutarda bekleyen bir taksit veya senet bulunamadı."
        ]
      };
    }

    const nedenler = [aday.neden];
    if (aday.kisi.eslesti) {
      nedenler.push(`Açıklamada kiracı adı geçiyor (${aday.kisi.eslesen.join(", ")})`);
    } else if (aday.hedef.kiraciAdi) {
      nedenler.push(`Açıklamada kiracı adı bulunamadı (${aday.hedef.kiraciAdi}).`);
    }
    if (aday.birim.eslesti) {
      nedenler.push(`Açıklamada taşınmaz geçiyor (${aday.hedef.mulk}).`);
    }
    if (aday.gun !== null && Math.abs(aday.gun) <= 45) {
      nedenler.push(
        aday.gun === 0
          ? "Vade günü hareket günüyle aynı."
          : `Vadeye ${Math.abs(aday.gun)} gün mesafede (${aday.gun > 0 ? "sonra" : "önce"}).`
      );
    }
    if (!aday.birincil) {
      nedenler.push("Tutar, satırdaki ilk tutar değil (bakiye satırı olabilir).");
    }
    if (!aday.kesin) {
      nedenler.push("Onayınızla kapatılacak.");
    }

    return {
      hareket,
      hedef: aday.hedef,
      guven: aday.kesin ? "kesin" : "olasi",
      skor: aday.skor,
      nedenler
    };
  });
}
