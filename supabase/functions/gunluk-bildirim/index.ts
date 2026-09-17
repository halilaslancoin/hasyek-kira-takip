// Supabase Edge Function — günlük kira bildirimleri
// E-posta: Resend · WhatsApp: Meta WhatsApp Business Cloud API
//
// Çağrı biçimleri:
//   1) Zamanlayıcı (pg_cron, saatlik): x-bildirim-anahtari: <CRON_SECRET> -> tüm malikler,
//      yalnızca gönderim saati gelmiş kiracılar (Türkiye saati, UTC+3)
//   2) Uygulamadan "Şimdi çalıştır": Authorization: Bearer <kullanıcı JWT>,
//      gövde {"zorla": true} -> yalnızca o malik, saat kontrolü atlanır
//
// Ayarlar (varsayılanlar): user_data -> key = "hasyek:bildirimAyarlari"
// Kiracı bazlı geçersiz kılmalar: tenant_access.bildirim_ayarlari (jsonb)
//   { hatirlatmaGun, eposta, whatsapp, kiracilaraGonder, malikeGonder, gonderimSaati }
//
// Gizli değişkenler (supabase secrets set ...):
//   CRON_SECRET, RESEND_API_KEY, BILDIRIM_GONDEREN,
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const GONDEREN = Deno.env.get("BILDIRIM_GONDEREN") || "";
const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN") || "";
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") || "";

const AYAR_ANAHTARI = "hasyek:bildirimAyarlari";
const GUN_MS = 86400000;

const json = (govde, durum = 200) =>
  new Response(JSON.stringify(govde), {
    status: durum,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

const bugun = () => new Date().toISOString().slice(0, 10);

// Türkiye saati (UTC+3, 2016'dan beri sabit).
const trSaat = () => (new Date().getUTCHours() + 3) % 24;

const parcala = (tarihMetni) => {
  const p = String(tarihMetni || "").slice(0, 10).split("-").map(Number);
  if (p.length !== 3 || p.some((n) => isNaN(n))) return null;
  return Date.UTC(p[0], p[1] - 1, p[2]);
};

// Vade ile bugün arasındaki gün farkı (negatifse gecikmiş).
const gunFarki = (tarihMetni) => {
  const hedef = parcala(tarihMetni);
  const simdi = parcala(bugun());
  if (hedef === null || simdi === null) return null;
  return Math.round((hedef - simdi) / GUN_MS);
};

const tarihYaz = (tarihMetni) => {
  const p = String(tarihMetni || "").slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : "-";
};

const paraYaz = (tutar) => {
  const sayi = Number(tutar) || 0;
  return sayi.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " TL";
};

// Türkiye numaralarını WhatsApp biçimine çevirir (905xxxxxxxxx).
const telefonYaz = (telefon) => {
  const rakam = String(telefon || "").replace(/[^0-9]/g, "");
  if (!rakam) return "";
  if (rakam.startsWith("90") && rakam.length >= 12) return rakam;
  if (rakam.startsWith("0")) return "9" + rakam;
  if (rakam.length === 10) return "90" + rakam;
  return rakam;
};

const epostaSablonu = (baslik, satirlar) => `<!doctype html>
<html lang="tr"><body style="margin:0;padding:24px;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:24px">
    <h2 style="margin:0 0 16px;font-size:18px;color:#E53935">${baslik}</h2>
    ${satirlar
      .map((s) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6">${s}</p>`)
      .join("")}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
    <p style="margin:0;font-size:12px;color:#6b7280">
      Bu e-posta HasYek Kira Takip uygulamasından otomatik gönderildi.
    </p>
  </div>
