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
    metindenHareketlerAyrintili,
    satirlardanHareketler,
    satirlardanHareketlerAyrintili,
    htmlMi,
    htmlSatirlariniOku,
    htmlMetneCevir,
    htmlVarliklariniCoz,
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
    3.5) "TARİH | FİŞ NO | AÇIKLAMA | TUTAR | BAKİYE" DÜZENİ
    Tek tutar kolonu olan ekstrelerde birincil tutar "Tutar", ikincil aday
    "Bakiye" olmalıdır. Fiş No kolonu tutar sanılmamalı ve açıklamaya
    karışmamalıdır (karışırsa hem tutar hem kiracı adı eşleşmesi bozulur).
    ========================================================================= */
  const fisNoMatrisi = [
    ["Tarih", "Fiş No", "Açıklama", "Tutar", "Bakiye"],
    ["2026-09-10", "12345", "IBRAHIM SAFA KAYAR KIRA D BLOK 14", "30.000,00", "44.000,00"],
    ["2026-09-15", "12346", "HAS YEK YAPI INSAAT ORTAK GIDER", "-2.500,50", "41.499,50"],
    ["2026-10-12", "12347", "IBRAHIM SAFA KAYAR KIRA D BLOK 14", "44.000,00", "85.499,50"]
  ];
  const fisHareketleri = satirlardanHareketler(fisNoMatrisi);
  esit("fiş no: hareket sayısı", fisHareketleri.length, 3);
  esit("fiş no: 1. tutar (Tutar kolonu)", fisHareketleri[0].tutar, 30000);
  esit("fiş no: 1. ikincil aday bakiye", fisHareketleri[0].tutarlar[1], 44000);
  esit("fiş no: 1. açıklama", fisHareketleri[0].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");
  esit("fiş no: 1. yön", fisHareketleri[0].yon, "giris");
  esit("fiş no: 2. tutar (eksi tutar)", fisHareketleri[1].tutar, 2500.5);
  esit("fiş no: 2. yön", fisHareketleri[1].yon, "cikis");
  esit("fiş no: 3. tutar", fisHareketleri[2].tutar, 44000);

  /* Kuruşsuz dışa aktarım: binlik ayracı yoksa da kolonlar karışmaz. */
  const fisKurussuzHareketleri = satirlardanHareketler([
    ["Tarih", "Fiş No", "Açıklama", "Tutar", "Bakiye"],
    ["2026-09-10", "12345", "IBRAHIM SAFA KAYAR KIRA D BLOK 14", "30000", "44000"],
    ["2026-09-15", "12346", "HAS YEK YAPI INSAAT ORTAK GIDER", "-2500", "41500"]
  ]);
  esit("fiş no kuruşsuz: 1. tutar", fisKurussuzHareketleri[0].tutar, 30000);
  esit("fiş no kuruşsuz: 1. ikincil aday", fisKurussuzHareketleri[0].tutarlar[1], 44000);
  esit("fiş no kuruşsuz: 2. yön", fisKurussuzHareketleri[1].yon, "cikis");

  /* Başlık satırı hiç tanınmasa bile Fiş No tutar sanılmamalıdır. */
  const fisBasliksizHareketleri = satirlardanHareketler([
    ["Hesap Hareketleri"],
    ["2026-09-10", "12345", "IBRAHIM SAFA KAYAR KIRA D BLOK 14", "30.000,00", "44.000,00"],
    ["2026-10-12", "12347", "IBRAHIM SAFA KAYAR KIRA D BLOK 14", "44.000,00", "85.499,50"]
  ]);
  esit("fiş no başlıksız: hareket sayısı", fisBasliksizHareketleri.length, 2);
  esit("fiş no başlıksız: tutar Fiş No değil", fisBasliksizHareketleri[0].tutar, 30000);
  esit("fiş no başlıksız: ikincil aday", fisBasliksizHareketleri[0].tutarlar[1], 44000);

  /* Taranmış (OCR) metni: fiş no açıklamaya karışmaz. */
  const ocrFisMetni = `Hesap Hareketleri
  Tarih Fiş No Açıklama Tutar Bakiye
  10.09.2026 12345 IBRAHIM SAFA KAYAR KIRA D BLOK 14 30.000,00 44.000,00
  15.09.2026 12346 HAS YEK YAPI INSAAT ORTAK GIDER -2.500,50 41.499,50
  12.10.2026 12347 IBRAHIM SAFA KAYAR KIRA D BLOK 14 44.000,00 85.499,50`;
  const ocrFis = metindenHareketler(ocrFisMetni);
  esit("ocr fiş no: hareket sayısı", ocrFis.length, 3);
  esit("ocr fiş no: 1. tutar", ocrFis[0].tutar, 30000);
  esit("ocr fiş no: 1. ikincil aday bakiye", ocrFis[0].tutarlar[1], 44000);
  esit("ocr fiş no: 1. açıklama", ocrFis[0].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");
  esit("ocr fiş no: 2. yön", ocrFis[1].yon, "cikis");
  esit("ocr fiş no: 2. tutar", ocrFis[1].tutar, 2500.5);
  esit("ocr fiş no: 3. tutar", ocrFis[2].tutar, 44000);

  /* OCR kuruş ayracını düşürdüğünde fiş no parçaları tutar sanılmamalıdır. */
  const ocrKurussuz = metindenHareketler(`10.09.2026 12345 IBRAHIM SAFA KAYAR KIRA D BLOK 14 30000 44000
  12.10.2026 12347 IBRAHIM SAFA KAYAR KIRA D BLOK 14 44000 85500`);
  esit("ocr kuruşsuz: 1. tutar", ocrKurussuz[0].tutar, 30000);
  esit("ocr kuruşsuz: 1. ikincil aday", ocrKurussuz[0].tutarlar[1], 44000);
  esit("ocr kuruşsuz: 1. açıklama", ocrKurussuz[0].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");
  esit("ocr kuruşsuz: 2. tutar", ocrKurussuz[1].tutar, 44000);

  /* Sonda eksi ("30.000,00-") ve OCR'ın ayırdığı işaret ("- 2.500,50") çıkıştır. */
  esit("sonda eksi tutar çözümü", tutarCoz("30.000,00-"), -30000);
  const sondaEksi = metindenHareketler("15.09.2026 HAS YEK YAPI ORTAK GIDER 2.500,50- 41.499,50");
  esit("sonda eksi: tutar", sondaEksi[0].tutar, 2500.5);
  esit("sonda eksi: yön", sondaEksi[0].yon, "cikis");
  const ayrikIsaret = metindenHareketler("15.09.2026 HAS YEK YAPI ORTAK GIDER - 2.500,50 41.499,50");
  esit("ayrık eksi: tutar", ayrikIsaret[0].tutar, 2500.5);
  esit("ayrık eksi: yön", ayrikIsaret[0].yon, "cikis");

  /* =========================================================================
    3.6) GERÇEK EXCEL DOSYASI: "Tarih | Fiş No | Açıklama | Tutar | Bakiye"
    Fixture: src/fixtures/fis-no-ekstre.xlsx (paylaşılan metin, tarih ve para
    biçimleri içerir). Fiş No kolonu sayısal hücredir; tutar sanılmamalıdır.
    Yeniden üretmek için aynı başlıklı bir Excel dosyasını .xlsx olarak
    kaydedip src/fixtures/ altına koyun.
    ========================================================================= */
  const fisBuf = readFileSync(join(kok, "fixtures", "fis-no-ekstre.xlsx"));
  const fisAb = fisBuf.buffer.slice(fisBuf.byteOffset, fisBuf.byteOffset + fisBuf.byteLength);
  const fisMatris = await xlsxSatirlariniOku(fisAb);

  esit("fiş no xlsx: başlık", fisMatris[0].join("|"), "Tarih|Fiş No|Açıklama|Tutar|Bakiye");
  esit("fiş no xlsx: fiş no hücresi", fisMatris[1][1], "12345");
  esit("fiş no xlsx: tarih hücresi", fisMatris[1][0], "2026-09-10");
  esit("fiş no xlsx: tutar hücresi", fisMatris[1][3], "30000");
  esit("fiş no xlsx: bakiye hücresi", fisMatris[1][4], "44000");

  const fisDosyaHareketleri = satirlardanHareketler(fisMatris);
  esit("fiş no xlsx: hareket sayısı (Devir/TOPLAM atlandı)", fisDosyaHareketleri.length, 4);
  esit("fiş no xlsx: 1. tutar", fisDosyaHareketleri[0].tutar, 30000);
  esit("fiş no xlsx: 1. ikincil aday bakiye", fisDosyaHareketleri[0].tutarlar[1], 44000);
  esit("fiş no xlsx: 1. açıklama", fisDosyaHareketleri[0].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");
  esit("fiş no xlsx: 2. tutar", fisDosyaHareketleri[1].tutar, 44000);
  esit("fiş no xlsx: 3. tutar (eksi)", fisDosyaHareketleri[2].tutar, 2500.5);
  esit("fiş no xlsx: 3. yön", fisDosyaHareketleri[2].yon, "cikis");
  esit(
    "fiş no xlsx: 4. açıklama",
    fisDosyaHareketleri[3].aciklama,
    "FAZIL GUNES YAPI INSAAT LTD.STI. KIRA C BLOK 27"
  );

  /* =========================================================================
    3.7) TARANMIŞ (OCR) EKSTRE GÜRÜLTÜSÜ
    OCR ekstre başlığını/altlığını da metne katar. Bunlar hareket SAYILMAMALI
    (yoksa "Sayfa Sonu Bakiye 44.000,00" bir tahsilat sanılıp borç kapatılır);
    uzun açıklama yüzünden alta sarkan tutar ise KAYBEDİLMEMELİDİR.
    ========================================================================= */
  const taranmisEkstre = metindenHareketler(`HAS YEK YAPI INSAAT
  Hesap No: 12345678-5001  IBAN: TR12 0001 0002 0003 0004 0005 01
  Sayfa 1/2   Ekstre Tarihi: 18.09.2026
  10.09.2026   12345   IBRAHIM SAFA KAYAR KIRA ODEMESI D BLOK 14     30.000,00    44.000,00
  Son Bakiye 44.000,00
  Sayfa Sonu Bakiye 44.000,00`);
  esit("taranmış: başlık/altlık hareket sayılmaz", taranmisEkstre.length, 1);
  esit("taranmış: tutar", taranmisEkstre[0].tutar, 30000);
  esit("taranmış: tarih", taranmisEkstre[0].tarih, "2026-09-10");
  esit("taranmış: açıklama", taranmisEkstre[0].aciklama, "IBRAHIM SAFA KAYAR KIRA ODEMESI D BLOK 14");

  /* Alta sarkan tutar: bir önceki satırla birleşmeli, satır kaybolmamalı. */
  const sarkanTutar = metindenHareketler(`10.09.2026 12345 IBRAHIM SAFA KAYAR KIRA ODEMESI D BLOK 14 DAIRESI
  30.000,00 44.000,00
  12.10.2026 12347 IBRAHIM SAFA KAYAR KIRA ODEMESI D BLOK 14 DAIRESI 44.000,00 85.499,50`);
  esit("sarkan tutar: hareket sayısı", sarkanTutar.length, 2);
  esit("sarkan tutar: 1. tutar", sarkanTutar[0].tutar, 30000);
  esit("sarkan tutar: 1. bakiye adayı", sarkanTutar[0].tutarlar[1], 44000);
  esit("sarkan tutar: 1. açıklama", sarkanTutar[0].aciklama, "IBRAHIM SAFA KAYAR KIRA ODEMESI D BLOK 14 DAIRESI");
  esit("sarkan tutar: 2. tutar", sarkanTutar[1].tutar, 44000);
  esit("sarkan tutar: 2. açıklama", sarkanTutar[1].aciklama, "IBRAHIM SAFA KAYAR KIRA ODEMESI D BLOK 14 DAIRESI");

  /* Binlik ayracı boşluk olan tarama: "30 000,00". */
  const boslukluBinlik = metindenHareketler(
    "10.09.2026 12345 IBRAHIM SAFA KAYAR KIRA D BLOK 14 30 000,00 44 000,00\n" +
      "12.10.2026 12347 IBRAHIM SAFA KAYAR KIRA D BLOK 14 44 000,00 85 499,50"
  );
  esit("boşluklu binlik: hareket sayısı", boslukluBinlik.length, 2);
  esit("boşluklu binlik: 1. tutar", boslukluBinlik[0].tutar, 30000);
  esit("boşluklu binlik: 1. bakiye adayı", boslukluBinlik[0].tutarlar[1], 44000);
  esit("boşluklu binlik: 1. açıklama", boslukluBinlik[0].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");
  esit("boşluklu binlik: 2. tutar", boslukluBinlik[1].tutar, 44000);

  /* Kolonlar arası boşluk binlik ayracı sanılmamalı: "30.000,00 130.000,00"
    iki ayrı kolondur, birleştirilirse tutar 30.000.00130000 olurdu. */
  const ikiKolon = metindenHareketler(
    "10.09.2026 FAZIL GUNES YAPI INSAAT LTD.STI. KIRA ODEMESI C BLOK 27 30.000,00 130.000,00"
  );
  esit("kolonlar birleşmez: tutar", ikiKolon[0].tutar, 30000);
  esit("kolonlar birleşmez: bakiye adayı", ikiKolon[0].tutarlar[1], 130000);
  esit("kolonlar birleşmez: açıklama", ikiKolon[0].aciklama.slice(-9), "C BLOK 27");

  /* Ay adlı tarih ("10 Eylül 2026") de okunmalı ve açıklamaya karışmamalı. */
  const ayAdliTarih = metindenHareketler(
    "10 Eylül 2026\t12345\tIBRAHIM SAFA KAYAR KIRA D BLOK 14\t30.000,00\t44.000,00"
  );
  esit("ay adlı tarih: tarih", ayAdliTarih[0].tarih, "2026-09-10");
  esit("ay adlı tarih: tutar", ayAdliTarih[0].tutar, 30000);
  esit("ay adlı tarih: açıklama", ayAdliTarih[0].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");

  /* Tarih olmayan "10 DAIRESI 2026" metni korunur (ay adı sanılmaz). */
  const ayAdiDegil = metindenHareketler(
    "10.09.2026 IBRAHIM SAFSA KAYAR KIRA DAIRESI 2026 30000 44000"
  );
  esit("ay adı sanılan metin korunur", ayAdiDegil[0].aciklama.includes("DAIRESI 2026"), "true");
  esit("ay adı sanılan metin: tutar", ayAdiDegil[0].tutar, 30000);

  /* Tablo (xlsx/CSV) yolunda da tarihsiz altlık satırı hareket sayılmaz. */
  const tabloAltlik = satirlardanHareketler([
    ["Tarih", "Açıklama", "Tutar", "Bakiye"],
    ["2026-09-10", "IBRAHIM SAFA KAYAR KIRA D BLOK 14", "30.000,00", "44.000,00"],
    ["", "Sayfa Sonu Bakiye", "44.000,00", "44.000,00"],
    ["", "Hesap No 12345678", "44.000,00", "44.000,00"]
  ]);
  esit("tablo altlığı hareket sayılmaz", tabloAltlik.length, 1);
  esit("tablo altlığı: kalan hareket tutarı", tabloAltlik[0].tutar, 30000);

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

  /* Tutar kolonu bekleyen bir taksidi tutmuyorsa bakiye adayı borcu OTOMATİK
    kapatmamalı, yalnızca öneri olarak kalmalıdır (bkz. yukarıdaki bakiye tuzağı).
    Burada aday bakiye, tek tutar kolonlu ekstreden okunur. */
  const bakiyeAdayliHareket = satirlardanHareketler([
    ["Tarih", "Fiş No", "Açıklama", "Tutar", "Bakiye"],
    ["2026-09-25", "12350", "IBRAHIM SAFA KAYAR KIRA D BLOK 14", "12.345,00", "44.000,00"]
  ]);
  esit("bakiye adayı: hareket sayısı", bakiyeAdayliHareket.length, 1);
  const bakiyeAdayiSonuc = eslesmeleriBul(bakiyeAdayliHareket, kayitlar)[0];
  esit("bakiye adayı: otomatik kapatmaz", bakiyeAdayiSonuc.guven, "olasi");
  esit("bakiye adayı: doğru taksit", bakiyeAdayiSonuc.hedef.id, "y2");
  esit("bakiye adayı: uyarı notu", bakiyeAdayiSonuc.nedenler.join(" ").includes("ilk tutar değil"), "true");

  /* Fiş No kolonu tutar sanılsaydı hiçbir eşleşme kurulamazdı: bu kontroller
    düzeltmenin eşleştirmeye yansıdığını doğrular. */
  const fisNoEslesme = eslesmeleriBul(fisHareketleri, kayitlar);
  /* 3. satır: tutar 44.000 (taksit tutarıyla birebir) + açıklamada kiracı adı ve
    taşınmaz -> kesin kapanır. */
  esit("fiş no: 3. hareket kesin kapanır", fisNoEslesme[2].guven, "kesin");
  esit("fiş no: 3. hedef taksit", fisNoEslesme[2].hedef.id, "y2");
  /* 2. satır çıkış (ortak gider) hareketidir: hiçbir borcu kapatmaz. */
  esit("fiş no: 2. hareket çıkış", fisNoEslesme[1].hedef, "null");
  esit("fiş no: 2. hareket güveni", fisNoEslesme[1].guven, "yok");
  /* 1. satırın tutarı (30.000) açıklamadaki kiracının taksidi değildir; yalnızca
    bakiye adayı uyuştuğu için onaya bırakılır, otomatik kapatılmaz. */
  esit("fiş no: 1. hareket otomatik kapatılmaz", fisNoEslesme[0].guven, "olasi");
  esit("fiş no: 1. hareket onay bekler", fisNoEslesme[0].nedenler.join(" ").includes("Onayınızla kapatılacak"), "true");

  /* Aynı doğrulama, gerçek .xlsx dosyasından okunan ekstre için: dosya uçtan uca
    doğru taksitleri kapatmalı, fiş numarası hiçbir borcu kapatmamalıdır. */
  const fisDosyaEslesme = eslesmeleriBul(fisDosyaHareketleri, kayitlar);
  esit("fiş no xlsx: 1. hareket onaya düşer", fisDosyaEslesme[0].guven, "olasi");
  esit("fiş no xlsx: 2. hareket kesin kapanır", fisDosyaEslesme[1].guven, "kesin");
  esit("fiş no xlsx: 2. hedef taksit", fisDosyaEslesme[1].hedef.id, "y2");
  esit("fiş no xlsx: 3. hareket çıkış", fisDosyaEslesme[2].hedef, "null");
  esit("fiş no xlsx: 4. hedef taksit (FAZIL)", fisDosyaEslesme[3].hedef.id, "y1");
  esit("fiş no xlsx: 4. hareket kesin kapanır", fisDosyaEslesme[3].guven, "kesin");

  /* =========================================================================
    6) OKUNAMAYAN / YOK SAYILAN SATIR RAPORU
    =========================================================================
    Ayrıştırıcı yalnızca hareketleri değil, çözülemeyen satırları da bildirir.
    Sessizce kaybolan bir satır, gerçekte ödenmiş bir taksidi ödenmemiş gibi
    gösterebilir; bu yüzden ayrıntılı API arayüzde gösterilir. */

  /* --- Tablo (xlsx / CSV) yolu */
  const tabloRapor = satirlardanHareketlerAyrintili([
    ["Tarih", "Fiş No", "Açıklama", "Tutar", "Bakiye"],
    ["2026-09-10", "12345", "IBRAHIM SAFA KAYAR KIRA D BLOK 14", "30.000,00", "44.000,00"],
    ["2026-09-11", "12346", "TUTARI OKUNAMADI", "", "44.000,00"],
    ["", "", "TOPLAM", "30.000,00", "44.000,00"]
  ]);
  esit("rapor tablo: hareket sayısı", tabloRapor.hareketler.length, 1);
  esit("rapor tablo: atlanan sayısı", tabloRapor.atlananlar.length, 1);
  esit("rapor tablo: atlanan neden", tabloRapor.atlananlar[0].neden, "Tutar okunamadı");
  esit(
    "rapor tablo: atlanan satır özeti",
    tabloRapor.atlananlar[0].satir.includes("TUTARI OKUNAMADI"),
    "true"
  );
  esit("rapor tablo: yok sayılan sayısı", tabloRapor.yoksayilanlar.length, 1);
  esit("rapor tablo: yok sayılan neden", tabloRapor.yoksayilanlar[0].neden, "Toplam/bakiye satırı");
  esit(
    "rapor tablo: sağlam ekstrede atlanan yok",
    satirlardanHareketlerAyrintili([
      ["Tarih", "Açıklama", "Tutar"],
      ["2026-09-10", "IBRAHIM SAFA KAYAR KIRA D BLOK 14", "30.000,00"]
    ]).atlananlar.length,
    0
  );

  /* Ekstre altlığı (tarihsiz "Sayfa Sonu Bakiye") harekete dönüşmemeli ve
    raporda "yok sayılan" olarak görünmelidir. */
  const altlikRapor = satirlardanHareketlerAyrintili([
    ["Tarih", "Açıklama", "Tutar", "Bakiye"],
    ["2026-09-10", "IBRAHIM SAFA KAYAR KIRA D BLOK 14", "30.000,00", "44.000,00"],
    ["", "Sayfa Sonu Bakiye", "44.000,00", "44.000,00"]
  ]);
  esit("rapor: altlık harekete dönüşmez", altlikRapor.hareketler.length, 1);
  esit("rapor: altlık yok sayılır", altlikRapor.yoksayilanlar.length, 1);
  esit("rapor: altlık nedeni", altlikRapor.yoksayilanlar[0].neden, "Ekstre başlığı/altlığı");

  /* --- Metin / OCR yolu */
  const metinRapor = metindenHareketlerAyrintili(`10.09.2026 IBRAHIM SAFA KAYAR KIRA D BLOK 14 30.000,00 44.000,00
  11.09.2026 TUTARI OKUNAMADI
  Hesap No: 12345678
  TOPLAM 30.000,00`);
  esit("rapor metin: hareket sayısı", metinRapor.hareketler.length, 1);
  esit("rapor metin: atlanan sayısı", metinRapor.atlananlar.length, 1);
  esit("rapor metin: atlanan neden", metinRapor.atlananlar[0].neden, "Tutar okunamadı");
  esit("rapor metin: atlanan satır", metinRapor.atlananlar[0].satir, "11.09.2026 TUTARI OKUNAMADI");
  esit("rapor metin: yok sayılan sayısı", metinRapor.yoksayilanlar.length, 2);
  esit(
    "rapor metin: yok sayılan nedenleri",
    metinRapor.yoksayilanlar.map((x) => x.neden).join(" + "),
    "Ekstre başlığı/altlığı + Toplam/bakiye satırı"
  );

  /* Ayrıntılı ve sade API aynı hareketleri üretmeli (rapor yolu sözleşmeyi
    değiştirmemeli). */
  esit(
    "ayrıntılı API sade API ile aynı hareketleri verir",
    metindenHareketlerAyrintili(pdfMetni).hareketler.length,
    metindenHareketler(pdfMetni).length
  );

  /* =========================================================================
    7) HTML BANKA EKSTRESİ
    =========================================================================
    Banka internet şubelerinden indirilen ekstre çoğu zaman HTML olur. HTML'in
    etiketleri boşlukla silinirse tablo yapısı yok olur: bütün satırlar TEK
    satıra düşer ve Tarih/Fiş No/Tutar/Bakiye ayrı ayrı okunamaz — hepsi tek bir
    "açıklama" olur. Bu yüzden HTML önce satır/hücre matrisine çevrilir. */

  /* --- HTML tanıma: düz metin ve CSV etkilenmemeli */
  esit("html: belge HTML olarak tanınır", htmlMi("<html><body><table><tr>"), "true");
  esit("html: düz metin HTML sayılmaz", htmlMi(pdfMetni), "false");
  esit("html: CSV HTML sayılmaz", htmlMi("Tarih;Açıklama;Tutar\n10.09.2026;KIRA;30.000,00"), "false");

  /* --- HTML varlıkları (entity) çözülür */
  esit("html varlık: &ccedil;", htmlVarliklariniCoz("A&ccedil;ıklama"), "Açıklama");
  esit("html varlık: &#351;", htmlVarliklariniCoz("Fi&#351;"), "Fiş");
  esit("html varlık: &#x130; (İ)", htmlVarliklariniCoz("&#x130;"), "İ");
  esit("html varlık: &amp; ve &nbsp;", htmlVarliklariniCoz("a&amp;b&nbsp;c"), "a&b c");
  esit("html varlık: geçersiz varlık korunur", htmlVarliklariniCoz("&#xZZ;"), "&#xZZ;");

  /* --- Tablo -> satır/hücre matrisi */
  const htmlEkstre = `<!DOCTYPE html>
  <html><head><meta charset="utf-8"><title>Hesap Ekstresi</title>
  <style>td { font-size: 12px }</style></head>
  <body>
  <h1>Hesap Ekstresi</h1>
  <div>Hesap No: 1234-5678 / IBAN: TR12 0006 4000 0011 2345 6789 01</div>
  <table border="1">
    <thead>
      <tr><th>Tarih</th><th>Fi&#351; No</th><th>A&ccedil;ıklama</th><th>Tutar</th><th>Bakiye</th></tr>
    </thead>
    <tbody>
      <tr><td>2026-09-10</td><td>12345</td><td>IBRAHIM SAFA KAYAR KIRA D BLOK 14</td><td>30.000,00</td><td>44.000,00</td></tr>
      <tr><td>2026-09-15</td><td>12346</td><td>HAS YEK YAPI INSAAT ORTAK GIDER</td><td>-2.500,50</td><td>41.499,50</td></tr>
      <tr><td>2026-10-12</td><td>12347</td><td>IBRAHIM SAFA KAYAR KIRA D BLOK 14</td><td>44.000,00</td><td>85.499,50</td></tr>
      <tr><td colspan="5">Sayfa Sonu Bakiye</td></tr>
    </tbody>
    <tfoot><tr><td colspan="4">TOPLAM</td><td>85.499,50</td></tr></tfoot>
  </table>
  </body></html>`;

  const htmlMatris = htmlSatirlariniOku(htmlEkstre);
  esit("html: satır sayısı (başlık + 3 hareket + 2 özet)", htmlMatris.length, 6);
  esit(
    "html: başlık hücreleri ayrı ayrı",
    htmlMatris[0].join(" | "),
    "Tarih | Fiş No | Açıklama | Tutar | Bakiye"
  );
  esit(
    "html: hareket hücreleri ayrı ayrı",
    htmlMatris[1].join(" | "),
    "2026-09-10 | 12345 | IBRAHIM SAFA KAYAR KIRA D BLOK 14 | 30.000,00 | 44.000,00"
  );
  esit("html: tablo dışı metin matrise girmez", htmlMatris.join(" ").includes("IBAN"), "false");
  esit("html: <style> içeriği atılır", htmlMatris.join(" ").includes("font-size"), "false");
  esit("html: colspan hücreleri boş yer tutucu", htmlMatris[4].join("|"), "Sayfa Sonu Bakiye||||");

  /* --- HTML ekstre hareketleri: xlsx matrisiyle BİREBİR aynı olmalı */
  const htmlHareketleri = metindenHareketler(htmlEkstre);
  esit("html: hareket sayısı", htmlHareketleri.length, 3);
  esit("html: 1. tarih", htmlHareketleri[0].tarih, "2026-09-10");
  esit("html: 1. tutar (Fiş No değil)", htmlHareketleri[0].tutar, 30000);
  esit("html: 1. açıklama (Fiş No karışmaz)", htmlHareketleri[0].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");
  esit("html: 1. ikincil aday bakiye", htmlHareketleri[0].tutarlar[1], 44000);
  esit("html: 1. yön", htmlHareketleri[0].yon, "giris");
  esit("html: 2. tutar (eksi tutar)", htmlHareketleri[1].tutar, 2500.5);
  esit("html: 2. yön", htmlHareketleri[1].yon, "cikis");
  esit("html: 3. tutar", htmlHareketleri[2].tutar, 44000);
  esit(
    "html ekstre, aynı satırların xlsx matrisiyle birebir aynı hareketleri verir",
    JSON.stringify(htmlHareketleri.map((h) => [h.tarih, h.aciklama, h.tutar, h.tutarlar, h.yon])),
    JSON.stringify(fisHareketleri.map((h) => [h.tarih, h.aciklama, h.tutar, h.tutarlar, h.yon]))
  );

  /* --- Özet satırları "okunamayan satır" olarak raporlanmamalı (gürültü) */
  const htmlRapor = metindenHareketlerAyrintili(htmlEkstre);
  esit("html rapor: atlanan satır yok", htmlRapor.atlananlar.length, 0);
  esit("html rapor: yok sayılan sayısı", htmlRapor.yoksayilanlar.length, 2);
  esit("html rapor: sayfa sonu bakiye", htmlRapor.yoksayilanlar[0].neden, "Ekstre başlığı/altlığı");
  esit("html rapor: TOPLAM", htmlRapor.yoksayilanlar[1].neden, "Toplam/bakiye satırı");

  /* --- Eşleştirme: HTML'den okunan hareketler xlsx matrisiyle aynı sonucu vermeli */
  const htmlEslesme = eslesmeleriBul(htmlHareketleri, kayitlar);
  const matrisEslesme = eslesmeleriBul(fisHareketleri, kayitlar);
  const ozetEslesme = (sonuc) =>
    sonuc.map((e) => `${e.guven}:${e.hedef ? e.hedef.id : "-"}`).join(",");
  esit("html eşleşme: 1. hareket otomatik kapatılmaz", htmlEslesme[0].guven, "olasi");
  esit("html eşleşme: 2. hareket çıkış (hedefsiz)", htmlEslesme[1].hedef, "null");
  esit("html eşleşme: 3. hareket kesin kapanır", htmlEslesme[2].guven, "kesin");
  esit("html eşleşme: 3. hedef taksit", htmlEslesme[2].hedef.id, "y2");
  esit(
    "html eşleştirme sonucu xlsx matrisiyle aynı",
    ozetEslesme(htmlEslesme),
    ozetEslesme(matrisEslesme)
  );

  /* --- Kapanış </td> etiketi eksik (HTML'de isteğe bağlı) + &nbsp; binlik ayracı */
  const htmlEksikKapanis = `<table>
  <tr><th>Tarih</th><th>Açıklama</th><th>Tutar</th></tr>
  <tr><td>10.09.2026<td>KIRA TAHSILATI<td>30&nbsp;000,00</tr>
  <tr><td>11.09.2026<td>SU FATURASI<td>450,25</tr></table>`;
  const eksikKapanisSonuc = metindenHareketlerAyrintili(htmlEksikKapanis);
  esit("html kapanışsız: hareket sayısı", eksikKapanisSonuc.hareketler.length, 2);
  esit("html kapanışsız: 1. açıklama", eksikKapanisSonuc.hareketler[0].aciklama, "KIRA TAHSILATI");
  esit("html kapanışsız: &nbsp; binlik ayracı", eksikKapanisSonuc.hareketler[0].tutar, 30000);
  esit("html kapanışsız: 2. tutar", eksikKapanisSonuc.hareketler[1].tutar, 450.25);

  /* --- colspan: sonraki kolonlar kaymamalı (kayarsa bakiye tutar sanılır) */
  const htmlColspan = `<table>
  <tr><th>Tarih</th><th>Fiş No</th><th>Açıklama</th><th>Tutar</th><th>Bakiye</th></tr>
  <tr><td>2026-09-10</td><td colspan="2">12345 IBRAHIM SAFA KAYAR KIRA D BLOK 14</td><td>30.000,00</td><td>44.000,00</td></tr>
  </table>`;
  const colspanHareket = metindenHareketler(htmlColspan);
  esit("html colspan: hareket sayısı", colspanHareket.length, 1);
  esit("html colspan: tutar doğru kolondan (bakiye değil)", colspanHareket[0].tutar, 30000);
  esit("html colspan: ikincil aday bakiye", colspanHareket[0].tutarlar[1], 44000);
  esit("html colspan: açıklama birleşik hücreden", colspanHareket[0].aciklama, "12345 IBRAHIM SAFA KAYAR KIRA D BLOK 14");

  /* --- İç içe tablo: satırları dış matrise karışmaz, metni hücreye katılır */
  const htmlIcIce = `<table>
  <tr><th>Tarih</th><th>Açıklama</th><th>Tutar</th></tr>
  <tr><td>2026-09-10</td><td>KIRA <table><tr><td>IC</td></tr></table> TAHSILATI</td><td>30.000,00</td></tr>
  </table>`;
  const icIceMatris = htmlSatirlariniOku(htmlIcIce);
  esit("html iç içe: satır sayısı", icIceMatris.length, 2);
  esit("html iç içe: metin hücreye katılır", icIceMatris[1][1], "KIRA IC TAHSILATI");
  esit("html iç içe: tutar doğru okunur", metindenHareketler(htmlIcIce)[0].tutar, 30000);

  /* --- Tablo yoksa (div / <pre> tabanlı HTML) düz metin yolu kullanılır */
  const htmlDiv = `<html><body>
  <div>Tarih Fiş No Açıklama Tutar Bakiye</div>
  <div>10.09.2026 12345 IBRAHIM SAFA KAYAR KIRA D BLOK 14 30.000,00 44.000,00</div>
  <div>12.10.2026 12346 IBRAHIM SAFA KAYAR KIRA D BLOK 14 44.000,00 85.499,50</div>
  </body></html>`;
  esit("html tablosuz: tablo matrisi yok (null)", htmlSatirlariniOku(htmlDiv), "null");
  const divSonuc = metindenHareketlerAyrintili(htmlDiv);
  esit("html tablosuz: hareket sayısı", divSonuc.hareketler.length, 2);
  esit("html tablosuz: 1. açıklama", divSonuc.hareketler[0].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");
  esit("html tablosuz: 1. tutar", divSonuc.hareketler[0].tutar, 30000);
  esit(
    "html tablosuz: div'ler ayrı satır olur (tek satıra düşmez)",
    htmlMetneCevir(htmlDiv).split(/\r?\n/).filter((s) => s.trim()).length >= 3,
    "true"
  );

  const htmlPre = `<html><body><pre>Tarih      Fiş No   Açıklama                            Tutar       Bakiye
  10.09.2026 12345    IBRAHIM SAFA KAYAR KIRA D BLOK 14   30.000,00   44.000,00
  </pre></body></html>`;
  const preSonuc = metindenHareketlerAyrintili(htmlPre);
  esit("html <pre>: hareket sayısı", preSonuc.hareketler.length, 1);
  esit("html <pre>: tutar", preSonuc.hareketler[0].tutar, 30000);
  esit("html <pre>: açıklama", preSonuc.hareketler[0].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");

  /* --- Banka üst bilgisi ("Etiket: değer") okunamayan satır olarak gösterilmez.
    İki noktasız gerçek hareket açıklaması ("PENDIK SUBE KIRA TAHSILATI")
    elenmemelidir: kural yalnızca "etiket:" biçimine uygulanır. */
  const htmlUstBilgi = `<table>
  <tr><th>Tarih</th><th>Fiş No</th><th>Açıklama</th><th>Tutar</th><th>Bakiye</th></tr>
  <tr><td>2026-09-10</td><td>12345</td><td>PENDIK SUBE KIRA TAHSILATI</td><td>30.000,00</td><td>44.000,00</td></tr>
  </table>
  <table><tr><td>Muhasebe birimi: PENDIK</td></tr></table>
  <table><tr><td>M&uuml;&#351;teri No: 987654</td></tr></table>`;
  const ustBilgiSonuc = metindenHareketlerAyrintili(htmlUstBilgi);
  esit("html üst bilgi: hareket sayısı", ustBilgiSonuc.hareketler.length, 1);
  esit(
    "html üst bilgi: iki noktasız gerçek hareket korunur",
    ustBilgiSonuc.hareketler[0].aciklama,
    "PENDIK SUBE KIRA TAHSILATI"
  );
  esit("html üst bilgi: okunamayan satır yok", ustBilgiSonuc.atlananlar.length, 0);
  esit("html üst bilgi: üst bilgi satırları yok sayılır", ustBilgiSonuc.yoksayilanlar.length, 2);
  esit(
    "html üst bilgi: yok sayılan neden",
    ustBilgiSonuc.yoksayilanlar[0].neden,
    "Ekstre başlığı/altlığı"
  );

  /* --- Çok sayfalı HTML: her sayfa ayrı <table> ve kolon başlığı TEKRARLANIR.
    Tekrarlanan başlık "okunamayan satır" diye raporlanmamalı; ayrıca ikinci
    tablonun kolon düzeni sonraki satırlara uygulanmalıdır. */
  const htmlCokSayfa = `<table>
  <tr><th>Tarih</th><th>Fiş No</th><th>Açıklama</th><th>Tutar</th><th>Bakiye</th></tr>
  <tr><td>2026-09-10</td><td>12345</td><td>IBRAHIM SAFA KAYAR KIRA D BLOK 14</td><td>30.000,00</td><td>44.000,00</td></tr>
  <tr><td colspan="5">Sayfa Sonu Bakiye</td></tr>
  </table>
  <table>
  <tr><th>Tarih</th><th>Fiş No</th><th>Açıklama</th><th>Tutar</th><th>Bakiye</th></tr>
  <tr><td>2026-10-12</td><td>12346</td><td>IBRAHIM SAFA KAYAR KIRA D BLOK 14</td><td>44.000,00</td><td>85.499,50</td></tr>
  </table>`;
  const cokSayfaSonuc = metindenHareketlerAyrintili(htmlCokSayfa);
  esit("html çok sayfa: hareket sayısı", cokSayfaSonuc.hareketler.length, 2);
  esit("html çok sayfa: 2. hareket tutarı", cokSayfaSonuc.hareketler[1].tutar, 44000);
  esit("html çok sayfa: 2. hareket tarihi", cokSayfaSonuc.hareketler[1].tarih, "2026-10-12");
  esit("html çok sayfa: 2. hareket açıklaması", cokSayfaSonuc.hareketler[1].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");
  esit(
    "html çok sayfa: tekrarlanan başlık okunamayan satır değil",
    cokSayfaSonuc.atlananlar.length,
    0
  );
  esit("html çok sayfa: yalnızca sayfa sonu özeti yok sayılır", cokSayfaSonuc.yoksayilanlar.length, 1);

  /* İkinci tablonun kolon sırası farklıysa yeni başlık geçerli olmalı. */
  const htmlFarkliKolon = `<table>
  <tr><th>Tarih</th><th>Açıklama</th><th>Tutar</th></tr>
  <tr><td>2026-09-10</td><td>FAZIL GUNES KIRA C BLOK 27</td><td>30.000,00</td></tr>
  </table>
  <table>
  <tr><th>Açıklama</th><th>Tarih</th><th>Tutar</th><th>Bakiye</th></tr>
  <tr><td>IBRAHIM SAFA KAYAR KIRA D BLOK 14</td><td>2026-10-12</td><td>44.000,00</td><td>85.499,50</td></tr>
  </table>`;
  const farkliKolon = metindenHareketler(htmlFarkliKolon);
  esit("html farklı kolon: hareket sayısı", farkliKolon.length, 2);
  esit("html farklı kolon: 2. tarih yeni düzenden", farkliKolon[1].tarih, "2026-10-12");
  esit("html farklı kolon: 2. tutar yeni düzenden", farkliKolon[1].tutar, 44000);
  esit("html farklı kolon: 2. açıklama", farkliKolon[1].aciklama, "IBRAHIM SAFA KAYAR KIRA D BLOK 14");

  /* --- Aynı kural düz metin/OCR yolunda: çok sayfalı PDF metninde tekrarlanan
    kolon başlığı "okunamayan satır" uyarısına düşmemeli. */
  const pdfCokSayfa = `Tarih Açıklama Tutar
  10.09.2026 FAZIL GUNES KIRA C BLOK 27 30.000,00
  Sayfa 1/2
  Tarih Açıklama Tutar
  12.10.2026 IBRAHIM SAFA KAYAR KIRA D BLOK 14 44.000,00`;
  const pdfCokSayfaSonuc = metindenHareketlerAyrintili(pdfCokSayfa);
  esit("pdf çok sayfa: hareket sayısı", pdfCokSayfaSonuc.hareketler.length, 2);
  esit("pdf çok sayfa: okunamayan satır yok", pdfCokSayfaSonuc.atlananlar.length, 0);
  esit("pdf çok sayfa: başlık ve sayfa bilgisi yok sayılır", pdfCokSayfaSonuc.yoksayilanlar.length, 2);

  /* --- Etiketli satırlar ("Tarih: 10.09.2026 | Tutar: 30.000,00") başlık
    sanılıp atlanmamalı: başlık satırı tarih ya da BİÇİMLİ tutar taşımaz.
    (A) Normal başlıktan sonra gelen etiketli hareket satırı okunmalıdır. */
  const etiketliSatirlar = satirlardanHareketler([
    ["Tarih", "Açıklama", "Tutar"],
    ["Tarih: 12.10.2026", "Açıklama: IBRAHIM SAFA KAYAR KIRA D BLOK 14", "Tutar: 44.000,00"]
  ]);
  esit("etiketli hareket: satır atlanmaz", etiketliSatirlar.length, 1);
  esit("etiketli hareket: tarih", etiketliSatirlar[0].tarih, "2026-10-12");
  esit("etiketli hareket: tutar", etiketliSatirlar[0].tutar, 44000);
  esit(
    "etiketli hareket: açıklamada kiracı adı korunur",
    etiketliSatirlar[0].aciklama.includes("IBRAHIM SAFA KAYAR"),
    "true"
  );

  /* (B) Başlık öncesi etiketli satır sessizce YUTULMAMALI: hareket olarak
    okunamıyorsa "okunamayan satır" olarak bildirilir (kullanıcı görür). */
  const etiketliTek = metindenHareketlerAyrintili([
    ["Tarih: 10.09.2026", "Açıklama: FAZIL GUNES KIRA C BLOK 27", "Tutar: 30.000,00"]
  ]);
  esit("etiketli tek satır: başlık sanılmaz (hareket ya da rapor)", etiketliTek.hareketler.length + etiketliTek.atlananlar.length, 1);

  /* (C) Yıl kolonu gibi ÇIPLAK sayı taşıyan başlık, hareket sanılmamalı. */
  const yilKolonluBaslik = satirlardanHareketler([
    ["2026", "Açıklama", "Tutar"],
    ["2026-09-10", "FAZIL GUNES KIRA C BLOK 27", "30.000,00"]
  ]);
  esit("çıplak sayılı başlık: sahte hareket üretilmez", yilKolonluBaslik.length, 1);
  esit("çıplak sayılı başlık: doğru hareket", yilKolonluBaslik[0].tutar, 30000);

  /* Özet */
  console.log(`\n${gecen} kontrol geçti.`);
  if (hatalar.length) {
    console.error(`\n❌ ${hatalar.length} hata:`);
    hatalar.forEach((h) => console.error(" - " + h));
    process.exit(1);
  }
  console.log("✅ Tüm testler geçti.");
