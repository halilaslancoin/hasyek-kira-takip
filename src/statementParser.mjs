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
  const negatif = parantezli || /^\s*-/.test(s) || /\s-\s*$/.test(s);
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
  { alan: "bakiye", re: /(bakiye|balance|kalan)/ }
];

const TOPLAM_RE = /^(genel\s+)?(toplam|ara toplam|bakiye|devir|acilis|kapanis|onceki bakiye|son bakiye)/;

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

function metinHucresi(satir) {
  let enIyi = "";
  for (const h of satir) {
    const s = String(h || "").trim();
    if (s.length > enIyi.length && /[a-zçğıöşü]/i.test(s) && !/\d{4,}/.test(s)) enIyi = s;
  }
  return enIyi;
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
  let yon = "giris";
  const alacak = tutarCoz(hucre(harita.alacak));
  const borc = tutarCoz(hucre(harita.borc));
  if (alacak !== null || borc !== null) {
    if (alacak !== null && alacak !== 0) {
      tutar = Math.abs(alacak);
      yon = "giris";
    } else if (borc !== null && borc !== 0) {
      tutar = Math.abs(borc);
      yon = "cikis";
    }
  } else {
    const tekTutar = hucre(harita.tutar) || satir.find((h) => /^\s*[-+(]?\s*\d[\d.,]*\s*\)?\s*(tl|try|₺)?\s*$/i.test(String(h || "")));
    const n = tutarCoz(tekTutar);
    if (n !== null) {
      tutar = Math.abs(n);
      yon = n < 0 || /^\s*\(/.test(String(tekTutar)) ? "cikis" : "giris";
    }
  }

  return { tarih, aciklama, tutar, yon, satir };
}

/** Tablo satırlarını (xlsx matrisi, CSV) hesap hareketlerine çevirir. */
export function satirlardanHareketler(satirlar) {
  if (!Array.isArray(satirlar) || !satirlar.length) return [];

  let baslikIndeksi = -1;
  let enIyiPuan = 0;
  for (let i = 0; i < Math.min(satirlar.length, 25); i++) {
    const puan = baslikSatiriMi(satirlar[i] || []);
    if (puan > enIyiPuan) {
      enIyiPuan = puan;
      baslikIndeksi = i;
    }
  }
  const harita = enIyiPuan >= 2 ? baslikHaritasi(satirlar[baslikIndeksi]) : {};
  const baslangic = enIyiPuan >= 2 ? baslikIndeksi + 1 : 0;

  const hareketler = [];
  for (let i = baslangic; i < satirlar.length; i++) {
    const satir = satirlar[i] || [];
    if (!satir.some((h) => String(h === undefined || h === null ? "" : h).trim())) continue;
    const h = satiriYorumla(satir, harita);
    if (h.tutar === null || h.tutar === 0) continue;
    if (!h.aciklama && !h.tarih) continue;
    if (TOPLAM_RE.test(trSadelestir(h.aciklama).trim())) continue;
    hareketler.push(h);
  }
  return hareketler;
}

/* -------------------------------------------------------------- metin ---- */

const PARA_RE = /[-+(]?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s*\)?\s*(?:tl|try|₺)?/gi;
const TARIH_RE = /\d{4}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{1,2}|\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{2,4}/;

// Binlik/ondalık ayracı ya da para birimi taşıyan tutarlar güvenilirdir;
// çıplak tamsayılar (ör. adres içindeki "27") yalnızca başka aday yoksa kabul.
const gucluTutar = (p) => /[.,]\d/.test(p) || /(tl|try|₺)/i.test(p);

/** PDF/OCR metnini ya da noktalı virgülle ayrılmış CSV'yi hareketlere çevirir. */
export function metindenHareketler(metin) {
  const satirListesi = String(metin || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!satirListesi.length) return [];

  const noktaliVirgul = satirListesi.filter((s) => s.includes(";")).length;
  if (noktaliVirgul >= 3) {
    const matris = satirListesi.map((s) => s.split(";").map((x) => x.trim()));
    const hareketler = satirlardanHareketler(matris);
    if (hareketler.length) return hareketler;
  }

  const hareketler = [];
  for (const satir of satirListesi) {
    // Tarih önce ayıklanır; yoksa "10.09" parçası tutar sanılır.
    const tarihEsles = satir.match(TARIH_RE);
    const kalanMetin = tarihEsles ? satir.replace(tarihEsles[0], " ") : satir;
    const tarih = tarihEsles ? tarihCoz(tarihEsles[0]) : "";

    const paraEslesmeleri = kalanMetin.match(PARA_RE) || [];
    const adaylar = paraEslesmeleri
      .map((p) => ({ p, n: tutarCoz(p) }))
      .filter((x) => x.n !== null && Math.abs(x.n) > 0);
    if (!adaylar.length) continue;

    const gucluler = adaylar.filter((x) => gucluTutar(x.p));
    const kullanilan = gucluler.length ? gucluler : adaylar;

    // Yalnızca tutar olarak kabul edilen parçalar açıklamadan çıkarılır;
    // zayıf adaylar (adres içindeki "27" gibi) açıklamada kalır.
    let aciklama = kalanMetin;
    for (const x of kullanilan) {
      const idx = aciklama.indexOf(x.p);
      if (idx >= 0) aciklama = aciklama.slice(0, idx) + " " + aciklama.slice(idx + x.p.length);
    }
    aciklama = aciklama.replace(/\s{2,}/g, " ").trim();
    if (!aciklama) continue;
    if (TOPLAM_RE.test(trSadelestir(aciklama).trim())) continue;

    const cikis =
      /^\s*[-+(]/.test(kullanilan[0].p) ||
      /\b(borc|giden|cikan|havale giden|odeme talimati)\b/.test(trSadelestir(kalanMetin));

    hareketler.push({
      tarih,
      aciklama,
      tutar: Math.abs(kullanilan[0].n),
      tutarlar: kullanilan.map((x) => Math.abs(x.n)),
      yon: cikis ? "cikis" : "giris",
      satir
    });
  }
  return hareketler;
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
