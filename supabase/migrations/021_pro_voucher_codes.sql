-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRATION 021: KODE AKSES PREMIUM BERJANGKA WAKTU
-- File: supabase/migrations/021_pro_voucher_codes.sql
--   1. Tabel `public.pro_voucher_codes` (ketat Admin-only RLS) untuk membuat kode
--      pembuka akses PRO dengan durasi fleksibel per Hari (`days`) atau Bulan (`months`)
--   2. Tabel `public.pro_voucher_redemptions` untuk log penukaran kode oleh learner
--   3. RPC `public.redeem_pro_voucher_code(p_code text)` (atomic SECURITY DEFINER)
--      untuk menukar kode secara aman & otomatis mengaktifkan/memperpanjang PRO
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor.
-- =============================================================================

-- 1) Tabel Master Kode Akses Premium (Admin-only)
CREATE TABLE IF NOT EXISTS public.pro_voucher_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text,
  duration_value integer NOT NULL CHECK (duration_value >= 1 AND duration_value <= 3650),
  duration_unit text NOT NULL DEFAULT 'days' CHECK (duration_unit IN ('days', 'months')),
  package_id text NOT NULL DEFAULT 'pkg-pro',
  package_name text NOT NULL DEFAULT 'Creator Academy Plan',
  max_uses integer CHECK (max_uses IS NULL OR max_uses >= 1),
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  valid_until timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pro_voucher_codes_code_norm
  ON public.pro_voucher_codes ((upper(replace(trim(code), ' ', '-'))));

CREATE INDEX IF NOT EXISTS idx_pro_voucher_codes_active
  ON public.pro_voucher_codes (is_active, created_at DESC);

