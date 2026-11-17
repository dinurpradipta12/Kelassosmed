-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRATION 003: CLEAN EMPTY STATE & LEARNER SYNC
-- File: supabase/migrations/003_clean_reset_and_dev_admin.sql
-- Jalankan SQL ini di Supabase SQL Editor untuk:
-- 1. Membuka akses baca public.profiles agar Admin Studio dapat membaca semua learner terdaftar
-- 2. Menyinkronkan kembali semua akun learner yang sudah mendaftar di auth.users ke public.profiles & public.user_profiles
-- 3. Mengaktifkan akun Dev Admin utama (role = 'admin')
-- =============================================================================

-- 1. Pastikan kolom role ada pada user_profiles
alter table if exists public.user_profiles
  add column if not exists role text not null default 'learner'
  check (role in ('admin', 'mentor', 'learner'));

-- 2. Buka RLS baca pada public.profiles & public.user_profiles agar Admin Directory selalu bisa membaca daftar learner
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "user_profiles_public_all" on public.user_profiles;
create policy "user_profiles_public_all"
  on public.user_profiles for all
  to anon, authenticated
  using (true)
  with check (true);

-- 3. Sinkronkan (Backfill) semua akun yang sudah terdaftar di auth.users ke public.profiles & public.user_profiles
insert into public.profiles (id, full_name, email, avatar_url, role, job_title, total_points)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
  u.email,
  u.raw_user_meta_data->>'avatar_url',
  case
    when lower(u.email) in ('dinurm.pradipta@gmail.com', 'contact.dinurpradipta@gmail.com', 'dinur@ruangsosmed.id', 'admin@ruangsosmed.id')
      then 'admin'::public.user_role
    when (u.raw_user_meta_data->>'role') in ('admin', 'mentor', 'learner')
      then (u.raw_user_meta_data->>'role')::public.user_role
    else 'learner'::public.user_role
  end,
  coalesce(nullif(u.raw_user_meta_data->>'job_title', ''), 'Social Media Specialist'),
  0
from auth.users u
where u.email is not null
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role;

insert into public.user_profiles (username, name, email, role, job_title, joined_at, updated_at)
select
  lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g')) || '_' || substr(u.id::text, 1, 4),
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
  u.email,
  case
    when lower(u.email) in ('dinurm.pradipta@gmail.com', 'contact.dinurpradipta@gmail.com', 'dinur@ruangsosmed.id', 'admin@ruangsosmed.id')
      then 'admin'
    else 'learner'
  end,
  coalesce(nullif(u.raw_user_meta_data->>'job_title', ''), 'Social Media Specialist'),
  current_date,
  timezone('utc', now())
from auth.users u
where u.email is not null
  and not exists (
    select 1 from public.user_profiles up where lower(up.email) = lower(u.email)
  )
on conflict (username) do nothing;

-- 4. Pastikan Akun Dev Admin Utama Terdaftar sebagai Admin
insert into public.user_profiles (
  username,
  name,
  email,
  role,
  job_title,
  joined_at,
  updated_at
)
values (
  'dinur',
  'Dinur M. Pradipta',
  'dinurm.pradipta@gmail.com',
  'admin',
  'Founder & Dev Admin',
  current_date,
  timezone('utc', now())
)
on conflict (username) do update set
  name = excluded.name,
  email = excluded.email,
  role = 'admin',
  job_title = excluded.job_title,
  updated_at = timezone('utc', now());

