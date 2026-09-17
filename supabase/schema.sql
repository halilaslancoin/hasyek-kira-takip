-- HasYek Kira Takip — kullanıcı bazlı veri ve satır düzeyi güvenlik (RLS)
-- Supabase Dashboard -> SQL Editor'de bir kez çalıştırılır.
--
-- Bu dosya uygulamanın beklediği tabloları kurar:
--   user_data     : her kullanıcının yalnızca kendi satırlarını gördüğü anahtar/değer deposu
--   profiles      : kullanıcı rolü (owner / tenant)
--   tenant_access : malikin yayınladığı kiracı görünümü; kiracı yalnızca kendi e-postasına ait kaydı okur
--
-- Not: eski paylaşılan `app_data` tablosu artık kullanılmıyor; dosyanın sonunda
-- onu nasıl taşıyacağınız (veya sileceğiniz) açıklanıyor.

-- 1) Kullanıcı bazlı anahtar/değer deposu ------------------------------------
create table if not exists public.user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

-- anon rolü hiçbir şey yapamaz; yalnızca giriş yapmış kullanıcılar erişir.
revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;

drop policy if exists "kendi verisi" on public.user_data;
create policy "kendi verisi" on public.user_data
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) Profiller: rol bilgisi ---------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'tenant')),
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists "kendi profili" on public.profiles;
create policy "kendi profili" on public.profiles
  for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3) Kiracı görünümü: malik yayınlar, kiracı kendi e-postasıyla okur ------------
create table if not exists public.tenant_access (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tenant_email text not null,
  tenant_name text,
  tenant_phone text,
  property_label text,
  rent_amount numeric,
  start_date date,
  end_date date,
  payments jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  bildirim_ayarlari jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Tablo daha önce kurulduysa yeni kolonlar idempotent eklenir.
alter table public.tenant_access add column if not exists tenant_phone text;
alter table public.tenant_access add column if not exists notes jsonb not null default '[]'::jsonb;
alter table public.tenant_access add column if not exists bildirim_ayarlari jsonb not null default '{}'::jsonb;

create index if not exists tenant_access_email_idx
  on public.tenant_access (lower(tenant_email));

alter table public.tenant_access enable row level security;

revoke all on public.tenant_access from anon;
grant select, insert, update, delete on public.tenant_access to authenticated;

-- Malik (kaydı oluşturan) yalnızca kendi yayınladığı satırları yönetir.
drop policy if exists "malik yonetir" on public.tenant_access;
create policy "malik yonetir" on public.tenant_access
  for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Kiracı yalnızca kendi e-postasına yayınlanmış satırı OKUYABİLİR.
drop policy if exists "kiraci okur" on public.tenant_access;
create policy "kiraci okur" on public.tenant_access
  for select
  to authenticated
  using (lower(tenant_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- 4) Eski paylaşılan tablo ----------------------------------------------------
-- `app_data` (tek kolonlu anahtar/değer) artık kullanılmıyor. İçindeki kayıtları
-- bir kullanıcıya taşımak isterseniz aşağıdaki bloktaki e-postayı kendi
-- hesabınızla değiştirip çalıştırın:
--
-- insert into public.user_data (user_id, key, value)
-- select u.id, a.key, a.value
-- from public.app_data a
-- join auth.users u on lower(u.email) = lower('owner@example.com')
-- on conflict (user_id, key) do update set value = excluded.value, updated_at = now();
--
-- Taşıma bittikten sonra eski tabloyu kaldırabilirsiniz:
-- drop table if exists public.app_data;
