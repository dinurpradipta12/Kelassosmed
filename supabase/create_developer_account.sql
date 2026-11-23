-- =============================================================================
-- RUANG SOSMED 2.0 LMS — SEED AKUN DEVELOPER & ADMIN AKTIF (FIXED FOR SUPABASE GOTRUE)
-- File: supabase/create_developer_account.sql
-- 
-- KREDENSIAL:
--   Username : arunika
--   Password : Ar4925
--   Email    : contact.dinurpradipta@gmail.com
--   Role     : admin (Hak Akses Penuh: Developer + Admin LMS)
--
-- CARA PENGGUNAAN:
-- 1. Buka Supabase Dashboard > Project Anda (wdmfxlrdyqxnycbebwpv)
-- 2. Klik menu "SQL Editor" di bilah kiri
-- 3. Paste seluruh skrip di bawah ini dan klik tombol "Run" (hijau)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := 'contact.dinurpradipta@gmail.com';
  v_username text := 'arunika';
  v_password text := 'Ar4925';
  v_encrypted_pw text;
BEGIN
  -- 1. Bersihkan entri akun lama yang belum sinkron atau rusak di auth.identities & auth.users
  DELETE FROM auth.identities WHERE email = v_email OR identity_data->>'email' = v_email;
  DELETE FROM auth.users WHERE email = v_email;

  -- 2. Generate bcrypt hash untuk kata sandi
  v_encrypted_pw := crypt(v_password, gen_salt('bf'));

  -- 3. Insert akun ke auth.users dengan status email terkonfirmasi langsung
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_super_admin,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', 'Arunika Developer',
      'username', v_username,
      'role', 'admin',
      'job_title', 'Lead Developer & Admin',
      'subscription_tier', 'pro'
    ),
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    false
  );

  -- 4. WAJIB: Insert ke auth.identities agar GoTrue Auth bisa memetakan login password & token
  -- Menggunakan block exception agar kompatibel dengan seluruh versi schema Supabase
  BEGIN
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id::text,
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    );
  EXCEPTION WHEN undefined_column THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id::text,
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    );
  END;

  -- 5. Sinkronkan ke tabel public.profiles (Core LMS)
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    role,
    job_title,
    subscription_tier,
    total_points,
    created_at
  ) VALUES (
    v_user_id,
    'Arunika Developer',
    v_email,
    null,
    'admin'::public.user_role,
    'Lead Developer & Admin',
    'pro',
    9999,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'Arunika Developer',
    email = v_email,
    role = 'admin'::public.user_role,
    job_title = 'Lead Developer & Admin',
    subscription_tier = 'pro';

  -- 6. Sinkronkan ke tabel public.user_profiles (rs-learning-26 Module)
  INSERT INTO public.user_profiles (
    username,
    name,
    email,
    job_title,
    joined_at,
    checkin_streak
  ) VALUES (
    v_username,
    'Arunika Developer',
    v_email,
    'Lead Developer & Admin',
    current_date,
    1
  )
  ON CONFLICT (username) DO UPDATE SET
    name = 'Arunika Developer',
    email = v_email,
    job_title = 'Lead Developer & Admin';

  -- 7. Aktifkan Membership PRO di public.user_subscriptions
  INSERT INTO public.user_subscriptions (
    username,
    plan_tier,
    status,
    started_at,
    due_at,
    payment_method,
    renewal_status
  ) VALUES (
    v_username,
    'PRO',
    'aktif',
    current_date,
    current_date + interval '365 days',
    'developer grant',
    'aktif seumur hidup'
  )
  ON CONFLICT (username) DO UPDATE SET
    plan_tier = 'PRO',
    status = 'aktif',
    due_at = current_date + interval '365 days';

  RAISE NOTICE 'SUCCESS: Akun Developer arunika (%) berhasil disinkronkan ke Supabase Auth & Tables!', v_email;
END $$;