</body></html>`;

const epostaGonder = async ({ kime, konu, html }) => {
  if (!RESEND_KEY || !GONDEREN) {
    return { ok: false, hata: "E-posta yapılandırılmamış (RESEND_API_KEY / BILDIRIM_GONDEREN)." };
  }
  try {
    const yanit = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: GONDEREN, to: [kime], subject: konu, html })
    });
    if (!yanit.ok) {
      return { ok: false, hata: `Resend ${yanit.status}: ${(await yanit.text()).slice(0, 300)}` };
    }
    return { ok: true, hata: "" };
  } catch (e) {
    return { ok: false, hata: "Resend bağlantı hatası: " + String(e) };
  }
};

const whatsappGonder = async ({ kime, sablon, dil, parametreler }) => {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    return { ok: false, hata: "WhatsApp yapılandırılmamış (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)." };
  }
  const numara = telefonYaz(kime);
  if (!numara) return { ok: false, hata: "Geçersiz telefon numarası." };
  if (!sablon) return { ok: false, hata: "WhatsApp şablon adı tanımlı değil." };

  const sablonNesnesi = { name: sablon, language: { code: dil || "tr" } };
  const params = (parametreler || []).filter((p) => p !== undefined && p !== null);
  if (params.length > 0) {
    sablonNesnesi.components = [
      { type: "body", parameters: params.map((t) => ({ type: "text", text: String(t) })) }
    ];
  }

  try {
    const yanit = await fetch(
      `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: numara,
          type: "template",
          template: sablonNesnesi
        })
      }
    );
    if (!yanit.ok) {
      return { ok: false, hata: `WhatsApp ${yanit.status}: ${(await yanit.text()).slice(0, 300)}` };
    }
    return { ok: true, hata: "" };
  } catch (e) {
    return { ok: false, hata: "WhatsApp bağlantı hatası: " + String(e) };
  }
};

