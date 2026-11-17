-- ============================================================================
-- 005_profile_header_banner.sql
-- Menambahkan kolom header_url pada public.profiles dan public.user_profiles
-- untuk menyimpan pilihan header banner (preset ID atau custom image URL/data).
-- Jalankan di Supabase SQL Editor (aman dijalankan berulang / idempotent).
-- ============================================================================

-- 1. Tambahkan kolom header_url pada public.profiles & public.user_profiles
alter table if exists public.profiles
  add column if not exists header_url text default 'cosmic';

alter table if exists public.user_profiles
  add column if not exists header_url text default 'cosmic';

-- 2. Pastikan RLS mengizinkan user membaca & mengupdate header_url miliknya
alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

alter table if exists public.user_profiles enable row level security;

drop policy if exists "user_profiles_public_all" on public.user_profiles;
create policy "user_profiles_public_all"
  on public.user_profiles for all
  using (true)
  with check (true);
