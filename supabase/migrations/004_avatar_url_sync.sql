-- ============================================================================
-- 004_avatar_url_sync.sql
-- Sinkronisasi kolom avatar_url, full_name, dan user_id pada public.user_profiles
-- serta memastikan RLS public.profiles & public.user_profiles mendukung update avatar.
-- Jalankan di Supabase SQL Editor (aman dijalankan berulang / idempotent).
-- ============================================================================

-- 1. Pastikan kolom user_id, full_name, dan avatar_url ada pada public.user_profiles
alter table if exists public.user_profiles
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists full_name text,
  add column if not exists avatar_url text;

-- 2. Backfill user_id & full_name pada public.user_profiles dari auth.users
update public.user_profiles up
set
  user_id = u.id,
  full_name = coalesce(up.full_name, up.name)
from auth.users u
where lower(up.email) = lower(u.email)
  and (up.user_id is null or up.full_name is null);

-- 3. Sinkronkan avatar_url antara public.profiles dan public.user_profiles
update public.user_profiles up
set avatar_url = coalesce(up.avatar_url, up.avatar_path, p.avatar_url)
from public.profiles p
where lower(up.email) = lower(p.email)
  and up.avatar_url is null
  and (up.avatar_path is not null or p.avatar_url is not null);

-- 4. Pastikan index pada user_profiles(user_id) untuk query update cepat
create index if not exists idx_user_profiles_user_id
  on public.user_profiles (user_id);

-- 5. Pastikan RLS public.profiles mengizinkan user membaca & mengupdate profilnya sendiri
alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. Pastikan RLS public.user_profiles mengizinkan baca & update
alter table if exists public.user_profiles enable row level security;

drop policy if exists "user_profiles_public_all" on public.user_profiles;
create policy "user_profiles_public_all"
  on public.user_profiles for all
  using (true)
  with check (true);