Deno.serve(async (istek) => {
  if (istek.method !== "POST") return json({ hata: "POST bekleniyor." }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ hata: "Sunucu yapılandırması eksik (SUPABASE_URL / SERVICE_ROLE)." }, 500);
  }

  let govde = {};
  try {
    govde = await istek.json();
  } catch (e) {
    govde = {};
  }

  const yonetici = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
  });

  // Yetki: zamanlayıcı anahtarı ya da kullanıcı oturumu.
  const anahtar = istek.headers.get("x-bildirim-anahtari") || "";
  const zamanlayiciCagrisi = CRON_SECRET !== "" && anahtar === CRON_SECRET;
  // Gönderim saati yalnızca uygulamadan yapılan manuel çalıştırmada yok sayılır.
  const zorla = !zamanlayiciCagrisi && govde.zorla === true;
  let sahipler = null;
  if (!zamanlayiciCagrisi) {
    const jwt = (istek.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ hata: "Yetkisiz çağrı." }, 401);
    const { data, error } = await yonetici.auth.getUser(jwt);
    if (error || !data || !data.user) return json({ hata: "Geçersiz oturum." }, 401);
    sahipler = [data.user.id];
  }

  if (!sahipler) {
    const { data, error } = await yonetici
      .from("user_data")
      .select("user_id")
      .eq("key", AYAR_ANAHTARI);
    if (error) return json({ hata: "Ayarlar okunamadı: " + error.message }, 500);
    sahipler = [...new Set((data || []).map((s) => s.user_id))];
  }

  const ozet = { malikSayisi: sahipler.length, gonderilen: 0, atlanan: 0, hata: 0, ayrinti: [] };

  for (const sahip of sahipler) {
    const ayarKaydi = await yonetici
      .from("user_data")
      .select("value")
      .eq("user_id", sahip)
      .eq("key", AYAR_ANAHTARI)
      .maybeSingle();
    if (ayarKaydi.error || !ayarKaydi.data || !ayarKaydi.data.value) continue;

    let ayar = null;
    try {
      ayar = JSON.parse(ayarKaydi.data.value);
    } catch (e) {
      continue;
    }
    if (!ayar || ayar.aktif === false) continue;

    // Genel ayarlar varsayılandır; kiracı bazında geçersiz kılınabilir.
    const genelHatirlatmaGun =
      Number(ayar.hatirlatmaGun) >= 0 ? Number(ayar.hatirlatmaGun) : 3;
    const kanallar = ayar.kanallar || {};
    const genelEposta = kanallar.eposta !== false;
    const genelWhatsapp = kanallar.whatsapp === true;

    // Malik iletişim bilgileri: ayardan, yoksa hesabın e-postasından.
    let malikEposta = (ayar.malikEposta || "").trim();
    if (!malikEposta) {
      try {
        const kullanici = await yonetici.auth.admin.getUserById(sahip);
        malikEposta = kullanici?.data?.user?.email || "";
      } catch (e) {
        malikEposta = "";
      }
    }
    const malikTelefon = (ayar.malikTelefon || "").trim();

    const { data: yayinlar, error: yayinHatasi } = await yonetici
      .from("tenant_access")
      .select("*")
      .eq("owner_id", sahip);
    if (yayinHatasi) {
      ozet.hata += 1;
      ozet.ayrinti.push({ sahip, hata: "tenant_access: " + yayinHatasi.message });
      continue;
    }

    const bugunKayit = await yonetici
      .from("bildirim_kayitlari")
      .select("tur,kanal,alici,tenant_email,payment_id")
      .eq("owner_id", sahip)
      .eq("gonderim_gun", bugun());
    const gonderilmis = new Set(
      (bugunKayit.data || []).map((k) =>
        [k.tur, k.kanal, k.alici, k.tenant_email, k.payment_id].join("|")
      )
    );

    const kaydet = async (satir) => {
      const { error } = await yonetici.from("bildirim_kayitlari").insert(satir);
      if (error) ozet.ayrinti.push({ sahip, hata: "kayıt: " + error.message });
    };

    for (const yayin of yayinlar || []) {
      const kiraciAyar =
        yayin.bildirim_ayarlari && typeof yayin.bildirim_ayarlari === "object"
          ? yayin.bildirim_ayarlari
          : {};
      const say = (deger, varsayilan) =>
        Number.isFinite(Number(deger)) ? Number(deger) : varsayilan;

      const hatirlatmaGun = say(kiraciAyar.hatirlatmaGun, genelHatirlatmaGun);
      const epostaAcik =
        kiraciAyar.eposta === undefined ? genelEposta : kiraciAyar.eposta === true;
      const whatsappAcik =
        kiraciAyar.whatsapp === undefined
          ? genelWhatsapp
          : kiraciAyar.whatsapp === true;
      const kiracilaraGonder =
        kiraciAyar.kiracilaraGonder === undefined
          ? ayar.kiracilaraGonder !== false
          : kiraciAyar.kiracilaraGonder !== false;
      const malikeGonder =
        kiraciAyar.malikeGonder === undefined
          ? ayar.malikeGonder !== false
          : kiraciAyar.malikeGonder !== false;

      // Gönderim saati kiracı bazında ayarlanır; zamanlayıcı her saat çalıştığı
      // için saati gelmemiş kiracılar bu turda atlanır (aynı gün tekrar gönderim
      // yok, o yüzden sonraki turlarda yakalanır).
      const saatMetni = String(
        kiraciAyar.gonderimSaati || ayar.gonderimSaati || "09:00"
      );
      let saat = Number(saatMetni.split(":")[0]);
      if (!Number.isFinite(saat)) {
        // Bozuk değerde genel saate düş; saat kontrolü hiç kapanmasın.
        saat = Number(String(ayar.gonderimSaati || "09:00").split(":")[0]);
      }
      if (!zorla && Number.isFinite(saat) && trSaat() < saat) continue;

      const odemeler = Array.isArray(yayin.payments) ? yayin.payments : [];
      for (const odeme of odemeler) {
        const tutar = Number(odeme.amount) || 0;
        const odenen = Number(odeme.paidAmount) || 0;
        if (tutar > 0 && odenen >= tutar) continue; // ödenmiş
        const kalan = tutar > 0 ? Math.max(tutar - odenen, 0) : tutar;
        const fark = gunFarki(odeme.dueDate);
        if (fark === null) continue;

        const vadeYakin = fark >= 0 && fark <= hatirlatmaGun;
        const gecikti = fark < 0;
        if (!vadeYakin && !gecikti) continue;

        const odemeNo = String(odeme.id || odeme.dueDate || "");
        const mulk = yayin.property_label || "Mülk";
        const kiraciAdi = yayin.tenant_name || "Kiracı";
        const kiraciEposta = (yayin.tenant_email || "").toLowerCase();
        const kiraciTelefon = (yayin.tenant_phone || "").trim();

        // 1) Vadesi yaklaşan ödeme -> kiracıya hatırlatma
        if (vadeYakin && kiracilaraGonder) {
          const govdeSatirlari = [
            `Sayın ${kiraciAdi},`,
            `${mulk} için ${tarihYaz(odeme.dueDate)} vadeli kira ödemeniz yaklaşıyor.`,
            `Ödenecek tutar: <strong>${paraYaz(kalan)}</strong>`
          ];
          const konu = `Kira hatırlatması - ${tarihYaz(odeme.dueDate)}`;

          if (epostaAcik && kiraciEposta) {
            const anahtar = ["vade", "eposta", kiraciEposta, kiraciEposta, odemeNo].join("|");
            if (gonderilmis.has(anahtar)) ozet.atlanan += 1;
            else {
              const sonuc = await epostaGonder({
                kime: kiraciEposta,
                konu,
                html: epostaSablonu("Kira ödemesi hatırlatması", govdeSatirlari)
              });
              gonderilmis.add(anahtar);
              sonuc.ok ? (ozet.gonderilen += 1) : (ozet.hata += 1);
              await kaydet({
                owner_id: sahip,
                tur: "vade",
                kanal: "eposta",
                alici_tur: "kiraci",
                alici: kiraciEposta,
                tenant_email: kiraciEposta,
                payment_id: odemeNo,
                durum: sonuc.ok ? "gonderildi" : "hata",
                hata: sonuc.hata || null
              });
              if (!sonuc.ok) ozet.ayrinti.push({ sahip, hata: "kiracı e-posta: " + sonuc.hata });
            }
          }

          if (whatsappAcik && kiraciTelefon && ayar.sablonVade) {
            const anahtar = ["vade", "whatsapp", kiraciTelefon, kiraciEposta, odemeNo].join("|");
            if (gonderilmis.has(anahtar)) ozet.atlanan += 1;
            else {
              const sonuc = await whatsappGonder({
                kime: kiraciTelefon,
                sablon: ayar.sablonVade,
                dil: ayar.waDilKodu,
                parametreler: [kiraciAdi, paraYaz(kalan), tarihYaz(odeme.dueDate)]
              });
              gonderilmis.add(anahtar);
              sonuc.ok ? (ozet.gonderilen += 1) : (ozet.hata += 1);
              await kaydet({
                owner_id: sahip,
                tur: "vade",
                kanal: "whatsapp",
                alici_tur: "kiraci",
                alici: kiraciTelefon,
                tenant_email: kiraciEposta,
                payment_id: odemeNo,
                durum: sonuc.ok ? "gonderildi" : "hata",
                hata: sonuc.hata || null
              });
              if (!sonuc.ok) ozet.ayrinti.push({ sahip, hata: "kiracı whatsapp: " + sonuc.hata });
            }
          }
        }

        // 2) Vadesi geçmiş ödeme -> malike bildirim
        if (gecikti && malikeGonder) {
          const gecikmeGun = Math.abs(fark);
          const konu = `Gecikmiş kira ödemesi - ${kiraciAdi} (${gecikmeGun} gün)`;
          const govdeSatirlari = [
            `${mulk} için ${tarihYaz(odeme.dueDate)} vadeli kira ödemesi gecikti.`,
            `Kiracı: <strong>${kiraciAdi}</strong>`,
            `Gecikme: <strong>${gecikmeGun} gün</strong> · Bekleyen tutar: <strong>${paraYaz(kalan)}</strong>`
          ];

          if (epostaAcik && malikEposta) {
            const anahtar = ["gecikme", "eposta", malikEposta, kiraciEposta, odemeNo].join("|");
            if (gonderilmis.has(anahtar)) ozet.atlanan += 1;
            else {
              const sonuc = await epostaGonder({
                kime: malikEposta,
                konu,
                html: epostaSablonu("Gecikmiş kira ödemesi", govdeSatirlari)
              });
              gonderilmis.add(anahtar);
              sonuc.ok ? (ozet.gonderilen += 1) : (ozet.hata += 1);
              await kaydet({
                owner_id: sahip,
                tur: "gecikme",
                kanal: "eposta",
                alici_tur: "malik",
                alici: malikEposta,
                tenant_email: kiraciEposta,
                payment_id: odemeNo,
                durum: sonuc.ok ? "gonderildi" : "hata",
                hata: sonuc.hata || null
              });
              if (!sonuc.ok) ozet.ayrinti.push({ sahip, hata: "malik e-posta: " + sonuc.hata });
            }
          }

          if (whatsappAcik && malikTelefon && ayar.sablonGecikme) {
            const anahtar = ["gecikme", "whatsapp", malikTelefon, kiraciEposta, odemeNo].join("|");
            if (gonderilmis.has(anahtar)) ozet.atlanan += 1;
            else {
              const sonuc = await whatsappGonder({
                kime: malikTelefon,
                sablon: ayar.sablonGecikme,
                dil: ayar.waDilKodu,
                parametreler: [kiraciAdi, paraYaz(kalan), String(gecikmeGun)]
              });
              gonderilmis.add(anahtar);
              sonuc.ok ? (ozet.gonderilen += 1) : (ozet.hata += 1);
              await kaydet({
                owner_id: sahip,
                tur: "gecikme",
                kanal: "whatsapp",
                alici_tur: "malik",
                alici: malikTelefon,
                tenant_email: kiraciEposta,
                payment_id: odemeNo,
                durum: sonuc.ok ? "gonderildi" : "hata",
                hata: sonuc.hata || null
              });
              if (!sonuc.ok) ozet.ayrinti.push({ sahip, hata: "malik whatsapp: " + sonuc.hata });
            }
          }
        }
      }
    }
  }

  return json(ozet);
});
