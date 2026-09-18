/* Kira takvimi (taksit + senet üretimi) testi.
   Çalıştır: node src/leaseSchedule.test.mjs                                   */

import { kiraTakvimi, vadeTarihi, SENET_SAYISI, KIRA_AYI } from "./leaseSchedule.mjs";

let gecen = 0;
const hatalar = [];

const esit = (ad, gercek, beklenen) => {
  if (String(gercek) === String(beklenen)) {
    gecen++;
  } else {
    hatalar.push(`${ad}: beklenen "${beklenen}", gelen "${gercek}"`);
  }
};

esit("senet sayısı", SENET_SAYISI, 11);
esit("toplam ay", KIRA_AYI, 12);

/* Ay taşmaları */
esit("normal gün", vadeTarihi(new Date(2026, 8, 10), 0, 10), "2026-09-10");
esit("şubat taşması", vadeTarihi(new Date(2026, 0, 31), 1, 31), "2026-02-28");
esit("nisan taşması", vadeTarihi(new Date(2026, 0, 31), 3, 31), "2026-04-30");
esit("artık yıl şubat", vadeTarihi(new Date(2028, 0, 31), 1, 31), "2028-02-29");
esit("yıl geçişi", vadeTarihi(new Date(2026, 10, 10), 3, 10), "2027-02-10");

/* Standart sözleşme: 10.09.2026 başlangıç, ödeme günü 10 */
const ana = kiraTakvimi({
  baslangic: new Date(2026, 8, 10),
  odemeGunu: 10,
  kira: 30000
});
esit("12 aylık borç", ana.taksitler.length, KIRA_AYI);
esit("11 senet", ana.senetler.length, SENET_SAYISI);
esit("ilk ay peşin", ana.taksitler[0].tur, "pesin");
esit("ilk vade başlangıç günü", ana.taksitler[0].dueDate, "2026-09-10");
esit("sonraki ay taksit", ana.taksitler[1].tur, "kira");
esit("sonraki ay vadesi", ana.taksitler[1].dueDate, "2026-10-10");
esit("son taksit vadesi", ana.taksitler[11].dueDate, "2027-08-10");
esit("taksit tutarı", ana.taksitler[5].amount, 30000);
esit("ilk senet numarası", ana.senetler[0].senetNo, "SNT-2026-001");
esit("son senet numarası", ana.senetler[10].senetNo, "SNT-2026-011");
esit("ilk senet vadesi", ana.senetler[0].dueDate, "2026-10-10");
esit("peşin ay için senet yok", ana.senetler.some((s) => s.dueDate === "2026-09-10"), "false");
esit("senet tutarı", ana.senetler[0].amount, 30000);

/* Farklı ödeme günü: sözleşme 10'unda başlıyor, kira her ayın 15'i */
const onbes = kiraTakvimi({ baslangic: new Date(2026, 8, 10), odemeGunu: 15, kira: 44000 });
esit("ödeme günü dikkate alınır", onbes.taksitler[0].dueDate, "2026-09-15");
esit("ödeme günü sonraki ay", onbes.taksitler[1].dueDate, "2026-10-15");

/* Tekrar üretim yok: mevcut vadeler verilirse kalan aylar üretilir */
const varOlan = new Set(ana.taksitler.map((t) => t.dueDate));
const tekrar = kiraTakvimi({
  baslangic: new Date(2026, 8, 10),
  odemeGunu: 10,
  kira: 30000,
  mevcutVadeler: [...varOlan]
});
esit("mevcut vadeler tekrarlanmaz", tekrar.taksitler.length, 0);
esit("mevcut senetler tekrarlanmaz", tekrar.senetler.length, 0);

const kismi = kiraTakvimi({
  baslangic: new Date(2026, 8, 10),
  odemeGunu: 10,
  kira: 30000,
  mevcutVadeler: ana.taksitler.slice(0, 3).map((t) => t.dueDate),
  senetBaslangicNo: 4
});
esit("eksik kalan taksitler üretilir", kismi.taksitler.length, 9);
esit("eksik kalan senetler üretilir", kismi.senetler.length, 9);
esit("senet numarası devam eder", kismi.senetler[0].senetNo, "SNT-2026-004");

/* Senetsiz sözleşme (yalnızca nakit) */
const nakitsiz = kiraTakvimi({ baslangic: new Date(2026, 8, 10), odemeGunu: 10, kira: 30000, senetSayisi: 0 });
esit("senetsiz tek taksit", nakitsiz.taksitler.length, 1);
esit("senetsiz senet yok", nakitsiz.senetler.length, 0);

/* Geçersiz girdiler */
esit("kira yoksa üretim yok", kiraTakvimi({ baslangic: new Date(2026, 8, 10), kira: 0 }).taksitler.length, 0);
esit("tarih yoksa üretim yok", kiraTakvimi({ baslangic: null, kira: 1000 }).taksitler.length, 0);

console.log(`\n${gecen} kontrol geçti.`);
if (hatalar.length) {
  console.error(`\n❌ ${hatalar.length} hata:`);
  hatalar.forEach((h) => console.error(" - " + h));
  process.exit(1);
}
console.log("✅ Tüm testler geçti.");
