/* Kira sözleşmesi ayrıştırıcı testi.
   Çalıştır: node src/contractParser.test.mjs                                  */

import {
  sozlesmeAlanlariniCikar,
  bulunanEtiketler,
  trSadelestir,
  sozlesmeIbanAl
} from "./contractParser.mjs";
import { yeniSablonMetni, yeniSablonBeklenen } from "./fixtures/yeniSablon.mjs";

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
   1) GERÇEK BELGE: taranmış sözleşmenin Tesseract OCR çıktısı
   (C blok 27.pdf sayfa 1 + özel koşullar satırları)
   ========================================================================= */
const gercekOcr = `KİRA SÖZLEŞMESİ
DAİRESİ. 4. KAT - C BLOK- DAİRE 27 - 141 ARKA o |
| Mahallesi | PENDİK / YENİŞEHİR MAH. |
EE |
| Cadde/Sokağı REYHAN CAD. |
DIS KAPINo. 43 H E |
| Kiralananın Cinsi | DAIRE MESKEN _ |
| Kiraya Veren HAS YEK YAPI İNŞAAT TİCARET A.Ş. |
Kiralayanın Tel. No. 05324688303 |
| Kiralayanın Adresi SİMA GARDEN SİTESİ |
Kiracı — FAZIL GÜNEŞ YAPI İNŞAAT SANAYİ VE TİCARET LTD.ŞTİ.
|
| Tel. No 05331625316 - 05353891056 - 05445822829
Kiracının T.C. Kimlik No 3851492170 |
| Kiracının Adresi HALİTPAŞA MAH. DEĞİRMENDERE CAD. GÜNEŞ KENT SİTESİ |
A BLOK No.26/2AA İÇ KAPI No.11 MUDANYA / BURSA |
Akdin Başlangıç Tarihi 10/09/2026 |
|
Akdin Süresi 1 (BİR YILDIR) |
Yıllık Kira Bedeli 360000 TL( UÇYÜZALTMIŞBİN TURK LİRASİ )
Aylık Kira Bedeli 30.000 TL( OTUZBIN TÜRKLİRASİ )
Kira Bedelinin Ödeme Şekli | HER AY NAKİT |
| Kiralanani Kullanım Şekli KONUT |
| Kiralananın Durumu Boş Daire ve Temiz |
Kiralananla Birlikte Teslim | Daire sıfır ve daha önce kullanılmamıştır. |
Edilen Demirbaşlar temiz ve tüm demirbaşlar ve OCAK,FIRIN, DAVLUMBAZ |
Kiracı: Müteselsil Borçlu ve Kefil: Kiralayan
GENEL KOŞULLAR
1. Kiracı, kiralananı özenle kullanmak zorundadır
ÖZEL KOŞULLAR
3. Kira bedelleri,her ayın 10-13.Günü akşamına kadar Kiraya verenTR84 0001 0020
7897 0734 1350 02.. Ziraat Bankası... nolu ibanına ödenecektir.
6. Kiracı, kiralayana #300004 (OTUZBİN TL)depozito vermiştir.`;

