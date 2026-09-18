/* -------------------------------------------------------------------------
   KİRA SÖZLEŞMESİ METİN AYRIŞTIRICI (saf fonksiyonlar)
   -------------------------------------------------------------------------
   DOM'a, PDF'e veya OCR motoruna bağlı değildir: eline düz metin (ister PDF
   metin katmanından, ister Tesseract OCR'dan gelsin) alır ve sözleşme
   alanlarını çıkarır. Bu sayede ayrıştırma ayrı test edilebilir
   (bkz. contractParser.test.mjs).

   Belgeler taranmış bir formdur: her satır "Etiket  Değer" biçimindedir.
   Bu yüzden ayrıştırma SIRALI İLERİ TARAMA ile yapılır:
     * Etiketler belgede göründükleri sırayla tanımlıdır (ALAN_SIRASI).
     * Her etiket, bir öncekinin bittiği yerden itibaren aranır; böylece
       iki kez geçen etiketler (ör. "Tel. No") birbirine karışmaz.
     * Bir alanın değeri, etiketin bittiği yerden bir sonraki bulunan
       etikete kadar olan metindir; böylece alt satıra taşan adres gibi
       değerler de eksiksiz alınır.
------------------------------------------------------------------------- */

// Türkçe harfleri 1:1 ASCII'ye indirger. Uzunluk korunduğu için
// sadeleştirilmiş metinde bulunan konum orijinal metinde de geçerlidir.
export const trSadelestir = (s) =>
  String(s || "")
    .replace(/[İIıi]/g, "i")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Şş]/g, "s")
    .replace(/[Çç]/g, "c")
    .replace(/[Öö]/g, "o")
    .replace(/[Üü]/g, "u")
    .replace(/[Ââ]/g, "a")
    .replace(/[Îî]/g, "i")
    .replace(/[Ûû]/g, "u")
    .toLowerCase();

