/* Yeni Word şablonunun (Kira sözleşmesi yeni.docx) doldurulmuş hâli.
   Word -> PDF aktarımında metin katmanı böyle satırlara ayrılır: etiket ve
   değer ayrı satırlarda gelir. Bu yüzden burada ayrı test edilir.          */
export const yeniSablonMetni = `KİRA SÖZLEŞMESİ
Dairesi
1. KAT - D BLOK- DAİRE 14 - 141
Mahallesi
PENDİK / YENİŞEHİR MAH.
Cadde/Sokağı
REYHAN CAD.
Dış Kapı No.
43
Kiralananın Cinsi
DAİRE MESKEN
Kiraya Veren
HASYEK YAPI İNŞAAT TİCARET A.Ş.
Kiralayanın Vergi No
2090612076
Kiralayanın Adresi
Yenişehir Mah.Reyhan Cad. No:43 Sima Garden Sitesi A/1 Pendik/İstanbul
Kiracı
SELİM KAYA
Kiracının T.C. Kimlik No.
12345678901
Telefon No.
05321112233
Kiracının Adresi
Halitpaşa Mah. Değirmendere Cad. No:26 Mudanya / Bursa
Akdin Başlangıç Tarihi
15/10/2026
Akdin Süresi
1 (BİR YILDIR)
Yıllık Kira Bedeli
420000 TL
Aylık Kira Bedeli
35.000 TL
Kira Bedelinin Ödeme Şekli
HER AYIN 15’inde
Kiralananı Kullanım Şekli
KONUT
Kiralananın Durumu
Boş, Sıfır Daire ve Temiz
Kiralananla Birlikte Teslim Edilen Demirbaşlar
Daire sıfır olup daha önce kullanılmamıştır. Daire boyalı, temiz, 3’lü arçelik ankastre seti
GENEL KOŞULLAR
Kiracı, kiralananı özenle kullanmak zorundadır.
özel koŞULLAR
Kira bedelleri, her ayın 15.günü akşamına kadar Kiraya veren TR84 0001 0020 7897 0734 1350 02 nolu ibanına ödenecektir.
Kiracı, kiralayana 70000 TL depozito vermiştir.`;

export const yeniSablonBeklenen = {
  blokDaire: "D Blok 14",
  daireNo: "14",
  mahalle: "PENDİK / YENİŞEHİR MAH.",
  sokak: "REYHAN CAD.",
  disKapiNo: "43",
  cins: "DAİRE MESKEN",
  malikAdi: "HASYEK YAPI İNŞAAT TİCARET A.Ş.",
  malikVergiNo: "2090612076",
  malikAdres: "Yenişehir Mah.Reyhan Cad. No:43 Sima Garden Sitesi A/1 Pendik/İstanbul",
  kiraciAdi: "SELİM KAYA",
  kiraciTc: "12345678901",
  kiraciTel: "05321112233",
  kiraciAdres: "Halitpaşa Mah. Değirmendere Cad. No:26 Mudanya / Bursa",
  kiraBaslangic: "2026-10-15",
  akdinSuresi: "1 (BİR YILDIR)",
  yillikKira: "420000",
  aylikKira: "35000",
  odemeSekli: "HER AYIN 15’inde",
  odemeGunu: "15",
  kullanimSekli: "KONUT",
  durum: "Boş, Sıfır Daire ve Temiz",
  iban: "TR840001002078970734135002",
  depozitoTutar: "70000"
};
