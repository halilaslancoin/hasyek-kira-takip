# HasYek Kira Takip APP

## VS Code'da çalıştırma

1. Bu klasörü VS Code ile aç.
2. Terminalden:
   ```
   npm install
   npm run dev
   ```
3. Terminalde çıkan adresi (genelde http://localhost:5173) tarayıcıda aç.
4. Pencereyi genişlet — uygulama tam ekran kurumsal görünüm için tasarlandı.

## Veri nerede tutuluyor?
Uygulama verileri (mülkler, kişiler, sözleşmeler, ödemeler, giderler, bakım
talepleri, profil) tarayıcının localStorage'ında `hasyek:` önekiyle saklanır.
Farklı bir tarayıcı ya da gizli sekme açarsan veriler görünmez. Sunucu/veritabanı
yoktur; çok kullanıcılı / gerçek üretim kullanımı için bir backend eklenmesi
gerekir.

## Bilinmesi gereken sınırlamalar
- "HasYek'e Davet Et" linki ve mülk fotoğrafları arayüz taslağıdır; gerçek bir
  sunucu / dosya yükleme sistemi olmadan çalışmaz (görseller yalnızca URL ile eklenir).
- Menüdeki "Muhasebe Entegrasyonu", "Ciro Beyanları", "Hukuki Destek" öğeleri
  bilinçli olarak "Yakında" durumunda bırakıldı.
- Banka eşleştirme, yüklenen ekstre dosyası (Excel/CSV/PDF/taranmış görüntü/HTML)
  üzerinden çalışır; gerçek banka API entegrasyonu değildir. Ekstre kolonları
  "Tarih | Açıklama | Borç | Alacak | Bakiye" ya da tek tutar kolonlu
  "Tarih | Fiş No | Açıklama | Tutar | Bakiye" düzeninde olabilir. Tutar
  "Tutar" kolonundan okunur, "Bakiye" yalnızca ikincil adaydır (bakiye ile borç
  otomatik kapatılmaz) ve "Fiş No" kolonu tutar sanılmaz.
- İnternet şubesinden indirilen `.html` / `.htm` ekstreler etiketleri silinerek
  değil, **tablo olarak** okunur: `<table>` içindeki her hücre ayrı kolondur, bu
  yüzden Tarih / Fiş No / Açıklama / Tutar / Bakiye ayrı ayrı çıkar (etiketler
  silinseydi tüm satırlar tek satıra düşer ve hepsi "açıklama" olurdu). Kapanış
  `</td>` etiketi eksik olan bozuk HTML, `colspan` ile birleşmiş hücreler, iç içe
  tablolar ve `&ccedil;` / `&#351;` gibi HTML varlıkları da desteklenir. Tablo
  içermeyen HTML (ör. `<div>` ya da `<pre>` tabanlı) düz metin gibi okunur.
- Taranmış ekstrelerde OCR metni gürültülüdür: IBAN/hesap başlığı, "Sayfa Sonu
  Bakiye" gibi altlıklar ve uzun açıklama yüzünden alta sarkan tutarlar tolere
  edilir. Ay adlı tarih ("10 Eylül 2026") ve boşluklu binlik ayracı ("30 000,00")
  da okunur.
- Tutarı ya da açıklaması çözülemeyen satırlar sessizce atılmaz: yükleme
  sonrasında "N satır okunamadı" uyarısı ve satır listesi gösterilir (böylece
  ödenmiş bir taksit yanlışlıkla ödenmemiş görünmez). Yalnızca başlık/altlık ve
  toplam/bakiye satırları bu listede gösterilmez, tamamen yok sayılır.
- Kira sözleşmesi okuma taranmış belgelerde Tesseract OCR kullanır; ilk
  kullanımda dil verisi internetten indirilir ve okuma kalitesi taramaya bağlıdır.
  Word şablonunu doğrudan PDF'e aktarırsanız metin katmanı okunur ve OCR hiç
  devreye girmez.

## Yapı
- `src/App.jsx` — uygulama mantığı ve arayüz
- `src/contractParser.mjs` — kira sözleşmesi metninden alan çıkarma (saf)
- `src/statementParser.mjs` — banka ekstresi ayrıştırma + eşleştirme (saf)
- `src/xlsxLite.mjs` — bağımlılıksız .xlsx okuyucu
- `src/leaseSchedule.mjs` — taksit/senet takvimi üretimi (saf)
- `src/*.test.mjs` — `npm test` ile çalışan kontrol testleri
- `src/main.jsx` — React giriş noktası
- `index.html` — Vite giriş sayfası

## Testler
```
npm test
```
Sözleşme ayrıştırma, ekstre eşleştirme ve taksit takvimi mantığını kapsar
(toplam 380 kontrol). Testler ağ veya tarayıcı gerektirmez.

## Teşhis aracı
```
npm install --no-save @napi-rs/canvas
node tools/ocr-inspect.mjs "/yol/belge.pdf" 3 --parse
```
Bir PDF'in OCR metnini ve çıkarılan alanları terminale basar.
# hasyek-kira-takip