-- 2) Tabel Riwayat Penukaran Kode Akses Premium
CREATE TABLE IF NOT EXISTS public.pro_voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.pro_voucher_codes(id) ON DELETE CASCADE,
  code text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text,
  duration_value integer NOT NULL,
  duration_unit text NOT NULL,
  granted_days integer NOT NULL,
  package_id text,
  package_name text,
  previous_expires_at timestamptz,
  new_expires_at timestamptz NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voucher_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pro_voucher_redemptions_redeemed_at
  ON public.pro_voucher_redemptions (redeemed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pro_voucher_redemptions_voucher_email
  ON public.pro_voucher_redemptions (voucher_id, lower(trim(user_email)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_pro_voucher_redemptions_code_user
  ON public.pro_voucher_redemptions ((upper(replace(trim(code), ' ', '-'))), user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pro_voucher_redemptions_code_email
  ON public.pro_voucher_redemptions ((upper(replace(trim(code), ' ', '-'))), lower(trim(user_email)));

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS public.user_subscriptions
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'Free';

-- 3) Keamanan Row Level Security (RLS)
ALTER TABLE public.pro_voucher_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_voucher_redemptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pro_voucher_codes, public.pro_voucher_redemptions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pro_voucher_codes, public.pro_voucher_redemptions TO authenticated, service_role;

DROP POLICY IF EXISTS "pro_voucher_codes_admin_only" ON public.pro_voucher_codes;
CREATE POLICY "pro_voucher_codes_admin_only"
  ON public.pro_voucher_codes
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pro_voucher_redemptions_admin_all" ON public.pro_voucher_redemptions;
CREATE POLICY "pro_voucher_redemptions_admin_all"
  ON public.pro_voucher_redemptions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pro_voucher_redemptions_own_select" ON public.pro_voucher_redemptions;
CREATE POLICY "pro_voucher_redemptions_own_select"
  ON public.pro_voucher_redemptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4) RPC Atomic Redeem Kode Akses Premium
CREATE OR REPLACE FUNCTION public.redeem_pro_voucher_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_code text := upper(replace(trim(coalesce(p_code, '')), ' ', '-'));
  v_voucher public.pro_voucher_codes%ROWTYPE;
  v_email text := '';
  v_full_name text := '';
  v_prof_tier text := 'free';
  v_prof_started timestamptz;
  v_prof_expires timestamptz;
  v_today_wib date := (timezone('Asia/Jakarta', now()))::date;
  v_prev_expires_date date;
  v_is_currently_pro boolean := false;
  v_extended boolean := false;
  v_base_date date;
  v_new_due_date date;
  v_granted_days integer := 0;
  v_start_ts timestamptz;
  v_expires_ts timestamptz;
  v_start_date date;
  v_billing_cycle text;
  v_username text;
  v_pkg_id text;
  v_pkg_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  IF v_clean_code = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Kode akses premium tidak boleh kosong.'
    );
  END IF;

  -- Kunci baris kode agar validasi kuota & anti-duplikasi berlangsung atomik
  SELECT *
  INTO v_voucher
  FROM public.pro_voucher_codes
  WHERE upper(replace(trim(code), ' ', '-')) = v_clean_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Kode akses premium tidak ditemukan. Periksa kembali penulisan kode.'
    );
  END IF;

  IF NOT v_voucher.is_active THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Kode akses premium ini sedang dinonaktifkan oleh Admin.'
    );
  END IF;

  IF v_voucher.valid_until IS NOT NULL AND v_voucher.valid_until < now() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Masa berlaku penukaran kode akses premium ini sudah berakhir.'
    );
  END IF;

  IF v_voucher.max_uses IS NOT NULL AND v_voucher.used_count >= v_voucher.max_uses THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Kuota penggunaan kode akses premium ini sudah habis.'
    );
  END IF;

  -- Kunci profil learner agar request bersamaan dari akun yang sama terserialisasi
  SELECT
    coalesce(nullif(trim(email), ''), nullif(trim(auth.jwt()->>'email'), ''), ''),
    coalesce(nullif(trim(full_name), ''), split_part(coalesce(email, auth.jwt()->>'email', 'Learner'), '@', 1)),
    coalesce(nullif(trim(subscription_tier), ''), 'free'),
    pro_started_at,
    pro_expires_at
  INTO v_email, v_full_name, v_prof_tier, v_prof_started, v_prof_expires
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF coalesce(v_email, '') = '' THEN
    v_email := coalesce(nullif(trim(auth.jwt()->>'email'), ''), '');
  END IF;
  IF coalesce(v_full_name, '') = '' THEN
    v_full_name := coalesce(split_part(v_email, '@', 1), 'Learner');
  END IF;

  -- Cek ketat 1× per akun (berdasarkan voucher_id/kode maupun user_id/email)
  IF EXISTS (
    SELECT 1
    FROM public.pro_voucher_redemptions r
    WHERE (
      r.voucher_id = v_voucher.id
      OR upper(replace(trim(r.code), ' ', '-')) = v_clean_code
    )
    AND (
      r.user_id = v_uid
      OR (coalesce(v_email, '') <> '' AND lower(trim(r.user_email)) = lower(trim(v_email)))
    )
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Kode akses premium ini hanya bisa digunakan 1× per akun. Anda sudah pernah menukarkannya sebelumnya.'
    );
  END IF;

  IF v_prof_expires IS NOT NULL THEN
    v_prev_expires_date := (timezone('Asia/Jakarta', v_prof_expires))::date;
  ELSE
    v_prev_expires_date := NULL;
  END IF;

  v_is_currently_pro := lower(coalesce(v_prof_tier, 'free')) = 'pro'
    AND (v_prev_expires_date IS NULL OR v_prev_expires_date >= v_today_wib);

  IF v_is_currently_pro AND v_prev_expires_date IS NOT NULL THEN
    v_base_date := v_prev_expires_date;
    v_extended := true;
  ELSE
    v_base_date := v_today_wib;
    v_extended := false;
  END IF;

  IF v_extended AND v_prof_started IS NOT NULL THEN
    v_start_ts := v_prof_started;
  ELSE
    v_start_ts := (v_today_wib::timestamp AT TIME ZONE 'Asia/Jakarta');
  END IF;
  v_start_date := (timezone('Asia/Jakarta', v_start_ts))::date;

  -- Hitung tanggal berakhir berdasarkan hari atau bulan kalender penuh
  IF v_voucher.duration_unit = 'months' THEN
    v_new_due_date := (v_base_date + make_interval(months => v_voucher.duration_value))::date;
  ELSE
    v_new_due_date := v_base_date + v_voucher.duration_value;
  END IF;

  v_granted_days := GREATEST(1, v_new_due_date - v_base_date);
  v_expires_ts := ((v_new_due_date::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta');
  v_billing_cycle := v_voucher.duration_value::text ||
    (CASE WHEN v_voucher.duration_unit = 'months' THEN 'm_voucher' ELSE 'd_voucher' END);

  v_pkg_id := coalesce(nullif(trim(v_voucher.package_id), ''), 'pkg-pro');
  v_pkg_name := coalesce(nullif(trim(v_voucher.package_name), ''), 'Creator Academy Plan');

  -- Catat penukaran TERLEBIH DAHULU agar unique constraint langsung menolak klik ganda
  BEGIN
    INSERT INTO public.pro_voucher_redemptions (
      voucher_id,
      code,
      user_id,
      user_email,
      user_name,
      duration_value,
      duration_unit,
      granted_days,
      package_id,
      package_name,
      previous_expires_at,
      new_expires_at
    ) VALUES (
      v_voucher.id,
      v_voucher.code,
      v_uid,
      coalesce(nullif(lower(trim(v_email)), ''), v_uid::text),
      v_full_name,
      v_voucher.duration_value,
      v_voucher.duration_unit,
      v_granted_days,
      v_pkg_id,
      v_pkg_name,
      v_prof_expires,
      v_expires_ts
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Kode akses premium ini hanya bisa digunakan 1× per akun. Anda sudah pernah menukarkannya sebelumnya.'
    );
  END;

  -- Izinkan pembaruan kolom sensitif dari trigger protect_profiles_sensitive_fields()
  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET
    subscription_tier = 'pro',
    pro_started_at = v_start_ts,
    pro_expires_at = v_expires_ts,
    pro_package_id = v_pkg_id,
    pro_package_name = v_pkg_name,
    pro_billing_cycle = v_billing_cycle,
    updated_at = now()
  WHERE id = v_uid;

  IF NOT FOUND AND coalesce(v_email, '') <> '' THEN
    UPDATE public.profiles
    SET
      subscription_tier = 'pro',
      pro_started_at = v_start_ts,
      pro_expires_at = v_expires_ts,
      pro_package_id = v_pkg_id,
      pro_package_name = v_pkg_name,
      pro_billing_cycle = v_billing_cycle,
      updated_at = now()
    WHERE lower(email) = lower(v_email);
  END IF;

  -- Sinkronkan `user_profiles.perks` & `user_subscriptions` bila tersedia
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    UPDATE public.user_profiles
    SET
      perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object(
        'is_pro', true,
        'pro_started_at', v_start_ts,
        'pro_expires_at', v_expires_ts,
        'pro_package_name', v_pkg_name,
        'pro_package_id', v_pkg_id,
        'pro_billing_cycle', v_billing_cycle
      ),
      updated_at = timezone('utc', now())
    WHERE user_id = v_uid
       OR (coalesce(v_email, '') <> '' AND lower(email) = lower(v_email));

    SELECT username
    INTO v_username
    FROM public.user_profiles
    WHERE user_id = v_uid
       OR (coalesce(v_email, '') <> '' AND lower(email) = lower(v_email))
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (
      username,
      plan_tier,
      status,
      started_at,
      due_at,
      payment_method,
      renewal_status,
      updated_at
    ) VALUES (
      v_username,
      'PRO',
      'aktif',
      v_start_date,
      v_new_due_date,
      'voucher: ' || v_voucher.code,
      'siap diperpanjang',
      timezone('utc', now())
    )
    ON CONFLICT (username) DO UPDATE SET
      plan_tier = 'PRO',
      status = 'aktif',
      started_at = EXCLUDED.started_at,
      due_at = EXCLUDED.due_at,
      payment_method = EXCLUDED.payment_method,
      renewal_status = EXCLUDED.renewal_status,
      updated_at = timezone('utc', now());
  END IF;

  UPDATE public.pro_voucher_codes
  SET
    used_count = used_count + 1,
    updated_at = now()
  WHERE id = v_voucher.id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_voucher.code,
    'duration_value', v_voucher.duration_value,
    'duration_unit', v_voucher.duration_unit,
    'granted_days', v_granted_days,
    'extended', v_extended,
    'package_id', v_pkg_id,
    'package_name', v_pkg_name,
    'billing_cycle', v_billing_cycle,
    'pro_started_at', v_start_ts,
    'pro_expires_at', v_expires_ts,
    'due_date', to_char(v_new_due_date, 'YYYY-MM-DD')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_pro_voucher_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_pro_voucher_code(text) TO authenticated;
