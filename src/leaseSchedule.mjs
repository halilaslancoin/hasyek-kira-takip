/* Kira ödeme takvimi üretimi (saf, test edilebilir).

   Düzen: ilk ay peşin (nakit) tahsil edilir, kalan 11 ay senetle takip edilir;
   toplam 12 aylık borç oluşur. Her ay için tek kayıt üretilir ve zaten kayıtlı
   vade varsa tekrar üretilmez — böylece düğmeye birkaç kez basmak kayıt
   çoğaltmaz.

   Ay taşmaları engellenir: ödeme günü 31 olsa bile Şubat için 28/29, Nisan
   için 30 kullanılır. */

export const SENET_SAYISI = 11;
export const KIRA_AYI = SENET_SAYISI + 1;

const iki = (n) => String(n).padStart(2, "0");

/** Başlangıçtan `ayFarki` ay sonraki, ayın `gun` gününe denk gelen vade. */
export function vadeTarihi(baslangic, ayFarki, gun) {
  const d = new Date(baslangic.getFullYear(), baslangic.getMonth() + ayFarki, 1);
  const aySonu = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(Math.max(Number(gun) || 1, 1), aySonu));
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;
}

/**
 * Eksik taksitleri ve senetleri üretir.
 * @param {object}   p
 * @param {Date}     p.baslangic       sözleşme başlangıç tarihi
 * @param {number}   p.odemeGunu       her ayın ödeme günü (1-31)
 * @param {number}   p.kira            aylık kira bedeli
 * @param {string[]} [p.mevcutVadeler] zaten kayıtlı vadeler (tekrar üretilmez)
 * @param {number}   [p.senetSayisi]   üretilecek senet sayısı
 * @param {number}   [p.senetBaslangicNo] numaralandırmanın başlangıcı
 * @param {number}   [p.yil]           senet numarasındaki yıl
 */
export function kiraTakvimi({
  baslangic,
  odemeGunu,
  kira,
  mevcutVadeler = [],
  senetSayisi = SENET_SAYISI,
  senetBaslangicNo = 1,
  yil
}) {
  const kiraDegeri = Number(kira) || 0;
  const gecerliTarih = baslangic instanceof Date && !Number.isNaN(baslangic.getTime());
  if (!gecerliTarih || kiraDegeri <= 0) return { taksitler: [], senetler: [] };

  const aySayisi = Math.max(0, Number(senetSayisi) || 0) + 1;
  const gun = Number(odemeGunu) || baslangic.getDate();
  const yilDegeri = yil || baslangic.getFullYear();
  const varOlan = new Set(mevcutVadeler.filter(Boolean));

  const taksitler = [];
  const senetler = [];
  let senetSirasi = Number(senetBaslangicNo) || 1;

  for (let ay = 0; ay < aySayisi; ay++) {
    const vade = vadeTarihi(baslangic, ay, gun);
    if (varOlan.has(vade)) continue;
    const pesin = ay === 0;
    taksitler.push({ tur: pesin ? "pesin" : "kira", dueDate: vade, amount: kiraDegeri });
    if (!pesin) {
      senetler.push({
        senetNo: `SNT-${yilDegeri}-${String(senetSirasi).padStart(3, "0")}`,
        dueDate: vade,
        amount: kiraDegeri
      });
      senetSirasi++;
    }
  }

  return { taksitler, senetler };
}