const g = sozlesmeAlanlariniCikar(gercekOcr);
esit("blok/daire", g.blokDaire, "C Blok 27");
esit("daire no", g.daireNo, "27");
esit("mahalle", g.mahalle, "PENDİK / YENİŞEHİR MAH.");
esit("sokak", g.sokak, "REYHAN CAD.");
esit("dış kapı no", g.disKapiNo, "43");
esit("kiralananın cinsi", g.cins, "DAIRE MESKEN");
esit("malik adı", g.malikAdi, "HAS YEK YAPI İNŞAAT TİCARET A.Ş.");
esit("malik tel (kiracınınkiyle karışmamalı)", g.malikTel, "05324688303");
esit("malik adresi", g.malikAdres, "SİMA GARDEN SİTESİ");
esit("kiracı adı", g.kiraciAdi, "FAZIL GÜNEŞ YAPI İNŞAAT SANAYİ VE TİCARET LTD.ŞTİ.");
esit("kiracı tel", g.kiraciTel, "05331625316 - 05353891056 - 05445822829");
esit("kiracı T.C.", g.kiraciTc, "3851492170");
esit(
  "kiracı adresi (alt satıra taşan kısım dahil)",
  g.kiraciAdres,
  "HALİTPAŞA MAH. DEĞİRMENDERE CAD. GÜNEŞ KENT SİTESİ A BLOK No.26/2AA İÇ KAPI No.11 MUDANYA / BURSA"
);
esit("akdin başlangıcı", g.kiraBaslangic, "2026-09-10");
esit("akdin süresi", g.akdinSuresi, "1 (BİR YILDIR)");
esit("yıllık kira", g.yillikKira, "360000");
esit("aylık kira", g.aylikKira, "30000");
esit("kira bedeli (uyumlu anahtar)", g.kiraBedeli, "30000");
esit("ödeme şekli", g.odemeSekli, "HER AY NAKİT");
esit("kullanım şekli", g.kullanimSekli, "KONUT");
esit("kiralananın durumu", g.durum, "Boş Daire ve Temiz");
esit("iban (özel koşullardan)", g.iban, "TR840001002078970734135002");
esit("ödeme günü", g.odemeGunu, "10-13");
esit("depozito tutarı bulundu", g.depozitoTutar !== "", true);
esit(
  "kiracı adı 'Müteselsil Borçlu ve Kefil' satırını almamalı",
  g.kiraciAdi.includes("Müteselsil"),
  false
);
esit("demirbaşlar bulundu", g.demirbaslar.includes("DAVLUMBAZ"), true);

/* =========================================================================
   2) GENEL ŞABLON: kullanıcının verdiği boş şablonun doldurulmuş hâli
   ========================================================================= */
const genelSablon = `KİRA SÖZLEŞMESİ
İli/İlçesi                                  İstanbul / Pendik
Ada/Parsel No.                              1204 / 56
Daire Numarası (Bağımsız Bölüm)             27
Mahallesi                                   Yenişehir
Sokağı                                      Reyhan Caddesi
Dış Kapı Numarası                           43
Kiralanan Şeyin Cinsi                       Mesken / Daire
Kiracının Adı Soyadı/ T.C. Kimlik No.       MEHMET DEMİR 12345678901
Kiracının Adresi                            Pendik Yenişehir Mah. Reyhan Cad. No:43 D:27
Kiraya Verenin Adı Soyadı/T.C. Kimlik No.   HAS YEK YAPI İNŞAAT TİCARET A.Ş.
Kiraya Verenin İkâmetgahı                   Pendik / İstanbul
Garantör ve Müşterek Müteselsil Kefilin
Adı Soyadı/T.C. Kimlik No./Adresi           ALİ VELİ 98765432109 Kadıköy / İstanbul
Bir Senelik Kira Karşılığı                  300.000 TL
Bir Aylık Kira Karşılığı                    25.000 TL
Kira Müddeti                                1 Yıl
Kiranın Ne Zaman Ödeneceği                  Her ayın 5. günü
Kiranın Ödeneceği Banka Adı ve IBAN
numarası                                    Ziraat Bankası TR33 0006 1005 1978 6457 8413 26
Kiranın Başlangıcı                          01/09/2026
Kiralananda Bulunan Demirbaşlar             Anahtar, ankastre set
Kiralananın Hangi Amaçla Kullanılacağı      Mesken
GENEL KOŞULLAR
1- Kiracı, kiralananı özenle kullanmak zorundadır.
ÖZEL KOŞULLAR
6- Kiracı depozito olarak 2 aylık kira bedelini kiraya verene vermiştir.`;

const s = sozlesmeAlanlariniCikar(genelSablon);
esit("şablon il/ilçe", s.ilIlce, "İstanbul / Pendik");
esit("şablon ada/parsel", s.adaParsel, "1204 / 56");
esit("şablon daire no", s.daireNo, "27");
esit("şablon mahalle", s.mahalle, "Yenişehir");
esit("şablon sokak", s.sokak, "Reyhan Caddesi");
esit("şablon dış kapı", s.disKapiNo, "43");
esit("şablon cins", s.cins, "Mesken / Daire");
esit("şablon kiracı adı", s.kiraciAdi, "MEHMET DEMİR");
esit("şablon kiracı T.C.", s.kiraciTc, "12345678901");
esit("şablon kiracı adresi", s.kiraciAdres, "Pendik Yenişehir Mah. Reyhan Cad. No:43 D:27");
esit("şablon malik adı", s.malikAdi, "HAS YEK YAPI İNŞAAT TİCARET A.Ş.");
esit("şablon malik adres", s.malikAdres, "Pendik / İstanbul");
esit("şablon kefil", s.kefil.includes("ALİ VELİ"), true);
esit("şablon yıllık kira", s.yillikKira, "300000");
esit("şablon aylık kira", s.aylikKira, "25000");
esit("şablon kira müddeti", s.akdinSuresi, "1 Yıl");
esit("şablon ödeme zamanı", s.odemeSekli, "Her ayın 5. günü");
esit("şablon iban", s.iban, "TR330006100519786457841326");
esit("şablon başlangıç", s.kiraBaslangic, "2026-09-01");
esit("şablon demirbaşlar", s.demirbaslar, "Anahtar, ankastre set");
esit("şablon kullanım amacı", s.kullanimSekli, "Mesken");
esit("şablon depozito (aylık)", s.depozitoAylik, "2");

