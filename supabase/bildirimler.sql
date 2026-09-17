-- HasYek Kira Takip — bildirim kayıtları ve günlük zamanlayıcı
-- Supabase Dashboard -> SQL Editor'de bir kez çalıştırılır.
-- (Önce supabase/schema.sql çalıştırılmış olmalıdır.)

-- 1) Bildirim kayıtları --------------------------------------------------------
-- Aynı gün içinde aynı bildirimin iki kez gönderilmesini engelleyen tablo.
create table if not exists public.bildirim_kayitlari (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  tur text not null,                 -- 'vade' | 'gecikme'
  kanal text not null,               -- 'eposta' | 'whatsapp'
  alici_tur text not null default 'kiraci',  -- 'kiraci' | 'malik'
  alici text not null default '',    -- e-posta adresi veya telefon
  tenant_email text not null default '',
  payment_id text not null default '',
  gonderim_gun date not null default current_date,
  durum text not null default 'gonderildi',  -- 'gonderildi' | 'hata'
  hata text,
  created_at timestamptz not null default now()
);

-- Günde bir kez: aynı ödeme + kanal + alıcı + tür için tekrar yazılamaz.
create unique index if not exists bildirim_tekil_idx
  on public.bildirim_kayitlari
  (owner_id, tur, kanal, alici, tenant_email, payment_id, gonderim_gun);

create index if not exists bildirim_tarih_idx
  on public.bildirim_kayitlari (owner_id, created_at desc);

alter table public.bildirim_kayitlari enable row level security;

-- Kiracı bazlı bildirim ayarları tenant_access üzerinde tutulur.
alter table public.tenant_access
  add column if not exists bildirim_ayarlari jsonb not null default '{}'::jsonb;

-- Tablo daha önce kurulduysa "kime gitti" kolonu idempotent eklenir.
-- Eski satırlarda bu bilgi yok: 'vade' kiracıya, 'gecikme' malike gitti.
alter table public.bildirim_kayitlari add column if not exists alici_tur text;
update public.bildirim_kayitlari
   set alici_tur = case when tur = 'gecikme' then 'malik' else 'kiraci' end
 where alici_tur is null;
alter table public.bildirim_kayitlari alter column alici_tur set default 'kiraci';
alter table public.bildirim_kayitlari alter column alici_tur set not null;

revoke all on public.bildirim_kayitlari from anon;
-- Kayıtları yalnızca sunucu tarafı (service role) yazar; kullanıcı kendininkini okur.
grant select on public.bildirim_kayitlari to authenticated;

drop policy if exists "kendi bildirimleri" on public.bildirim_kayitlari;
create policy "kendi bildirimleri" on public.bildirim_kayitlari
  for select
  to authenticated
  using (auth.uid() = owner_id);

-- Kiracı yalnızca KENDİSİNE gönderilen bildirim kayıtlarını görür
-- (malike giden gecikme bildirimleri dahil edilmez; alici_tur bunu ayırır).
drop policy if exists "kiraci kendi bildirimini gorur" on public.bildirim_kayitlari;
create policy "kiraci kendi bildirimini gorur" on public.bildirim_kayitlari
  for select
  to authenticated
  using (
    alici_tur = 'kiraci'
    and lower(tenant_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- 2) Saatlik zamanlayıcı (pg_cron + pg_net) -----------------------------------
-- Dashboard -> Database -> Extensions bölümünden pg_cron ve pg_net'i etkinleştirin.
--
-- Neden saatlik: gönderim saati kiracı bazında ayarlanabiliyor. Zamanlayıcı her
-- saat başı çalışır, fonksiyon da yalnızca saati gelmiş kiracılara gönderir ve
-- aynı gün içinde aynı bildirimi ikinci kez göndermez (bildirim_kayitlari).
-- Kurulumdan sonraki ilk saat içinde o günün bildirimleri gönderilir.
--
-- Aşağıdaki bloğu kendi değerlerinizle düzenleyip çalıştırın:
--   <PROJE-REF>   : Supabase proje referansı (URL'in başındaki kod)
--   <CRON-SECRET> : Edge Function'ın CRON_SECRET gizli değişkeniyle aynı değer
--
-- select cron.schedule(
--   'saatlik-kira-bildirimi',
--   '0 * * * *',
--   $$
--     select net.http_post(
--       url := 'https://<PROJE-REF>.supabase.co/functions/v1/gunluk-bildirim',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'x-bildirim-anahtari', '<CRON-SECRET>'
--       ),
--       body := '{}'::jsonb
--     );
--   $$
-- );
--
-- Kurulu işi görmek için:  select * from cron.job;
-- İşi kaldırmak için:      select cron.unschedule('saatlik-kira-bildirimi');
-- Eski günlük iş kuruluysa: select cron.unschedule('gunluk-kira-bildirimi');
--
-- Not: gönderim saati Türkiye saatine göre değerlendirilir (UTC+3).

-- 3) Edge Function gizli değişkenleri ------------------------------------------
-- Supabase CLI ile (proje klasöründe) bir kez ayarlanır:
--
--   supabase secrets set \
--     CRON_SECRET="uzun-rastgele-bir-anahtar" \
--     RESEND_API_KEY="re_..." \
--     BILDIRIM_GONDEREN="HasYek Kira Takip <bildirim@sizin-domain.com>" \
--     WHATSAPP_TOKEN="EAAG..." \
--     WHATSAPP_PHONE_ID="1234567890"
--
-- Not: RESEND_API_KEY ve WhatsApp anahtarları burada değil, yalnızca sunucuda
-- tutulur; uygulama paketine hiçbir zaman girmez.
