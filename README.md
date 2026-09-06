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
- Banka eşleştirme, ekstre metnini elle yapıştırıp ayrıştırma üzerinden çalışır;
  gerçek banka API entegrasyonu değildir.

## Yapı
- `src/App.jsx` — tüm uygulama mantığı ve arayüz
- `src/main.jsx` — React giriş noktası
- `index.html` — Vite giriş sayfası
# hasyek-kira-takip