// Alanlar, belgede göründükleri sırayla. Her alan için birden fazla etiket
// yazılabilir: taranmış asıl sözleşme formu ve daha genel şablon birlikte
// desteklenir, en erken eşleşen kazanır. Kalıplar trSadelestir'den geçmiş
// (küçük harf, Türkçe harfsiz) metne uygulanır.
const ALAN_SIRASI = [
  // --- Taşınmaz bilgileri ---
  { key: "daire", etiketler: [/daire\s*numaras/, /daire\s*no/, /dairesi/] },
  { key: "ilIlce", etiketler: [/ili\s*\/\s*ilcesi/] },
  { key: "adaParsel", etiketler: [/ada\s*\/?\s*parsel\s*no/] },
  { key: "mahalle", etiketler: [/mahallesi/] },
  { key: "sokak", etiketler: [/cadde\s*\/\s*sokagi/, /sokagi/, /cadde/] },
  { key: "disKapiNo", etiketler: [/dis\s*kapi/] },
  { key: "cins", etiketler: [/kiralanan[in]{0,4}\s*cinsi/, /kiralanan\s*se[yi][il]?n\s*cinsi/] },

  // --- Kiraya veren (malik) ---
  {
    key: "malikAdi",
    etiketler: [
      /kiraya\s*verenin\s*ad[il]\s*soyad[il]\s*\/?\s*t\.?c\.?\s*kimlik\s*no/,
      /kiraya\s*verenin\s*ad[il]/,
      /kiraya\s*veren/
    ]
  },
  {
    key: "malikTel",
    etiketler: [
      /kiralayan[in]{0,4}\s*telefon\s*no/,
      /kiralayan[in]{0,4}\s*tel\.?\s*no/,
      /tel\.?\s*no/
    ]
  },
  // Yeni Word şablonunda bulunur; form alanı değil ama kaydı tutulur.
  { key: "malikVergiNo", etiketler: [/kiralayan[in]{0,4}\s*vergi\s*no/] },
  {
    key: "malikAdres",
    etiketler: [
      /kiralayan[in]{0,4}\s*adresi/,
      /kiraya\s*verenin\s*ik[a]?metgah[il]/,
      /kiraya\s*verenin\s*adres/
    ]
  },

  // --- Kiracı ---
  // Yalın "Kiracı" etiketi; "Kiracının ..." ile eşleşmemesi için sözcük sınırı var.
  { key: "kiraciAdi", etiketler: [/kiracinin\s*ad[il]\s*soyad[il]\s*\/?\s*t\.?c\.?\s*kimlik\s*no/, /kirac[il]\b/] },
  {
    key: "kiraciTel",
    etiketler: [
      /kirac[il]n[in]{0,3}\s*telefon\s*no/,
      /kirac[il]n[in]{0,3}\s*tel\.?\s*no/,
      /telefon\s*no/,
      /tel\.?\s*no/
    ]
  },
  { key: "kiraciTc", etiketler: [/kiracinin\s*t\.?c\.?\s*kimlik\s*no/, /kimlik\s*no/] },
  { key: "kiraciAdres", etiketler: [/kiracinin\s*adresi/, /kirac[il]\s*adres/] },

  // --- Akit ve bedel ---
  { key: "akdinBaslangic", etiketler: [/akdin\s*baslang[il]c/, /kiranin\s*baslang[il]c/] },
  { key: "akdinSuresi", etiketler: [/akdin\s*suresi/, /kira\s*muddeti/] },
  // "… AYLIK Kira Bedeli" bir çarpan olabilir (ör. "ALTI AYLIK Kira Bedeli
  // 210.000"): altı aylık tutar aylık kira sanılmamalı.
  { key: "yillikKira", etiketler: [/(?<!\d{1,2}\s)(?<!iki\s)(?<!uc\s)(?<!alti\s)yillik\s*kira/, /bir\s*senelik\s*kira/] },
  {
    key: "aylikKira",
    etiketler: [
      /(?<!\d{1,2}\s)(?<!alti\s)(?<!iki\s)(?<!uc\s)(?<!dort\s)(?<!bes\s)(?<!yedi\s)(?<!sekiz\s)(?<!dokuz\s)(?<!on\s)aylik\s*kira/,
      /bir\s*aylik\s*kira/
    ]
  },
  {
    key: "odemeSekli",
    etiketler: [
      /\w{0,12}\s*bedelinin\s*odeme\s*sekl[il]?/,
      /kiranin\s*ne\s*zaman\s*odenecegi/,
      /odeme\s*sekl[il]?/
    ]
  },
  // IBAN satırı değeri doğrudan vermez ama sonraki alanların sınırını belirler.
  {
    key: "iban",
    etiketler: [
      /kiranin\s*odenecegi\s*banka\s*ad[il]\s*ve\s*iban\s*numaras[il]?/,
      /nolu\s*iban/,
      /iban\s*numaras/
    ]
  },
  {
    key: "kullanimSekli",
    etiketler: [
      /kiralanan[il]?\s*kullanim\s*sekl[il]?/,
      /kullanim\s*sekl[il]?/,
      /kiralananin\s*hangi\s*amacla\s*kullanilacag[il]?/
    ]
  },
  { key: "durum", etiketler: [/kiralananin\s*durumu/] },
  {
    key: "demirbaslar",
    etiketler: [
      /kiralananla\s*birlikte\s*tels[il]m[\s\S]{0,120}?demirbaslar/,
      /kiralananla\s*birlikte\s*teslim/,
      /kiralananda\s*bulunan\s*demirbaslar/
    ]
  },

  // --- Kefil (yalnızca genel şablonda bulunur, en sonda) ---
  { key: "kefil", etiketler: [/garantor\s*ve\s*musterek\s*muteselsil\s*kefilin[\s\S]{0,80}?adresi/] }
];

// Form bölümü, genel koşullar başlığından önce biter; alıntılanan başlıkların
// (ör. "Kiracı ...") koşul metinlerinde tekrar geçmesi sorun olmasın.
const FORM_SONU_ETIKETI = /genel\s*kosullar/;

// Alan değerlerinden anlamlı olanlar; hiçbiri bulunamazsa belge okunamadı sayılır.
export const OCR_BULUNAN_ANAHTARLAR = [
  "kiraciAdi",
  "kiraciTc",
  "aylikKira",
  "kiraBaslangic",
  "mahalle",
  "yillikKira",
  "daire",
  "blokDaire"
];

