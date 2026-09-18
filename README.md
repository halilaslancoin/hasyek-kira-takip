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
- Banka eşleştirme, yüklenen ekstre dosyası (Excel/CSV/PDF/taranmış görüntü)
  üzerinden çalışır; gerçek banka API entegrasyonu değildir.
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
(toplam ~220 kontrol). Testler ağ veya tarayıcı gerektirmez.

## Teşhis aracı
```
npm install --no-save @napi-rs/canvas
node tools/ocr-inspect.mjs "/yol/belge.pdf" 3 --parse
```
Bir PDF'in OCR metnini ve çıkarılan alanları terminale basar.
# hasyek-kira-takip