/* =========================================================================
   2b) YENİ WORD ŞABLONU (metin katmanlı PDF)8
   ========================================================================= */
const y = sozlesmeAlanlariniCikar(yeniSablonMetni);
for (const [k, beklenen] of Object.entries(yeniSablonBeklenen)) {
  esit(`yeni şablon: ${k}`, y[k], beklenen);
}

/* =========================================================================
   3) Gerçek şablon başlıklarının TAMAMI tanınmalı
   ========================================================================= */
const beklenenEtiketler = [
  "daire", "adaParsel", "mahalle", "sokak", "disKapiNo", "cins",
  "kiraciAdi", "kiraciTc", "kiraciAdres", "malikAdi", "malikAdres", "kefil",
  "yillikKira", "aylikKira", "akdinSuresi", "odemeSekli", "iban",
  "akdinBaslangic", "demirbaslar", "kullanimSekli"
];
const bulunan = bulunanEtiketler(genelSablon);
for (const k of beklenenEtiketler) {
  esit(`şablon başlığı tanındı: ${k}`, bulunan.includes(k), true);
}

/* =========================================================================
   4) Biçim dönüşümleri ve güvenlik
   ========================================================================= */
esit(
  "kuruşlu kira",
  sozlesmeAlanlariniCikar("Aylık Kira Bedeli 25.000,50 TL\nGENEL KOŞULLAR").aylikKira,
  "25001"
);
esit(
  "iki haneli yıl",
  sozlesmeAlanlariniCikar("Akdin Başlangıç Tarihi 01.09.26\nGENEL KOŞULLAR").kiraBaslangic,
  "2026-09-01"
);
const ilgisiz = sozlesmeAlanlariniCikar(
  "Bu bir fatura örneğidir. Toplam tutar 1.234 TL. Son ödeme 01/01/2027."
);
esit("alakasız belgede kiracı bulunmaz", ilgisiz.kiraciAdi, "");
esit("alakasız belgede kira bulunmaz", ilgisiz.aylikKira, "");
esit("boş metin güvenli", JSON.stringify(sozlesmeAlanlariniCikar("")), "{}");
esit(
  "trSadelestir uzunluğu korur (dizin hizası kritik)",
  trSadelestir("İSTANBUL'da ĞÜŞİÖÇ ııı").length,
  "İSTANBUL'da ĞÜŞİÖÇ ııı".length
);

/* =========================================================================
   4b) Düşük kaliteli tarama: satırlar birleşmiş, BLOK "DRLOK" okunmuş.
   Taşınmaz numarası dosya adından kurtarılmalı.
   ========================================================================= */