// Tablo hücresi değerini temizler. Taramalarda satır arasına düşen çok kısa
// artık parçaları (ör. "EE |") atar, kenarlık ve ayırıcı işaretleri kaldırır.
const degerKirp = (metin, bas, son, { tekSatir = false } = {}) => {
  const hamSatirlar = String(metin || "").slice(bas, son).split("\n");
  // Baştaki boş satırları at; ilk anlamlı satır her zaman değerin başlangıcıdır.
  const ilk = hamSatirlar.findIndex((sa) => sa.trim() !== "");
  let satirlar = ilk > 0 ? hamSatirlar.slice(ilk) : hamSatirlar;
  if (tekSatir) {
    satirlar = satirlar.length ? [satirlar[0]] : [];
  } else if (satirlar.length > 1) {
    satirlar = [
      satirlar[0],
      ...satirlar.slice(1).filter((sa) => {
        const kirp = sa.trim();
        if (!kirp) return false;
        // "|" ile başlayan satır yeni bir tablo satırıdır: bu alana ait değil.
        if (kirp.startsWith("|")) return false;
        // Rakam içermeyen çok kısa artık parçaları (ör. "EE |", "No.") at;
        // sayı içeren kısa satırlar gerçek değerdir (ör. "43").
        if (/\d/.test(kirp)) return true;
        return kirp.replace(/[^\p{L}\p{N}]/gu, "").length > 4;
      })
    ];
  }
  // Tablo hücre kenarlıkları metnin içinde kalabilir; anlam taşımazlar.
  let ham = satirlar.join(" ").replace(/\|/g, " ").replace(/\s+/g, " ").trim();
  ham = ham.replace(/^[\s:.;,\-–—/|_]+/, "").trim();
  ham = ham.replace(/[\s|_]+$/, "").trim();
  // Tablo kenarlığından arta kalan tek harflik parçaları at: "DAIRE MESKEN _ I"
  ham = ham.replace(/[\s|_]+[A-ZİĞŞÇÖÜ]$/, "").trim();
  return ham.slice(0, 200);
};

// "15.000" -> 15000, "15.000,50" -> 15000, "15000 TL" -> 15000
export const sozlesmeSayisiniAl = (s) => {
  const m = String(s || "").match(/\d[\d.,\s]*\d|\d/);
  if (!m) return "";
  let t = m[0].replace(/\s/g, "");
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    t = t.replace(/\.(?=\d{3}(\D|$))/g, "");
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : "";
};

// "01/09/2025", "1.9.2025", "01-09-25" -> "2025-09-01"
export const sozlesmeTarihiniAl = (s) => {
  const m = String(s || "").match(/(\d{1,2})\s*[./\-]\s*(\d{1,2})\s*[./\-]\s*(\d{2,4})/);
  if (!m) return "";
  let yil = m[3];
  if (yil.length === 2) yil = "20" + yil;
  const ay = Number(m[2]);
  const gun = Number(m[1]);
  if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return "";
  return `${yil}-${String(ay).padStart(2, "0")}-${String(gun).padStart(2, "0")}`;
};

// T.C. kimlik 11 hane; taramalarda bir hane kaybolabildiği için 10 hane de kabul.
export const sozlesmeTcAl = (s) => (String(s || "").match(/\b\d{10,11}\b/) || [""])[0];

// Türk IBAN'ı TR + 24 hanedir. Taramalarda rakamlar harfe dönüşebildiği için
// metindeki tüm TR+24 adayları bulunur, en çok rakam içeren seçilir; böylece
// cümle içinde rastgele geçen "TR" harfleri IBAN sanılmaz.
const OCR_RAKAM_DUZELTME = {
  O: "0",
  Q: "0",
  D: "0",
  I: "1",
  L: "1",
  S: "5",
  B: "8",
  Z: "2",
  G: "6"
};