const bozukSatirlar = `KİRA SÖZLEŞMESİ
DAİRESİ 2 KAT DRLOK DAIRE 14-211 PENDIK/ YENISEHIR MAH.
Kiralananın Cinsi DAİRE MESKEN HAS YEK YAPI İNŞAAT TİCARET A.Ş.
Kiracı İBRAHİM SAFA KAYAR
GENEL KOŞULLAR`;
const dBlok = sozlesmeAlanlariniCikar(bozukSatirlar, { dosyaAdi: "D blok 14.pdf" });
esit("bozuk tarama: blok/daire dosya adından", dBlok.blokDaire, "D Blok 14");
esit("bozuk tarama: daire no dosya adından", dBlok.daireNo, "14");
esit(
  "bozuk tarama: kiracı adı çöp satırlardan arındırıldı",
  dBlok.kiraciAdi,
  "İBRAHİM SAFA KAYAR"
);
// A blok 2 tarzı: ad okunur, ardından tamamen okunamaz satırlar gelir.
esit(
  "ad, ardındaki okunamaz satırları almaz",
  sozlesmeAlanlariniCikar(
    "KİRA SÖZLEŞMESİ\n| Kiracı ADAM KHODR |\n(zmn TE RR Ne  hszsamesı e\nran Saşaro EL\nGENEL KOŞULLAR",
    { dosyaAdi: "A blok 2 .pdf" }
  ).kiraciAdi,
  "ADAM KHODR"
);
// Dosya adında blok yoksa metindeki sayı korunur.
const adsiz = sozlesmeAlanlariniCikar(bozukSatirlar, { dosyaAdi: "2026-09-08 12-42.pdf" });
esit("dosya adında blok yoksa metin kullanılır", adsiz.blokDaire, "D Blok 14");
// Metin iyi okunmuşsa dosya adı onu ezmemeli.
esit(
  "iyi okunan metin dosya adından üstün",
  sozlesmeAlanlariniCikar(gercekOcr, { dosyaAdi: "yanlis blok 99.pdf" }).blokDaire,
  "C Blok 27"
);

/* =========================================================================
   4c) C blok 56 tarzı: OCR, kiracı adının ikinci satırını "Tel. No."
   satırına birleştirmiş. Ad, telefondan geri kazanılmalı.
   ========================================================================= */
const cBlok56 = `KİRA SÖZLEŞMESİ
Kiracı İS-KA AYAKKABI KUYUMCULUK KONFEKSİYON GİDA |
Tel. No. PETROL SANAYİ TIC. LTD.ŞTİ |
05558980023 - 05071832306 |
NAİLBEY BOSNA HERSEK BUL. NO.22 MERKEZ/ ELAZIĞ
ALTI AYLIK Kira Bedeli 210000 TL( İKİYÜZONBİN TÜRK LİRASİ ) |
Aylık Kira Bedeli 35.000 TL( OTUZBEŞ BIN TÜRKLİRASİ ) |
GENEL KOŞULLAR`;
const c56 = sozlesmeAlanlariniCikar(cBlok56, { dosyaAdi: "C blok 56 .pdf" });
esit(
  "birleşen ad satırı telefondan kurtarıldı",
  c56.kiraciAdi,
  "İS-KA AYAKKABI KUYUMCULUK KONFEKSİYON GİDA PETROL SANAYİ TIC. LTD.ŞTİ"
);
esit("telefon yalnızca numaraları içerir", c56.kiraciTel, "05558980023 - 05071832306");
esit("sonraki satırlar telefona karışmaz", c56.kiraciTel.includes("NAİLBEY"), false);
// "ALTI AYLIK Kira Bedeli 210000" altı aylık tutardır; aylık kira 35.000'dir.
esit("altı aylık tutar aylık kira sanılmaz", c56.aylikKira, "35000");

/* =========================================================================
   5) IBAN yalnızca gerçek aday bulunca döner
   ========================================================================= */
// Metin içinde rastgele "TR" geçmesi IBAN sanılmamalı.
esit(
  "cümle içindeki TR harfleri IBAN sanılmaz",
  sozlesmeAlanlariniCikar(
    "Kiracı depozitoyu kiraya ve tadilat tamirat masraflara mahsup edemez TRATIBOZMAYAVEKIRADANBIRMIKTARKE"
  ).iban,
  ""
);
// Rakamlar harfe dönüşmüş olsa bile IBAN kurtarılmalı (O->0, I->1).
esit(
  "OCR rakam karışması düzeltilir",
  sozlesmeAlanlariniCikar(
    "Kiraya verenTR84 OOO1 0020 7897 0734 135O 02 nolu ibanına ödenecektir."
  ).iban,
  "TR840001002078970734135002"
);
esit(
  "ayırıcısız IBAN",
  sozlesmeAlanlariniCikar("iban TR120006100519786457841399").iban,
  "TR120006100519786457841399"
);

/* --- Sonuç ---------------------------------------------------------------- */
if (hatalar.length) {
  console.log(`\n❌ ${hatalar.length} test başarısız (${gecen} geçti):\n`);
  for (const h of hatalar) console.log("  - " + h);
  process.exit(1);
}
console.log(`✅ Tüm testler geçti (${gecen} kontrol).`);