export const sozlesmeIbanAl = (s) => {
  const duz = String(s || "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
  const adaylar = duz.match(/TR[0-9A-Z]{24}/g) || [];
  if (!adaylar.length) return "";
  const rakamSayisi = (a) => (a.match(/\d/g) || []).length;
  const enIyi = adaylar.reduce(
    (x, y) => (rakamSayisi(y) > rakamSayisi(x) ? y : x),
    adaylar[0]
  );
  if (rakamSayisi(enIyi) < 20) return "";
  return (
    "TR" + enIyi.slice(2).replace(/[OQDILSBZG]/g, (c) => OCR_RAKAM_DUZELTME[c] || c)
  );
};

// Ad/unvan değerinden rakamları ve tablo işaretlerini ayıklar.
export const sozlesmeAdAl = (s) =>
  String(s || "")
    .replace(/\b\d+\b/g, " ")
    .replace(/[^\p{L}\s.'&-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

// Verilen aralıkta [bas, son) en erken eşleşmeyi arar.
const alanBul = (sade, etiketler, bas, son) => {
  let enIyi = null;
  for (const kaynak of etiketler) {
    const re = new RegExp(kaynak.source, "g");
    re.lastIndex = bas;
    const m = re.exec(sade);
    if (!m) continue;
    if (m.index >= son) continue;
    if (!enIyi || m.index < enIyi.bas) {
      enIyi = { bas: m.index, son: m.index + m[0].length };
    }
  }
  return enIyi;
};

// Kiracı satırının konumu ("çapa"): iki kez geçen "Tel. No" satırlarını
// malik ve kiracı olarak ayırmak için kullanılır.
const KIRACI_CAPA = [/kiracinin\s*ad[il]\s*soyad[il]/, /kirac[il]\b/];

// Ad/unvan alanları formda tek satırdır. Kötü taramalarda değerin ardından
// okunamayan başka tablo satırları gelebildiği için bu alanlarda yalnızca
// ilk satır alınır (ör. "Kiracı ADAM KHODR" + çöp satırlar).
const TEK_SATIR_ALANLARI = new Set(["kiraciAdi", "malikAdi"]);

// Formdaki başlıkları arar ve bulunanları belge sırasına göre döndürür.
const bulunanAlanlariBul = (sade) => {
  const formSonu = sade.search(FORM_SONU_ETIKETI);
  const bolge = formSonu > 0 ? formSonu : sade.length;

  const kiraciCapa = alanBul(sade, KIRACI_CAPA, 0, bolge);
  const capaBas = kiraciCapa ? kiraciCapa.bas : 0;

  const bulunanlar = [];
  for (const { key, etiketler } of ALAN_SIRASI) {
    let yer;
    if (key === "malikTel") yer = alanBul(sade, etiketler, 0, capaBas);
    else if (key === "kiraciTel") {
      yer = alanBul(sade, etiketler, kiraciCapa ? kiraciCapa.son : 0, bolge);
    } else yer = alanBul(sade, etiketler, 0, bolge);
    if (yer) bulunanlar.push({ key, bas: yer.bas, son: yer.son });
  }
  bulunanlar.sort((a, b) => a.bas - b.bas);
  return { bulunanlar, bolge };
};

/**
 * Metinde tanınan sözleşme başlıklarının anahtarlarını döndürür.
 * Belgenin şablonla uyuşup uyuşmadığını anlamak için kullanılır.
 * @param {string} metin
 * @returns {string[]}
 */
export const bulunanEtiketler = (metin) => {
  if (!metin || !String(metin).trim()) return [];
  return bulunanAlanlariBul(trSadelestir(metin)).bulunanlar.map((a) => a.key);
};

// "C BLOK- DAİRE 27" -> { blokDaire: "C Blok 27", daireNo: "27" }
// Taşınmaz numarası olarak blok+daire kullanılır; yoksa ilk sayı alınır.
const blokDaireCoz = (s) => {
  // "BLOK" taramada "DRLOK" gibi okunabildiği için tek harf toleranslı.
  const m = String(s || "").match(/([a-z])\s*[bdr]?\s*lok[^\d]{0,24}?(\d{1,4})/i);
  if (m) return { blokDaire: `${m[1].toUpperCase()} Blok ${m[2]}`, daireNo: m[2] };
  const d =
    String(s || "").match(/daire\s*[^\d]{0,8}(\d{1,4})/i) || String(s || "").match(/\d{1,4}/);
  return { blokDaire: "", daireNo: d ? d[1] || d[0] : "" };
};

// Telefon satırı rakamla başlar. Harfle başlıyorsa, o kelimeler üstteki
// ad/unvan hücresinin alt satıra taşan devamıdır (taramalarda OCR hücreleri
// birleştirebiliyor: "Tel. No. PETROL SANAYİ TIC. LTD.ŞTİ / 0555...").
const telefonAyir = (deger) => {
  const t = String(deger || "").trim();
  const ilkRakam = t.search(/\d/);
  if (ilkRakam <= 0) return { ad: "", tel: t };
  const kalan = t.slice(ilkRakam).trim();
  const tel = (kalan.match(/^[+\d][\d\s()/\-]*/) || [kalan])[0].trim();
  return { ad: t.slice(0, ilkRakam).trim(), tel };
};

// Dosya adı çoğu zaman taşınmazı verir: "D blok 14.pdf" -> D Blok 14.
const dosyaAdindanBlok = (dosyaAdi) =>
  String(dosyaAdi || "")
    .replace(/\.(pdf|jpe?g|png)$/i, "")
    .match(/([a-z])\s*blok\s*[^\d]{0,4}(\d{1,4})/i);

/**
 * Sözleşme metninden alanları çıkarır.
 * @param {string} metin PDF metin katmanı ya da OCR çıktısı
 * @param {{ dosyaAdi?: string }} [secenekler] metinde bulunamayan taşınmaz
 *   bilgisini dosya adından tamamlamak için kullanılır (ör. "D blok 14.pdf").
 * @returns {object} alan adı -> değer (bulunamayanlar boş string)
 */
export const sozlesmeAlanlariniCikar = (metin, secenekler = {}) => {
  if (!metin || !String(metin).trim()) return {};
  const sade = trSadelestir(metin);
  const { bulunanlar, bolge } = bulunanAlanlariBul(sade);

  const ham = {};
  bulunanlar.forEach((alan, i) => {
    // Değer, bu başlığın bittiği yerden sonraki başlığın başladığı yere kadar.
    // İç içe geçen başlıklar (ör. "Kiracının Adı Soyadı/ T.C. Kimlik No." ile
    // "Kimlik No") atlanır; yoksa aradaki değer kaybolur.
    let bitis = bolge;
    for (let j = i + 1; j < bulunanlar.length; j++) {
      if (bulunanlar[j].bas >= alan.son) {
        bitis = bulunanlar[j].bas;
        break;
      }
    }
    ham[alan.key] = degerKirp(metin, alan.son, bitis, {
      tekSatir: TEK_SATIR_ALANLARI.has(alan.key)
    });
  });

  // IBAN ve depozito form tablosunda değil, özel koşullar metnindedir;
  // bu yüzden tüm belge içinde aranır.
  const depozitoAylik = (sade.match(/depozito\s*olarak\s*(\d+)\s*ayl[i]?k/) || [])[1] || "";
  const depozitoTutarHam =
    (sade.match(/(\d[\d.,]{3,})\s*[^\n]{0,40}?depozito/) || [])[1] || "";
  // "her ayın 10-13. günü" veya "HER AYIN 15'inde" biçimlerini kabul et.
  const odemeGunuMetni =
    sade.match(/her\s*ay[i]?n\s*(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s*\.?\s*gun/) ||
    sade.match(/her\s*ay[i]?n\s*(\d{1,2})/);
  const odemeGunu = odemeGunuMetni
    ? odemeGunuMetni[2]
      ? `${odemeGunuMetni[1]}-${odemeGunuMetni[2]}`
      : odemeGunuMetni[1]
    : "";

  const daireHam = ham.daire || "";
  const daireCozum = blokDaireCoz(daireHam);
  // Metinden gerçek bir "X Blok N" çıkmadıysa dosya adına güven.
  const dosyaBlok = dosyaAdindanBlok(secenekler.dosyaAdi);
  const malikTel = telefonAyir(ham.malikTel);
  const kiraciTel = telefonAyir(ham.kiraciTel);

  const sonuc = {
    // Taşınmaz
    daire: daireHam,
    daireNo: daireCozum.blokDaire ? daireCozum.daireNo : dosyaBlok ? dosyaBlok[2] : daireCozum.daireNo,
    blokDaire:
      daireCozum.blokDaire ||
      (dosyaBlok ? `${dosyaBlok[1].toUpperCase()} Blok ${dosyaBlok[2]}` : ""),
    mahalle: ham.mahalle || "",
    ilIlce: ham.ilIlce || ham.mahalle || "",
    adaParsel: ham.adaParsel || "",
    sokak: ham.sokak || "",
    disKapiNo: (ham.disKapiNo || "").replace(/\D/g, "") || ham.disKapiNo || "",
    cins: ham.cins || "",
    // Kiraya veren
    malikAdi: sozlesmeAdAl([ham.malikAdi, malikTel.ad].filter(Boolean).join(" ")),
    malikTel: malikTel.tel,
    malikVergiNo: (ham.malikVergiNo || "").replace(/\D/g, ""),
    malikAdres: ham.malikAdres || "",
    // Kiracı
    kiraciAdi: sozlesmeAdAl([ham.kiraciAdi, kiraciTel.ad].filter(Boolean).join(" ")),
    kiraciTel: kiraciTel.tel,
    kiraciTc: sozlesmeTcAl(ham.kiraciTc),
    kiraciAdres: ham.kiraciAdres || "",
    // Akit ve bedel
    kiraBaslangic: sozlesmeTarihiniAl(ham.akdinBaslangic),
    akdinSuresi: ham.akdinSuresi || "",
    aylikKira: sozlesmeSayisiniAl(ham.aylikKira),
    yillikKira: sozlesmeSayisiniAl(ham.yillikKira),
    odemeSekli: ham.odemeSekli || "",
    odemeGunu,
    kullanimSekli: ham.kullanimSekli || "",
    durum: ham.durum || "",
    demirbaslar: ham.demirbaslar || "",
    kefil: ham.kefil || "",
    // Tüm belgeden
    iban: sozlesmeIbanAl(metin) || sozlesmeIbanAl(ham.iban),
    depozitoAylik,
    depozitoTutar: sozlesmeSayisiniAl(depozitoTutarHam)
  };
  // Formdaki "Aylık Kira Bedeli" alanı için geriye dönük uyumlu anahtar.
  sonuc.kiraBedeli = sonuc.aylikKira || sonuc.yillikKira;
  return sonuc;
};
