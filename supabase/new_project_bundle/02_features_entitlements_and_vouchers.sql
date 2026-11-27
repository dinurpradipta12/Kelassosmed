-- =============================================================================
-- RUANG SOSMED 2.0 LMS — FRESH PROJECT SQL BUNDLE
-- BAGIAN 2/3 — Optimasi Egress, Langganan, Kode Akses, Trial 3/7 Hari, Telegram & Voucher PRO (012 - 021)
-- Target Project: wdmfxlrdyqxnycbebwpv
-- Jalankan file ini di Supabase SQL Editor secara berurutan (01 -> 02 -> 03).
-- =============================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 012_egress_optimization_realtime_storage.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — SUPABASE EGRESS & LOG INGESTION OPTIMIZATION
-- File: supabase/migrations/012_egress_optimization_realtime_storage.sql
-- Tujuan:
--   1. Mengaktifkan public CDN Storage buckets (`cacheControl: 31536000`) & RLS upload aman
--   2. Mengaktifkan Supabase Realtime publication agar UI tidak perlu polling setiap 3 detik
--   3. Menambahkan RPC `get_workspace_sync_watermark()` (~180 byte, zero PII)
--      sebagai gate sebelum full table fetch
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. STORAGE BUCKETS & CACHED PUBLIC READ + LEAST-PRIVILEGE UPLOAD POLICIES
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'ruang-sosmed-media',
    'ruang-sosmed-media',
    true,
    52428800,
    ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm']
  ),
  (
    'ruang-sosmed-avatars',
    'ruang-sosmed-avatars',
    true,
    10485760,
    ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']
  ),
  (
    'ruang-sosmed-attachments',
    'ruang-sosmed-attachments',
    true,
    26214400,
    ARRAY[
      'image/webp',
      'image/png',
      'image/jpeg',
      'application/pdf',
      'application/zip',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "storage_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "storage_public_read_assets" ON storage.objects;
DROP POLICY IF EXISTS "storage_mentor_admin_all" ON storage.objects;
DROP POLICY IF EXISTS "storage_staff_manage_all" ON storage.objects;
DROP POLICY IF EXISTS "storage_learner_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_learner_update_own" ON storage.objects;

CREATE POLICY "storage_public_read_assets"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id IN (
      'ruang-sosmed-media',
      'ruang-sosmed-avatars',
      'ruang-sosmed-attachments',
      'lesson-assets',
      'profile-avatars'
    )
  );

CREATE POLICY "storage_staff_manage_all"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id IN (
      'ruang-sosmed-media',
      'ruang-sosmed-avatars',
      'ruang-sosmed-attachments',
      'lesson-assets',
      'profile-avatars'
    )
    AND public.is_admin_or_mentor()
  )
  WITH CHECK (
    bucket_id IN (
      'ruang-sosmed-media',
      'ruang-sosmed-avatars',
      'ruang-sosmed-attachments',
      'lesson-assets',
      'profile-avatars'
    )
    AND public.is_admin_or_mentor()
  );

CREATE POLICY "storage_learner_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('ruang-sosmed-avatars', 'profile-avatars', 'ruang-sosmed-attachments')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_learner_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('ruang-sosmed-avatars', 'profile-avatars', 'ruang-sosmed-attachments')
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id IN ('ruang-sosmed-avatars', 'profile-avatars', 'ruang-sosmed-attachments')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 2. AKTIFKAN SUPABASE REALTIME PUBLICATION AGAR TIDAK PERLU POLLING 3 DETIK
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'contents',
    'profiles',
    'user_profiles',
    'pro_upgrade_requests',
    'mentor_inbox_threads',
    'mentor_reported_issues',
    'learner_pro_settings'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_table IN ARRAY v_tables LOOP
      IF to_regclass('public.' || v_table) IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime'
             AND schemaname = 'public'
             AND tablename = v_table
         ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
      END IF;
    END LOOP;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. LIGHTWEIGHT WATERMARK RPC (~180 BYTE PAYLOAD, ZERO PII)
--    Client cek RPC ini dulu; hanya pull full data jika timestamp / count berubah
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_workspace_sync_watermark()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_contents_ts timestamptz;
  v_contents_count bigint := 0;
  v_own_profile_role text;
  v_own_profile_tier text;
  v_own_profile_points integer := 0;
  v_own_avatar text;
  v_user_profile_ts timestamptz;
  v_inbox_ts timestamptz;
  v_issues_ts timestamptz;
  v_pro_settings_ts timestamptz;
  v_all_profiles_count bigint := 0;
  v_pro_requests_pending bigint := 0;
  v_admin_notifs_ts timestamptz;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT
      role::text,
      subscription_tier,
      total_points,
      avatar_url
    INTO
      v_own_profile_role,
      v_own_profile_tier,
      v_own_profile_points,
      v_own_avatar
    FROM public.profiles
    WHERE id = v_uid;

    v_is_staff := COALESCE(v_own_profile_role, '') IN ('admin', 'mentor');

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      SELECT MAX(updated_at)
      INTO v_user_profile_ts
      FROM public.user_profiles
      WHERE user_id = v_uid
         OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''));
    END IF;
  END IF;

  IF v_is_staff THEN
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents;
  ELSE
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents
    WHERE (
      status = 'published'::public.content_status
      AND title NOT LIKE '__SYSTEM_%'
    )
    OR title IN (
      '__SYSTEM_MAINTENANCE_CONFIG__',
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__'
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
      SELECT MAX(updated_at) INTO v_inbox_ts FROM public.mentor_inbox_threads;
    END IF;
    IF to_regclass('public.mentor_reported_issues') IS NOT NULL THEN
      SELECT MAX(created_at) INTO v_issues_ts FROM public.mentor_reported_issues;
    END IF;
    IF to_regclass('public.learner_pro_settings') IS NOT NULL THEN
      SELECT updated_at INTO v_pro_settings_ts FROM public.learner_pro_settings WHERE id = 'default' LIMIT 1;
    END IF;
  END IF;

  IF v_is_staff THEN
    SELECT COUNT(*) INTO v_all_profiles_count FROM public.profiles;
    IF to_regclass('public.pro_upgrade_requests') IS NOT NULL THEN
      SELECT COUNT(*) INTO v_pro_requests_pending
      FROM public.pro_upgrade_requests
      WHERE status = 'pending';
    END IF;
    SELECT MAX(updated_at)
    INTO v_admin_notifs_ts
    FROM public.contents
    WHERE title = '__SYSTEM_ADMIN_NOTIFICATIONS__';
  END IF;

  RETURN jsonb_build_object(
    'uid', v_uid,
    'staff', v_is_staff,
    'contents_ts', v_contents_ts,
    'contents_count', v_contents_count,
    'own_role', v_own_profile_role,
    'own_tier', v_own_profile_tier,
    'own_points', v_own_profile_points,
    'own_avatar', v_own_avatar,
    'up_ts', v_user_profile_ts,
    'inbox_ts', v_inbox_ts,
    'issues_ts', v_issues_ts,
    'pro_cfg_ts', v_pro_settings_ts,
    'staff_profiles_count', v_all_profiles_count,
    'pro_req_pending', v_pro_requests_pending,
    'admin_notifs_ts', v_admin_notifs_ts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_sync_watermark() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_sync_watermark() TO anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 013_subscription_dates_and_renewal.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — SUBSCRIPTION START/DUE DATES & MANUAL PRO RENEWAL
-- File: supabase/migrations/013_subscription_dates_and_renewal.sql
-- Tujuan:
--   1. Menambahkan kolom pro_started_at, pro_expires_at, dan pro_package_name di public.profiles
--   2. Melindungi kolom tanggal langganan pada trigger protect_profiles_sensitive_fields()
--   3. Backfill data PRO yang sudah ada agar tanggal mulai & jatuh tempo langsung terisi
--   4. Memperbarui RPC admin_set_learner_pro & menambahkan RPC admin_extend_learner_pro
--   5. Memperbarui get_workspace_sync_watermark() & Realtime untuk sinkronisasi instan
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TAMBAH KOLOM TANGGAL BERLANGGANAN & JATUH TEMPO PADA PUBLIC.PROFILES
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS pro_package_name text;

CREATE INDEX IF NOT EXISTS idx_profiles_pro_expires_at
  ON public.profiles (pro_expires_at)
  WHERE subscription_tier = 'pro';

-- -----------------------------------------------------------------------------
-- 2. BACKFILL PRO EXISTING DARI USER_SUBSCRIPTIONS / DEFAULT 30 HARI
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  IF to_regclass('public.user_subscriptions') IS NOT NULL AND to_regclass('public.user_profiles') IS NOT NULL THEN
    UPDATE public.profiles p
    SET
      pro_started_at = COALESCE(
        p.pro_started_at,
        (sub.started_at::timestamp AT TIME ZONE 'Asia/Jakarta'),
        p.created_at,
        now()
      ),
      pro_expires_at = COALESCE(
        p.pro_expires_at,
        ((sub.due_at::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta'),
        COALESCE(p.pro_started_at, p.created_at, now()) + interval '30 days'
      ),
      pro_package_name = COALESCE(NULLIF(p.pro_package_name, ''), 'Learner PRO Monthly')
    FROM public.user_profiles up
    JOIN public.user_subscriptions sub
      ON lower(sub.username) = lower(up.username)
    WHERE lower(p.email) = lower(up.email)
      AND p.subscription_tier = 'pro'
      AND (p.pro_started_at IS NULL OR p.pro_expires_at IS NULL);
  END IF;

  UPDATE public.profiles
  SET
    pro_started_at = COALESCE(pro_started_at, created_at, now()),
    pro_expires_at = COALESCE(pro_expires_at, COALESCE(pro_started_at, created_at, now()) + interval '30 days'),
    pro_package_name = COALESCE(NULLIF(pro_package_name, ''), 'Learner PRO Monthly')
  WHERE subscription_tier = 'pro'
    AND (pro_started_at IS NULL OR pro_expires_at IS NULL);
END $$;

-- -----------------------------------------------------------------------------
-- 3. PROTEKSI KOLOM TANGGAL LANGGANAN AGAR LEARNER TIDAK BISA MENGUBAH SENDIRI
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profiles_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass boolean := (
    current_setting('app.bypass_profile_protection', true) = 'on'
    OR current_user IN ('postgres', 'supabase_admin')
    OR auth.role() = 'service_role'
    OR public.is_admin()
  );
BEGIN
  IF v_bypass THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'learner'::public.user_role;
    NEW.subscription_tier := 'free';
    NEW.total_points := 0;
    NEW.pro_started_at := NULL;
    NEW.pro_expires_at := NULL;
    NEW.pro_package_name := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
       OR NEW.total_points IS DISTINCT FROM OLD.total_points
       OR NEW.pro_started_at IS DISTINCT FROM OLD.pro_started_at
       OR NEW.pro_expires_at IS DISTINCT FROM OLD.pro_expires_at
       OR NEW.pro_package_name IS DISTINCT FROM OLD.pro_package_name THEN
      RAISE EXCEPTION 'Forbidden: only verified admin can modify role, subscription_tier, total_points, or subscription dates';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profiles_sensitive_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_sensitive_fields();

-- -----------------------------------------------------------------------------
-- 4. PERBARUI RPC ADMIN_SET_LEARNER_PRO (MENDUKUNG TANGGAL MULAI & JATUH TEMPO)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_set_learner_pro(text, text, boolean, text, uuid);
DROP FUNCTION IF EXISTS public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer);

CREATE OR REPLACE FUNCTION public.admin_set_learner_pro(
  p_target_email text,
  p_target_name text,
  p_is_pro boolean,
  p_package_name text DEFAULT 'Learner PRO Monthly',
  p_request_id uuid DEFAULT NULL,
  p_started_at date DEFAULT NULL,
  p_due_at date DEFAULT NULL,
  p_duration_days integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_name text := COALESCE(NULLIF(trim(p_target_name), ''), split_part(v_clean_email, '@', 1), 'Learner');
  v_pkg text := COALESCE(NULLIF(trim(p_package_name), ''), 'Learner PRO Monthly');
  v_username text;
  v_start_date date := COALESCE(p_started_at, (now() AT TIME ZONE 'Asia/Jakarta')::date);
  v_due_date date := COALESCE(p_due_at, COALESCE(p_started_at, (now() AT TIME ZONE 'Asia/Jakarta')::date) + GREATEST(1, COALESCE(p_duration_days, 30)));
  v_start_ts timestamptz;
  v_expires_ts timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' THEN
    RETURN false;
  END IF;

  IF v_due_date < v_start_date THEN
    v_due_date := v_start_date + GREATEST(1, COALESCE(p_duration_days, 30));
  END IF;

  v_start_ts := (v_start_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  v_expires_ts := ((v_due_date::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta');

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  IF p_is_pro THEN
    UPDATE public.profiles
    SET
      subscription_tier = 'pro',
      pro_started_at = v_start_ts,
      pro_expires_at = v_expires_ts,
      pro_package_name = v_pkg
    WHERE lower(email) = v_clean_email;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      UPDATE public.user_profiles
      SET
        perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object(
          'is_pro', true,
          'pro_started_at', v_start_ts,
          'pro_expires_at', v_expires_ts,
          'pro_package_name', v_pkg
        ),
        updated_at = timezone('utc', now())
      WHERE lower(email) = v_clean_email;

      SELECT username
      INTO v_username
      FROM public.user_profiles
      WHERE lower(email) = v_clean_email
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;

    IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
      INSERT INTO public.user_subscriptions (
        username, plan_tier, status, started_at, due_at, payment_method, renewal_status, updated_at
      ) VALUES (
        v_username,
        'PRO',
        'aktif',
        v_start_date,
        v_due_date,
        'admin verified',
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
  ELSE
    UPDATE public.profiles
    SET
      subscription_tier = 'free',
      pro_expires_at = NULL
    WHERE lower(email) = v_clean_email;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      UPDATE public.user_profiles
      SET
        perks = (COALESCE(perks, '{}'::jsonb) - 'pro_expires_at') || jsonb_build_object('is_pro', false),
        updated_at = timezone('utc', now())
      WHERE lower(email) = v_clean_email;

      SELECT username
      INTO v_username
      FROM public.user_profiles
      WHERE lower(email) = v_clean_email
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;

    IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
      UPDATE public.user_subscriptions
      SET
        plan_tier = 'Free',
        status = 'nonaktif',
        renewal_status = 'nonaktif',
        updated_at = timezone('utc', now())
      WHERE lower(username) = lower(v_username);
    END IF;
  END IF;

  IF p_request_id IS NOT NULL THEN
    UPDATE public.pro_upgrade_requests
    SET
      status = CASE WHEN p_is_pro THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = p_request_id;
  END IF;

  IF p_is_pro THEN
    PERFORM public._append_admin_notification(
      jsonb_build_object(
        'id', 'notif-pro-active-' || encode(convert_to(v_clean_email || '-' || extract(epoch from now())::text, 'UTF8'), 'hex'),
        'eventType', 'pro_subscribed',
        'title', 'Yuhuu! ⚡ Langganan PRO Aktif',
        'message', format(
          'Yuhuu! %s telah berlangganan dan mengambil paket %s (berlaku s/d %s). Akses fitur eksklusifnya sudah aktif!',
          v_clean_name,
          v_pkg,
          to_char(v_due_date, 'DD Mon YYYY')
        ),
        'userName', v_clean_name,
        'userEmail', v_clean_email,
        'packageName', v_pkg,
        'read', false,
        'createdAt', now()
      )
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. RPC KHUSUS PERPANJANGAN / AKTIVASI MANUAL LANGGANAN PRO OLEH ADMIN
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_extend_learner_pro(
  p_target_email text,
  p_target_name text,
  p_started_at date,
  p_due_at date,
  p_package_name text DEFAULT 'Learner PRO Monthly'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_name text := COALESCE(NULLIF(trim(p_target_name), ''), split_part(v_clean_email, '@', 1), 'Learner');
  v_pkg text := COALESCE(NULLIF(trim(p_package_name), ''), 'Learner PRO Monthly');
  v_start_date date := COALESCE(p_started_at, (now() AT TIME ZONE 'Asia/Jakarta')::date);
  v_due_date date;
  v_start_ts timestamptz;
  v_expires_ts timestamptz;
  v_username text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email target wajib diisi.');
  END IF;

  IF p_due_at IS NOT NULL AND p_due_at >= v_start_date THEN
    v_due_date := p_due_at;
  ELSE
    v_due_date := v_start_date + 30;
  END IF;

  v_start_ts := (v_start_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  v_expires_ts := ((v_due_date::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta');

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET
    subscription_tier = 'pro',
    pro_started_at = v_start_ts,
    pro_expires_at = v_expires_ts,
    pro_package_name = v_pkg
  WHERE lower(email) = v_clean_email;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    UPDATE public.user_profiles
    SET
      perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object(
        'is_pro', true,
        'pro_started_at', v_start_ts,
        'pro_expires_at', v_expires_ts,
        'pro_package_name', v_pkg
      ),
      updated_at = timezone('utc', now())
    WHERE lower(email) = v_clean_email;

    SELECT username
    INTO v_username
    FROM public.user_profiles
    WHERE lower(email) = v_clean_email
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (
      username, plan_tier, status, started_at, due_at, payment_method, renewal_status, updated_at
    ) VALUES (
      v_username,
      'PRO',
      'aktif',
      v_start_date,
      v_due_date,
      'manual renewal by admin',
      'diperpanjang manual',
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

  PERFORM public._append_admin_notification(
    jsonb_build_object(
      'id', 'notif-pro-renew-' || encode(convert_to(v_clean_email || '-' || extract(epoch from now())::text, 'UTF8'), 'hex'),
      'eventType', 'pro_subscribed',
      'title', '🔄 Perpanjangan PRO Manual Berhasil',
      'message', format(
        'Admin mengaktifkan / memperpanjang paket %s untuk %s hingga jatuh tempo %s.',
        v_pkg,
        v_clean_name,
        to_char(v_due_date, 'DD Mon YYYY')
      ),
      'userName', v_clean_name,
      'userEmail', v_clean_email,
      'packageName', v_pkg,
      'read', false,
      'createdAt', now()
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'pro_started_at', v_start_ts,
    'pro_expires_at', v_expires_ts,
    'pro_package_name', v_pkg,
    'started_date', v_start_date,
    'due_date', v_due_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_extend_learner_pro(text, text, date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_learner_pro(text, text, date, date, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. TAMBAHKAN USER_SUBSCRIPTIONS KE REALTIME & UPDATE WATERMARK RPC
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND to_regclass('public.user_subscriptions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'user_subscriptions'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_workspace_sync_watermark()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_contents_ts timestamptz;
  v_contents_count bigint := 0;
  v_own_profile_role text;
  v_own_profile_tier text;
  v_own_pro_expires_at timestamptz;
  v_own_profile_points integer := 0;
  v_own_avatar text;
  v_user_profile_ts timestamptz;
  v_inbox_ts timestamptz;
  v_issues_ts timestamptz;
  v_pro_settings_ts timestamptz;
  v_all_profiles_count bigint := 0;
  v_pro_requests_pending bigint := 0;
  v_admin_notifs_ts timestamptz;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT
      role::text,
      subscription_tier,
      pro_expires_at,
      total_points,
      avatar_url
    INTO
      v_own_profile_role,
      v_own_profile_tier,
      v_own_pro_expires_at,
      v_own_profile_points,
      v_own_avatar
    FROM public.profiles
    WHERE id = v_uid;

    v_is_staff := COALESCE(v_own_profile_role, '') IN ('admin', 'mentor');

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      SELECT MAX(updated_at)
      INTO v_user_profile_ts
      FROM public.user_profiles
      WHERE user_id = v_uid
         OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''));
    END IF;
  END IF;

  IF v_is_staff THEN
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents;
  ELSE
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents
    WHERE (
      status = 'published'::public.content_status
      AND title NOT LIKE '__SYSTEM_%'
    )
    OR title IN (
      '__SYSTEM_MAINTENANCE_CONFIG__',
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__'
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
      SELECT MAX(updated_at) INTO v_inbox_ts FROM public.mentor_inbox_threads;
    END IF;
    IF to_regclass('public.mentor_reported_issues') IS NOT NULL THEN
      SELECT MAX(created_at) INTO v_issues_ts FROM public.mentor_reported_issues;
    END IF;
    IF to_regclass('public.learner_pro_settings') IS NOT NULL THEN
      SELECT updated_at INTO v_pro_settings_ts FROM public.learner_pro_settings WHERE id = 'default' LIMIT 1;
    END IF;
  END IF;

  IF v_is_staff THEN
    SELECT COUNT(*) INTO v_all_profiles_count FROM public.profiles;
    IF to_regclass('public.pro_upgrade_requests') IS NOT NULL THEN
      SELECT COUNT(*) INTO v_pro_requests_pending
      FROM public.pro_upgrade_requests
      WHERE status = 'pending';
    END IF;
    SELECT MAX(updated_at)
    INTO v_admin_notifs_ts
    FROM public.contents
    WHERE title = '__SYSTEM_ADMIN_NOTIFICATIONS__';
  END IF;

  RETURN jsonb_build_object(
    'uid', v_uid,
    'staff', v_is_staff,
    'contents_ts', v_contents_ts,
    'contents_count', v_contents_count,
    'own_role', v_own_profile_role,
    'own_tier', v_own_profile_tier,
    'own_pro_expires_at', v_own_pro_expires_at,
    'own_points', v_own_profile_points,
    'own_avatar', v_own_avatar,
    'up_ts', v_user_profile_ts,
    'inbox_ts', v_inbox_ts,
    'issues_ts', v_issues_ts,
    'pro_cfg_ts', v_pro_settings_ts,
    'staff_profiles_count', v_all_profiles_count,
    'pro_req_pending', v_pro_requests_pending,
    'admin_notifs_ts', v_admin_notifs_ts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_sync_watermark() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_sync_watermark() TO anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 014_content_access_codes_and_redeem_rpc.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — KODE AKSES PER MATERI & RPC REDEEM OTOMATIS
-- File: supabase/migrations/014_content_access_codes_and_redeem_rpc.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

-- 1. Pastikan kolom `access_code` tersedia & terindeks di `public.contents`
ALTER TABLE IF EXISTS public.contents
  ADD COLUMN IF NOT EXISTS access_code text;

CREATE INDEX IF NOT EXISTS idx_contents_access_code_upper
  ON public.contents ((upper(replace(trim(coalesce(access_code, '')), ' ', '-'))));

-- 2. Sinkronkan backfill `access_code` dari JSON `settings_json.explorer_meta.accessCode` jika belum terisi
UPDATE public.contents
SET access_code = upper(replace(trim(settings_json->'explorer_meta'->>'accessCode'), ' ', '-'))
WHERE coalesce(trim(access_code), '') = ''
  AND coalesce(trim(settings_json->'explorer_meta'->>'accessCode'), '') <> '';

-- 3. RPC `redeem_access_code`:
--    Memungkinkan learner terautentikasi mengaktifkan akses Folder maupun Materi individual
--    hanya dengan memasukkan Kode Akses unik, lalu otomatis mencatat assignment di
--    `public.contents.settings_json` dan `public.enrollments` tanpa melanggar RLS.
CREATE OR REPLACE FUNCTION public.redeem_access_code(
  p_code text,
  p_target_titles text[] DEFAULT NULL,
  p_learner_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_code text := upper(replace(trim(coalesce(p_code, '')), ' ', '-'));
  v_email text := '';
  v_full_name text := '';
  v_tokens text[];
  v_matched_titles text[] := '{}'::text[];
  v_updated_count integer := 0;
  v_row record;
  v_child record;
  v_settings jsonb;
  v_meta jsonb;
  v_existing_learners jsonb;
  v_next_learners jsonb;
  v_has_folder boolean := false;
  v_target_keys text[] := '{}'::text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  IF v_clean_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kode akses tidak boleh kosong.');
  END IF;

  SELECT
    coalesce(nullif(trim(email), ''), nullif(trim(auth.jwt()->>'email'), ''), ''),
    coalesce(nullif(trim(full_name), ''), nullif(trim(p_learner_name), ''), split_part(coalesce(email, auth.jwt()->>'email', 'Learner'), '@', 1))
  INTO v_email, v_full_name
  FROM public.profiles
  WHERE id = v_uid;

  IF coalesce(v_email, '') = '' THEN
    v_email := coalesce(nullif(trim(auth.jwt()->>'email'), ''), '');
  END IF;
  IF coalesce(v_full_name, '') = '' THEN
    v_full_name := coalesce(nullif(trim(p_learner_name), ''), split_part(v_email, '@', 1), 'Learner');
  END IF;

  v_tokens := ARRAY(
    SELECT DISTINCT trim(x)
    FROM unnest(ARRAY[v_full_name, v_email]) AS x
    WHERE coalesce(trim(x), '') <> ''
  );

  IF p_target_titles IS NOT NULL THEN
    v_target_keys := ARRAY(
      SELECT DISTINCT lower(trim(x))
      FROM unnest(p_target_titles) AS x
      WHERE coalesce(trim(x), '') <> ''
    );
  END IF;

  -- Kumpulkan seluruh target content (baik cocok kode eksplisit maupun fallback judul default code bila belum ada kode custom di DB)
  FOR v_row IN
    SELECT
      c.id,
      c.title,
      c.type::text AS db_type,
      c.status::text AS db_status,
      c.settings_json
    FROM public.contents c
    WHERE c.title NOT LIKE '__SYSTEM_%'
      AND c.status::text IS DISTINCT FROM 'archived'
      AND coalesce((c.settings_json->'explorer_meta'->>'isArchived')::boolean, false) = false
      AND (
        upper(replace(trim(coalesce(
          nullif(trim(c.access_code), ''),
          c.settings_json->'explorer_meta'->>'accessCode',
          ''
        )), ' ', '-')) = v_clean_code
        OR (
          coalesce(array_length(v_target_keys, 1), 0) > 0
          AND lower(trim(c.title)) = ANY(v_target_keys)
          AND coalesce(trim(c.access_code), '') = ''
          AND coalesce(trim(c.settings_json->'explorer_meta'->>'accessCode'), '') = ''
        )
      )
  LOOP
    v_settings := coalesce(v_row.settings_json, '{}'::jsonb);
    v_meta := coalesce(v_settings->'explorer_meta', '{}'::jsonb);
    v_existing_learners := coalesce(v_meta->'assignedLearners', '[]'::jsonb);

    SELECT coalesce(jsonb_agg(val), '[]'::jsonb)
    INTO v_next_learners
    FROM (
      SELECT DISTINCT ON (lower(trim(val))) val
      FROM (
        SELECT jsonb_array_elements_text(v_existing_learners) AS val
        UNION ALL
        SELECT unnest(v_tokens) AS val
      ) combined
      WHERE coalesce(trim(val), '') <> ''
      ORDER BY lower(trim(val)), val
    ) deduped;

    v_meta := v_meta || jsonb_build_object(
      'accessCode', coalesce(nullif(trim(v_meta->>'accessCode'), ''), v_clean_code),
      'assignedLearners', v_next_learners,
      'assignedCount', jsonb_array_length(v_next_learners)
    );

    UPDATE public.contents
    SET
      access_code = coalesce(nullif(trim(access_code), ''), v_clean_code),
      settings_json = v_settings || jsonb_build_object('explorer_meta', v_meta),
      updated_at = now()
    WHERE id = v_row.id;

    v_updated_count := v_updated_count + 1;
    v_matched_titles := array_append(v_matched_titles, v_row.title);

    v_has_folder := (v_row.db_type = 'folder') OR coalesce((v_meta->>'isFolder')::boolean, false);

    IF NOT v_has_folder THEN
      INSERT INTO public.enrollments (
        content_id,
        learner_id,
        status,
        progress_percent,
        completed_chapter_ids
      )
      VALUES (v_row.id, v_uid, 'not_started', 0, '{}')
      ON CONFLICT (content_id, learner_id) DO NOTHING;
    ELSE
      -- Jika yang di-redeem adalah Folder, buka otomatis seluruh materi di dalam folder tersebut
      FOR v_child IN
        SELECT
          ch.id,
          ch.title,
          ch.type::text AS db_type,
          ch.settings_json
        FROM public.contents ch
        WHERE ch.id <> v_row.id
          AND ch.title NOT LIKE '__SYSTEM_%'
          AND ch.status::text IS DISTINCT FROM 'archived'
          AND coalesce((ch.settings_json->'explorer_meta'->>'isArchived')::boolean, false) = false
          AND lower(trim(coalesce(ch.folder_name, ch.settings_json->'explorer_meta'->>'folderName', ''))) = lower(trim(v_row.title))
      LOOP
        v_settings := coalesce(v_child.settings_json, '{}'::jsonb);
        v_meta := coalesce(v_settings->'explorer_meta', '{}'::jsonb);
        v_existing_learners := coalesce(v_meta->'assignedLearners', '[]'::jsonb);

        SELECT coalesce(jsonb_agg(val), '[]'::jsonb)
        INTO v_next_learners
        FROM (
          SELECT DISTINCT ON (lower(trim(val))) val
          FROM (
            SELECT jsonb_array_elements_text(v_existing_learners) AS val
            UNION ALL
            SELECT unnest(v_tokens) AS val
          ) combined
          WHERE coalesce(trim(val), '') <> ''
          ORDER BY lower(trim(val)), val
        ) deduped;

        v_meta := v_meta || jsonb_build_object(
          'assignedLearners', v_next_learners,
          'assignedCount', jsonb_array_length(v_next_learners)
        );

        UPDATE public.contents
        SET
          settings_json = v_settings || jsonb_build_object('explorer_meta', v_meta),
          updated_at = now()
        WHERE id = v_child.id;

        IF v_child.db_type <> 'folder' AND coalesce((v_meta->>'isFolder')::boolean, false) = false THEN
          INSERT INTO public.enrollments (
            content_id,
            learner_id,
            status,
            progress_percent,
            completed_chapter_ids
          )
          VALUES (v_child.id, v_uid, 'not_started', 0, '{}')
          ON CONFLICT (content_id, learner_id) DO NOTHING;
        END IF;

        v_updated_count := v_updated_count + 1;
        v_matched_titles := array_append(v_matched_titles, v_child.title);
      END LOOP;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', v_updated_count > 0,
    'updated_count', v_updated_count,
    'matched_titles', to_jsonb(v_matched_titles)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_access_code(text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text, text[], text) TO authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 015_discussion_delete_points_and_learner_notifications.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — CONSOLIDATED SQL UPDATE (MIGRATION 015)
-- File: supabase/migrations/015_discussion_delete_points_and_learner_notifications.sql
-- Mencakup:
--   1. Kode Akses Unik per Materi & RPC `redeem_access_code` (Idempotent)
--   2. Backfill & RPC Sinkronisasi Poin 2-Arah (`sync_user_points_balance`)
--   3. RLS & RPC Hapus Diskusi Khusus Admin (`admin_delete_discussion_thread`)
--   4. Storage, RLS & Watermark Notifikasi Real-Time Learner
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor.
-- =============================================================================

-- =============================================================================
-- BAGIAN 1: KODE AKSES PER MATERI & FOLDER + RPC REDEEM OTOMATIS
-- =============================================================================
ALTER TABLE IF EXISTS public.contents
  ADD COLUMN IF NOT EXISTS access_code text;

CREATE INDEX IF NOT EXISTS idx_contents_access_code_upper
  ON public.contents ((upper(replace(trim(coalesce(access_code, '')), ' ', '-'))));

UPDATE public.contents
SET access_code = upper(replace(trim(settings_json->'explorer_meta'->>'accessCode'), ' ', '-'))
WHERE coalesce(trim(access_code), '') = ''
  AND coalesce(trim(settings_json->'explorer_meta'->>'accessCode'), '') <> '';

CREATE OR REPLACE FUNCTION public.redeem_access_code(
  p_code text,
  p_target_titles text[] DEFAULT NULL,
  p_learner_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_code text := upper(replace(trim(coalesce(p_code, '')), ' ', '-'));
  v_email text := '';
  v_full_name text := '';
  v_tokens text[];
  v_matched_titles text[] := '{}'::text[];
  v_updated_count integer := 0;
  v_row record;
  v_child record;
  v_settings jsonb;
  v_meta jsonb;
  v_existing_learners jsonb;
  v_next_learners jsonb;
  v_has_folder boolean := false;
  v_target_keys text[] := '{}'::text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  IF v_clean_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kode akses tidak boleh kosong.');
  END IF;

  SELECT
    coalesce(nullif(trim(email), ''), nullif(trim(auth.jwt()->>'email'), ''), ''),
    coalesce(nullif(trim(full_name), ''), nullif(trim(p_learner_name), ''), split_part(coalesce(email, auth.jwt()->>'email', 'Learner'), '@', 1))
  INTO v_email, v_full_name
  FROM public.profiles
  WHERE id = v_uid;

  IF coalesce(v_email, '') = '' THEN
    v_email := coalesce(nullif(trim(auth.jwt()->>'email'), ''), '');
  END IF;
  IF coalesce(v_full_name, '') = '' THEN
    v_full_name := coalesce(nullif(trim(p_learner_name), ''), split_part(v_email, '@', 1), 'Learner');
  END IF;

  v_tokens := ARRAY(
    SELECT DISTINCT trim(x)
    FROM unnest(ARRAY[v_full_name, v_email]) AS x
    WHERE coalesce(trim(x), '') <> ''
  );

  IF p_target_titles IS NOT NULL THEN
    v_target_keys := ARRAY(
      SELECT DISTINCT lower(trim(x))
      FROM unnest(p_target_titles) AS x
      WHERE coalesce(trim(x), '') <> ''
    );
  END IF;

  FOR v_row IN
    SELECT
      c.id,
      c.title,
      c.type::text AS db_type,
      c.status::text AS db_status,
      c.settings_json
    FROM public.contents c
    WHERE c.title NOT LIKE '__SYSTEM_%'
      AND c.status::text IS DISTINCT FROM 'archived'
      AND coalesce((c.settings_json->'explorer_meta'->>'isArchived')::boolean, false) = false
      AND (
        upper(replace(trim(coalesce(
          nullif(trim(c.access_code), ''),
          c.settings_json->'explorer_meta'->>'accessCode',
          ''
        )), ' ', '-')) = v_clean_code
        OR (
          coalesce(array_length(v_target_keys, 1), 0) > 0
          AND lower(trim(c.title)) = ANY(v_target_keys)
          AND coalesce(trim(c.access_code), '') = ''
          AND coalesce(trim(c.settings_json->'explorer_meta'->>'accessCode'), '') = ''
        )
      )
  LOOP
    v_settings := coalesce(v_row.settings_json, '{}'::jsonb);
    v_meta := coalesce(v_settings->'explorer_meta', '{}'::jsonb);
    v_existing_learners := coalesce(v_meta->'assignedLearners', '[]'::jsonb);

    SELECT coalesce(jsonb_agg(val), '[]'::jsonb)
    INTO v_next_learners
    FROM (
      SELECT DISTINCT ON (lower(trim(val))) val
      FROM (
        SELECT jsonb_array_elements_text(v_existing_learners) AS val
        UNION ALL
        SELECT unnest(v_tokens) AS val
      ) combined
      WHERE coalesce(trim(val), '') <> ''
      ORDER BY lower(trim(val)), val
    ) deduped;

    v_meta := v_meta || jsonb_build_object(
      'accessCode', coalesce(nullif(trim(v_meta->>'accessCode'), ''), v_clean_code),
      'assignedLearners', v_next_learners,
      'assignedCount', jsonb_array_length(v_next_learners)
    );

    UPDATE public.contents
    SET
      access_code = coalesce(nullif(trim(access_code), ''), v_clean_code),
      settings_json = v_settings || jsonb_build_object('explorer_meta', v_meta),
      updated_at = now()
    WHERE id = v_row.id;

    v_updated_count := v_updated_count + 1;
    v_matched_titles := array_append(v_matched_titles, v_row.title);

    v_has_folder := (v_row.db_type = 'folder') OR coalesce((v_meta->>'isFolder')::boolean, false);

    IF NOT v_has_folder THEN
      INSERT INTO public.enrollments (
        content_id,
        learner_id,
        status,
        progress_percent,
        completed_chapter_ids
      )
      VALUES (v_row.id, v_uid, 'not_started', 0, '{}')
      ON CONFLICT (content_id, learner_id) DO NOTHING;
    ELSE
      FOR v_child IN
        SELECT
          ch.id,
          ch.title,
          ch.type::text AS db_type,
          ch.settings_json
        FROM public.contents ch
        WHERE ch.id <> v_row.id
          AND ch.title NOT LIKE '__SYSTEM_%'
          AND ch.status::text IS DISTINCT FROM 'archived'
          AND coalesce((ch.settings_json->'explorer_meta'->>'isArchived')::boolean, false) = false
          AND lower(trim(coalesce(ch.folder_name, ch.settings_json->'explorer_meta'->>'folderName', ''))) = lower(trim(v_row.title))
      LOOP
        v_settings := coalesce(v_child.settings_json, '{}'::jsonb);
        v_meta := coalesce(v_settings->'explorer_meta', '{}'::jsonb);
        v_existing_learners := coalesce(v_meta->'assignedLearners', '[]'::jsonb);

        SELECT coalesce(jsonb_agg(val), '[]'::jsonb)
        INTO v_next_learners
        FROM (
          SELECT DISTINCT ON (lower(trim(val))) val
          FROM (
            SELECT jsonb_array_elements_text(v_existing_learners) AS val
            UNION ALL
            SELECT unnest(v_tokens) AS val
          ) combined
          WHERE coalesce(trim(val), '') <> ''
          ORDER BY lower(trim(val)), val
        ) deduped;

        v_meta := v_meta || jsonb_build_object(
          'assignedLearners', v_next_learners,
          'assignedCount', jsonb_array_length(v_next_learners)
        );

        UPDATE public.contents
        SET
          settings_json = v_settings || jsonb_build_object('explorer_meta', v_meta),
          updated_at = now()
        WHERE id = v_child.id;

        IF v_child.db_type <> 'folder' AND coalesce((v_meta->>'isFolder')::boolean, false) = false THEN
          INSERT INTO public.enrollments (
            content_id,
            learner_id,
            status,
            progress_percent,
            completed_chapter_ids
          )
          VALUES (v_child.id, v_uid, 'not_started', 0, '{}')
          ON CONFLICT (content_id, learner_id) DO NOTHING;
        END IF;

        v_updated_count := v_updated_count + 1;
        v_matched_titles := array_append(v_matched_titles, v_child.title);
      END LOOP;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', v_updated_count > 0,
    'updated_count', v_updated_count,
    'matched_titles', to_jsonb(v_matched_titles)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_access_code(text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text, text[], text) TO authenticated;


-- =============================================================================
-- BAGIAN 2: SINKRONISASI 2-ARAH SALDO POIN (`profiles` <-> `user_profiles`)
-- =============================================================================
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS full_name text;

-- Backfill user_profiles.perks.total_points & profiles.total_points dengan nilai tertinggi yang sinkron
DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    -- 1) Tarik total_points dari user_profiles.perks ke profiles jika profiles masih lebih kecil
    UPDATE public.profiles p
    SET total_points = GREATEST(
      coalesce(p.total_points, 0),
      CASE
        WHEN coalesce(up.perks->>'total_points', '') ~ '^[0-9]+$' THEN (up.perks->>'total_points')::integer
        WHEN coalesce(up.perks->>'points', '') ~ '^[0-9]+$' THEN (up.perks->>'points')::integer
        ELSE 0
      END
    )
    FROM public.user_profiles up
    WHERE up.user_id = p.id
       OR (
         coalesce(trim(p.email), '') <> ''
         AND lower(trim(coalesce(up.email, ''))) = lower(trim(p.email))
       );

    -- 2) Dorong profiles.total_points balik ke user_profiles.perks supaya Directory & Toko Hadiah selalu seragam
    UPDATE public.user_profiles up
    SET
      perks = coalesce(up.perks, '{}'::jsonb) || jsonb_build_object(
        'total_points', coalesce(p.total_points, 0),
        'points', coalesce(p.total_points, 0)
      ),
      updated_at = now()
    FROM public.profiles p
    WHERE (
      up.user_id = p.id
      OR (
        coalesce(trim(p.email), '') <> ''
        AND lower(trim(coalesce(up.email, ''))) = lower(trim(p.email))
      )
    )
      AND (
        (CASE WHEN coalesce(up.perks->>'total_points', '') ~ '^[0-9]+$' THEN (up.perks->>'total_points')::integer ELSE -1 END) <> coalesce(p.total_points, 0)
        OR (CASE WHEN coalesce(up.perks->>'points', '') ~ '^[0-9]+$' THEN (up.perks->>'points')::integer ELSE -1 END) <> coalesce(p.total_points, 0)
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_user_points_balance(
  p_new_points integer,
  p_target_email text DEFAULT NULL,
  p_target_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_clean_points integer := GREATEST(0, coalesce(p_new_points, 0));
  v_email text := lower(trim(coalesce(p_target_email, '')));
  v_name text := trim(coalesce(p_target_name, ''));
  v_updated_profiles integer := 0;
  v_updated_user_profiles integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  SELECT (role::text IN ('admin', 'mentor'))
  INTO v_is_staff
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT coalesce(v_is_staff, false) THEN
    -- Learner hanya diizinkan menyinkronkan poin miliknya sendiri
    UPDATE public.profiles
    SET total_points = v_clean_points
    WHERE id = v_uid;
    GET DIAGNOSTICS v_updated_profiles = ROW_COUNT;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      UPDATE public.user_profiles
      SET
        perks = coalesce(perks, '{}'::jsonb) || jsonb_build_object(
          'total_points', v_clean_points,
          'points', v_clean_points
        ),
        updated_at = now()
      WHERE user_id = v_uid
         OR lower(trim(coalesce(email, ''))) = lower(trim(coalesce(auth.jwt()->>'email', '')));
      GET DIAGNOSTICS v_updated_user_profiles = ROW_COUNT;
    END IF;
  ELSE
    IF v_email <> '' THEN
      UPDATE public.profiles
      SET total_points = v_clean_points
      WHERE lower(trim(email)) = v_email;
      GET DIAGNOSTICS v_updated_profiles = ROW_COUNT;
    END IF;

    IF v_updated_profiles = 0 AND v_name <> '' THEN
      UPDATE public.profiles
      SET total_points = v_clean_points
      WHERE lower(trim(full_name)) = lower(v_name);
      GET DIAGNOSTICS v_updated_profiles = ROW_COUNT;
    END IF;

    IF v_updated_profiles = 0 AND v_email = '' AND v_name = '' THEN
      UPDATE public.profiles
      SET total_points = v_clean_points
      WHERE id = v_uid;
      GET DIAGNOSTICS v_updated_profiles = ROW_COUNT;
    END IF;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      UPDATE public.user_profiles
      SET
        perks = coalesce(perks, '{}'::jsonb) || jsonb_build_object(
          'total_points', v_clean_points,
          'points', v_clean_points
        ),
        updated_at = now()
      WHERE (v_email <> '' AND lower(trim(coalesce(email, ''))) = v_email)
         OR (v_name <> '' AND (lower(trim(coalesce(full_name, ''))) = lower(v_name) OR lower(trim(coalesce(name, ''))) = lower(v_name)));
      GET DIAGNOSTICS v_updated_user_profiles = ROW_COUNT;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', (v_updated_profiles > 0 OR v_updated_user_profiles > 0),
    'points', v_clean_points,
    'updated_profiles', v_updated_profiles,
    'updated_user_profiles', v_updated_user_profiles
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_user_points_balance(integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_user_points_balance(integer, text, text) TO authenticated;


-- =============================================================================
-- BAGIAN 3: HAPUS DISKUSI KHUSUS ADMIN & MENTOR (TIDAK MUNCUL DI SISWA)
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
    ALTER TABLE public.mentor_inbox_threads ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "mentor_inbox_threads_select_auth" ON public.mentor_inbox_threads;
    CREATE POLICY "mentor_inbox_threads_select_auth"
      ON public.mentor_inbox_threads FOR SELECT TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "mentor_inbox_threads_insert_auth" ON public.mentor_inbox_threads;
    CREATE POLICY "mentor_inbox_threads_insert_auth"
      ON public.mentor_inbox_threads FOR INSERT TO authenticated
      WITH CHECK (true);

    DROP POLICY IF EXISTS "mentor_inbox_threads_update_auth" ON public.mentor_inbox_threads;
    CREATE POLICY "mentor_inbox_threads_update_auth"
      ON public.mentor_inbox_threads FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);

    DROP POLICY IF EXISTS "mentor_inbox_threads_delete_staff" ON public.mentor_inbox_threads;
    CREATE POLICY "mentor_inbox_threads_delete_staff"
      ON public.mentor_inbox_threads FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role::text IN ('admin', 'mentor')
        )
      );

    -- Bersihkan utas yang sudah ter-tombstone, kosong, atau sisa diskusi lama yang sudah dihapus Admin
    DELETE FROM public.mentor_inbox_threads
    WHERE title = '__DELETED__'
       OR excerpt = '__DELETED__'
       OR (jsonb_typeof(replies) = 'array' AND jsonb_array_length(replies) = 0)
       OR excerpt ILIKE '%eh ada si mas%'
       OR replies::text ILIKE '%eh ada si mas%';
  END IF;

  IF to_regclass('public.discussions') IS NOT NULL THEN
    DELETE FROM public.discussions
    WHERE title = '__DELETED__'
       OR body ILIKE '%eh ada si mas%';
  END IF;

  IF to_regclass('public.forum_threads') IS NOT NULL THEN
    DELETE FROM public.forum_threads
    WHERE title = '__DELETED__'
       OR body ILIKE '%eh ada si mas%';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_discussion_thread(
  p_thread_id text,
  p_reply_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_clean_thread text := trim(coalesce(p_thread_id, ''));
  v_clean_reply text := nullif(trim(coalesce(p_reply_id, '')), '');
  v_replies jsonb;
  v_next_replies jsonb;
  v_last_msg text := '';
  v_deleted_thread boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  SELECT (role::text IN ('admin', 'mentor'))
  INTO v_is_staff
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT coalesce(v_is_staff, false) THEN
    RAISE EXCEPTION 'Forbidden: hanya Admin atau Mentor yang dapat menghapus diskusi';
  END IF;

  IF v_clean_thread = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ID diskusi tidak valid.');
  END IF;

  IF v_clean_reply IS NULL THEN
    IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
      UPDATE public.mentor_inbox_threads
      SET
        title = '__DELETED__',
        excerpt = '__DELETED__',
        replies = '[]'::jsonb,
        replies_count = 0,
        updated_at = now()
      WHERE id = v_clean_thread;

      DELETE FROM public.mentor_inbox_threads WHERE id = v_clean_thread;
    END IF;
    IF to_regclass('public.discussions') IS NOT NULL THEN
      DELETE FROM public.discussions WHERE id::text = v_clean_thread;
    END IF;
    IF to_regclass('public.forum_threads') IS NOT NULL THEN
      DELETE FROM public.forum_threads WHERE id::text = v_clean_thread;
    END IF;
    v_deleted_thread := true;
  ELSE
    IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
      SELECT replies INTO v_replies
      FROM public.mentor_inbox_threads
      WHERE id = v_clean_thread;

      IF v_replies IS NOT NULL THEN
        SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
        INTO v_next_replies
        FROM jsonb_array_elements(v_replies) AS elem
        WHERE coalesce(elem->>'id', '') <> v_clean_reply;

        IF jsonb_array_length(v_next_replies) = 0 THEN
          UPDATE public.mentor_inbox_threads
          SET
            title = '__DELETED__',
            excerpt = '__DELETED__',
            replies = '[]'::jsonb,
            replies_count = 0,
            updated_at = now()
          WHERE id = v_clean_thread;

          DELETE FROM public.mentor_inbox_threads WHERE id = v_clean_thread;
          IF to_regclass('public.discussions') IS NOT NULL THEN
            DELETE FROM public.discussions WHERE id::text = v_clean_thread;
          END IF;
          IF to_regclass('public.forum_threads') IS NOT NULL THEN
            DELETE FROM public.forum_threads WHERE id::text = v_clean_thread;
          END IF;
          v_deleted_thread := true;
        ELSE
          SELECT coalesce(v_next_replies->(jsonb_array_length(v_next_replies) - 1)->>'message', '')
          INTO v_last_msg;

          UPDATE public.mentor_inbox_threads
          SET
            replies = v_next_replies,
            replies_count = jsonb_array_length(v_next_replies),
            excerpt = v_last_msg,
            updated_at = now()
          WHERE id = v_clean_thread;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'thread_id', v_clean_thread,
    'reply_id', v_clean_reply,
    'deleted_thread', v_deleted_thread
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_discussion_thread(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_discussion_thread(text, text) TO authenticated;


-- =============================================================================
-- BAGIAN 4: STORAGE, RLS & WATERMARK NOTIFIKASI REAL-TIME LEARNER
-- =============================================================================
-- 1) Seed baris sistem `__SYSTEM_LEARNER_NOTIFICATIONS__` (hapus duplikat jika ada)
WITH ranked AS (
  SELECT
    id,
    title,
    ROW_NUMBER() OVER (PARTITION BY title ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.contents
  WHERE title IN (
    '__SYSTEM_LEARNER_NOTIFICATIONS__',
    '__SYSTEM_ADMIN_NOTIFICATIONS__',
    '__SYSTEM_USER_AVATARS__'
  )
)
DELETE FROM public.contents
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

INSERT INTO public.contents (
  id,
  title,
  type,
  status,
  description,
  urgency,
  estimated_minutes,
  points_reward,
  settings_json
)
SELECT
  gen_random_uuid(),
  '__SYSTEM_LEARNER_NOTIFICATIONS__',
  'page',
  'published',
  'System storage for Learner notifications',
  'not_urgent',
  0,
  0,
  jsonb_build_object('notifications', '[]'::jsonb, 'updatedAt', now())
WHERE NOT EXISTS (
  SELECT 1 FROM public.contents WHERE title = '__SYSTEM_LEARNER_NOTIFICATIONS__'
);

-- 2) Perbarui RLS `contents_select_authenticated_and_staff` agar Learner terautentikasi bisa membaca
--    `__SYSTEM_LEARNER_NOTIFICATIONS__` & `__SYSTEM_USER_AVATARS__` (tetap menyembunyikan __SYSTEM_ADMIN_NOTIFICATIONS__)
DROP POLICY IF EXISTS "contents_select_authenticated_and_staff" ON public.contents;
CREATE POLICY "contents_select_authenticated_and_staff"
  ON public.contents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text IN ('admin', 'mentor')
    )
    OR title IN (
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__',
      '__SYSTEM_LEARNER_NOTIFICATIONS__',
      '__SYSTEM_USER_AVATARS__'
    )
    OR EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.content_id = contents.id
        AND e.learner_id = auth.uid()
    )
  );

-- 3) Perbarui RPC `get_workspace_sync_watermark()` agar mencakup `inbox_count` (deteksi diskusi terhapus)
--    dan `learner_notifs_ts` + daftar `__SYSTEM_*` baru
CREATE OR REPLACE FUNCTION public.get_workspace_sync_watermark()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_contents_ts timestamptz;
  v_contents_count bigint := 0;
  v_own_profile_role text;
  v_own_profile_tier text;
  v_own_pro_expires_at timestamptz;
  v_own_profile_points integer := 0;
  v_own_avatar text;
  v_user_profile_ts timestamptz;
  v_inbox_ts timestamptz;
  v_inbox_count bigint := 0;
  v_issues_ts timestamptz;
  v_pro_settings_ts timestamptz;
  v_all_profiles_count bigint := 0;
  v_pro_requests_pending bigint := 0;
  v_admin_notifs_ts timestamptz;
  v_learner_notifs_ts timestamptz;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT
      role::text,
      subscription_tier,
      pro_expires_at,
      total_points,
      avatar_url
    INTO
      v_own_profile_role,
      v_own_profile_tier,
      v_own_pro_expires_at,
      v_own_profile_points,
      v_own_avatar
    FROM public.profiles
    WHERE id = v_uid;

    v_is_staff := COALESCE(v_own_profile_role, '') IN ('admin', 'mentor');

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      SELECT MAX(updated_at)
      INTO v_user_profile_ts
      FROM public.user_profiles
      WHERE user_id = v_uid
         OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''));
    END IF;
  END IF;

  IF v_is_staff THEN
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents;
  ELSE
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents
    WHERE (
      status = 'published'::public.content_status
      AND title NOT LIKE '__SYSTEM_%'
    )
    OR title IN (
      '__SYSTEM_MAINTENANCE_CONFIG__',
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__',
      '__SYSTEM_LEARNER_NOTIFICATIONS__',
      '__SYSTEM_USER_AVATARS__'
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
      SELECT MAX(updated_at), COUNT(*)
      INTO v_inbox_ts, v_inbox_count
      FROM public.mentor_inbox_threads;
    END IF;
    IF to_regclass('public.mentor_reported_issues') IS NOT NULL THEN
      SELECT MAX(created_at) INTO v_issues_ts FROM public.mentor_reported_issues;
    END IF;
    IF to_regclass('public.learner_pro_settings') IS NOT NULL THEN
      SELECT updated_at INTO v_pro_settings_ts FROM public.learner_pro_settings WHERE id = 'default' LIMIT 1;
    END IF;
    SELECT MAX(updated_at)
    INTO v_learner_notifs_ts
    FROM public.contents
    WHERE title = '__SYSTEM_LEARNER_NOTIFICATIONS__';
  END IF;

  IF v_is_staff THEN
    SELECT COUNT(*) INTO v_all_profiles_count FROM public.profiles;
    IF to_regclass('public.pro_upgrade_requests') IS NOT NULL THEN
      SELECT COUNT(*) INTO v_pro_requests_pending
      FROM public.pro_upgrade_requests
      WHERE status = 'pending';
    END IF;
    SELECT MAX(updated_at)
    INTO v_admin_notifs_ts
    FROM public.contents
    WHERE title = '__SYSTEM_ADMIN_NOTIFICATIONS__';
  END IF;

  RETURN jsonb_build_object(
    'uid', v_uid,
    'staff', v_is_staff,
    'contents_ts', v_contents_ts,
    'contents_count', v_contents_count,
    'own_role', v_own_profile_role,
    'own_tier', v_own_profile_tier,
    'own_pro_expires_at', v_own_pro_expires_at,
    'own_points', v_own_profile_points,
    'own_avatar', v_own_avatar,
    'up_ts', v_user_profile_ts,
    'inbox_ts', v_inbox_ts,
    'inbox_count', v_inbox_count,
    'issues_ts', v_issues_ts,
    'pro_cfg_ts', v_pro_settings_ts,
    'staff_profiles_count', v_all_profiles_count,
    'pro_req_pending', v_pro_requests_pending,
    'admin_notifs_ts', v_admin_notifs_ts,
    'learner_notifs_ts', v_learner_notifs_ts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_sync_watermark() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_sync_watermark() TO anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 016_learner_pages_visibility_config.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRATION 016:
--   1. Seed konfigurasi visibilitas halaman Portal Siswa (__SYSTEM_LEARNER_PAGES_CONFIG__)
--      untuk kontrol aktif/nonaktif halaman Wiki & Favorites dari Pengaturan Admin
--   2. Perbarui RLS `contents_select_authenticated_and_staff` agar siswa dapat membaca konfigurasi tersebut
--   3. Perbarui RPC `get_workspace_sync_watermark()` agar perubahan langsung tersinkron real-time ke semua siswa
-- =============================================================================

-- 1) Seed row konfigurasi default (aman & idempoten, tidak menimpa setting yang sudah ada)
INSERT INTO public.contents (
  id,
  title,
  type,
  status,
  description,
  urgency,
  estimated_minutes,
  points_reward,
  settings_json
)
SELECT
  gen_random_uuid(),
  '__SYSTEM_LEARNER_PAGES_CONFIG__',
  'page',
  'published',
  'System storage for Learner Portal page visibility toggles (Wiki & Favorites)',
  'not_urgent',
  0,
  0,
  jsonb_build_object(
    'learnerPagesConfig',
    jsonb_build_object(
      'showWikiPage', true,
      'showFavoritesPage', true
    ),
    'updatedAt',
    now()
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.contents WHERE title = '__SYSTEM_LEARNER_PAGES_CONFIG__'
);

-- 2) Perbarui RLS `contents_select_authenticated_and_staff` agar Learner dapat membaca `__SYSTEM_LEARNER_PAGES_CONFIG__`
DROP POLICY IF EXISTS "contents_select_authenticated_and_staff" ON public.contents;
CREATE POLICY "contents_select_authenticated_and_staff"
  ON public.contents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text IN ('admin', 'mentor')
    )
    OR title IN (
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__',
      '__SYSTEM_LEARNER_NOTIFICATIONS__',
      '__SYSTEM_USER_AVATARS__',
      '__SYSTEM_LEARNER_PAGES_CONFIG__'
    )
    OR EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.content_id = contents.id
        AND e.learner_id = auth.uid()
    )
  );

-- 3) Perbarui RPC `get_workspace_sync_watermark()` agar menyertakan `__SYSTEM_LEARNER_PAGES_CONFIG__`
CREATE OR REPLACE FUNCTION public.get_workspace_sync_watermark()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_contents_ts timestamptz;
  v_contents_count bigint := 0;
  v_own_profile_role text;
  v_own_profile_tier text;
  v_own_pro_expires_at timestamptz;
  v_own_profile_points integer := 0;
  v_own_avatar text;
  v_user_profile_ts timestamptz;
  v_inbox_ts timestamptz;
  v_inbox_count bigint := 0;
  v_issues_ts timestamptz;
  v_pro_settings_ts timestamptz;
  v_all_profiles_count bigint := 0;
  v_pro_requests_pending bigint := 0;
  v_admin_notifs_ts timestamptz;
  v_learner_notifs_ts timestamptz;
  v_learner_pages_ts timestamptz;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT
      role::text,
      subscription_tier,
      pro_expires_at,
      total_points,
      avatar_url
    INTO
      v_own_profile_role,
      v_own_profile_tier,
      v_own_pro_expires_at,
      v_own_profile_points,
      v_own_avatar
    FROM public.profiles
    WHERE id = v_uid;

    v_is_staff := COALESCE(v_own_profile_role, '') IN ('admin', 'mentor');

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      SELECT MAX(updated_at)
      INTO v_user_profile_ts
      FROM public.user_profiles
      WHERE user_id = v_uid
         OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''));
    END IF;
  END IF;

  IF v_is_staff THEN
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents;
  ELSE
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents
    WHERE (
      status = 'published'::public.content_status
      AND title NOT LIKE '__SYSTEM_%'
    )
    OR title IN (
      '__SYSTEM_MAINTENANCE_CONFIG__',
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__',
      '__SYSTEM_LEARNER_NOTIFICATIONS__',
      '__SYSTEM_USER_AVATARS__',
      '__SYSTEM_LEARNER_PAGES_CONFIG__'
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
      SELECT MAX(updated_at), COUNT(*)
      INTO v_inbox_ts, v_inbox_count
      FROM public.mentor_inbox_threads;
    END IF;
    IF to_regclass('public.mentor_reported_issues') IS NOT NULL THEN
      SELECT MAX(created_at) INTO v_issues_ts FROM public.mentor_reported_issues;
    END IF;
    IF to_regclass('public.learner_pro_settings') IS NOT NULL THEN
      SELECT updated_at INTO v_pro_settings_ts FROM public.learner_pro_settings WHERE id = 'default' LIMIT 1;
    END IF;
    SELECT MAX(updated_at)
    INTO v_learner_notifs_ts
    FROM public.contents
    WHERE title = '__SYSTEM_LEARNER_NOTIFICATIONS__';
    SELECT MAX(updated_at)
    INTO v_learner_pages_ts
    FROM public.contents
    WHERE title = '__SYSTEM_LEARNER_PAGES_CONFIG__';
  END IF;

  IF v_is_staff THEN
    SELECT COUNT(*) INTO v_all_profiles_count FROM public.profiles;
    IF to_regclass('public.pro_upgrade_requests') IS NOT NULL THEN
      SELECT COUNT(*) INTO v_pro_requests_pending
      FROM public.pro_upgrade_requests
      WHERE status = 'pending';
    END IF;
    SELECT MAX(updated_at)
    INTO v_admin_notifs_ts
    FROM public.contents
    WHERE title = '__SYSTEM_ADMIN_NOTIFICATIONS__';
  END IF;

  RETURN jsonb_build_object(
    'uid', v_uid,
    'staff', v_is_staff,
    'contents_ts', v_contents_ts,
    'contents_count', v_contents_count,
    'own_role', v_own_profile_role,
    'own_tier', v_own_profile_tier,
    'own_pro_expires_at', v_own_pro_expires_at,
    'own_points', v_own_profile_points,
    'own_avatar', v_own_avatar,
    'up_ts', v_user_profile_ts,
    'inbox_ts', v_inbox_ts,
    'inbox_count', v_inbox_count,
    'issues_ts', v_issues_ts,
    'pro_cfg_ts', v_pro_settings_ts,
    'staff_profiles_count', v_all_profiles_count,
    'pro_req_pending', v_pro_requests_pending,
    'admin_notifs_ts', v_admin_notifs_ts,
    'learner_notifs_ts', v_learner_notifs_ts,
    'learner_pages_ts', v_learner_pages_ts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_sync_watermark() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_sync_watermark() TO anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 017_packages_entitlements_trials_and_unlocks.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRATION 017:
--   1. Paket Berlangganan 3-Tier (FREE / Basic / Pro) dengan Benefit ON/OFF Nyata
--   2. Sistem Trial 7 Hari (1x per akun untuk member baru) & Bulanan 30 Hari
--   3. Pelacakan Paket Aktif, Billing Cycle & Riwayat Trial di `public.profiles`
--      + Proteksi trigger `protect_profiles_sensitive_fields()`
--   4. Dukungan Pembukaan Materi Satuan via Poin / Pembayaran (`public.learner_unlocked_items`)
--      + RLS ketat & Realtime Publication
--   5. Pembaruan RPC:
--      - `submit_pro_upgrade_request` (validasi 1x Trial 7 hari di sisi server + support item unlock)
--      - `admin_set_learner_pro` (support package_id, billing_cycle 7d_trial/30d, & item_unlock approval)
--      - `admin_extend_learner_pro` (support package_id & billing_cycle 7d_trial/30d)
--      - `unlock_module_with_points` (atomik: validasi saldo, potong poin, buka bab/kursus)
--      - `admin_grant_unlocked_item` (admin membuka akses materi satuan dari permintaan bayar / manual)
--      - `get_workspace_sync_watermark` (mempertahankan seluruh field 016 + status tier/trial/unlocks)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PERLUAS KOLOM `public.contents`, `public.profiles`, & `public.pro_upgrade_requests`
-- -----------------------------------------------------------------------------
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS is_pro_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_used_trial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS pro_package_id text,
  ADD COLUMN IF NOT EXISTS pro_billing_cycle text;

ALTER TABLE public.pro_upgrade_requests
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT '30d',
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS target_item_key text,
  ADD COLUMN IF NOT EXISTS target_item_title text;

CREATE INDEX IF NOT EXISTS idx_profiles_pro_package_id
  ON public.profiles (pro_package_id);

CREATE INDEX IF NOT EXISTS idx_pro_requests_user_trial
  ON public.pro_upgrade_requests (user_id, billing_cycle, status);

-- -----------------------------------------------------------------------------
-- 2. PERBARUI TRIGGER PROTEKSI KOLOM SENSITIF PADA `public.profiles`
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profiles_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass boolean := (
    current_setting('app.bypass_profile_protection', true) = 'on'
    OR current_user IN ('postgres', 'supabase_admin')
    OR auth.role() = 'service_role'
    OR public.is_admin()
  );
BEGIN
  IF v_bypass THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'learner'::public.user_role;
    NEW.subscription_tier := 'free';
    NEW.total_points := 0;
    NEW.pro_started_at := NULL;
    NEW.pro_expires_at := NULL;
    NEW.pro_package_name := NULL;
    NEW.pro_package_id := NULL;
    NEW.pro_billing_cycle := NULL;
    NEW.has_used_trial := false;
    NEW.trial_used_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
       OR NEW.total_points IS DISTINCT FROM OLD.total_points
       OR NEW.pro_started_at IS DISTINCT FROM OLD.pro_started_at
       OR NEW.pro_expires_at IS DISTINCT FROM OLD.pro_expires_at
       OR NEW.pro_package_name IS DISTINCT FROM OLD.pro_package_name
       OR NEW.pro_package_id IS DISTINCT FROM OLD.pro_package_id
       OR NEW.pro_billing_cycle IS DISTINCT FROM OLD.pro_billing_cycle
       OR NEW.has_used_trial IS DISTINCT FROM OLD.has_used_trial
       OR NEW.trial_used_at IS DISTINCT FROM OLD.trial_used_at THEN
      RAISE EXCEPTION 'Forbidden: only verified admin can modify role, subscription, points, or trial flags';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profiles_sensitive_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_sensitive_fields();

-- -----------------------------------------------------------------------------
-- 3. TABEL `public.learner_unlocked_items` (BUKA MATERI SATUAN VIA POIN / BAYAR)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learner_unlocked_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  item_key text NOT NULL,
  course_title text NOT NULL,
  chapter_id text,
  unlock_method text NOT NULL DEFAULT 'points' CHECK (unlock_method IN ('points', 'purchase', 'admin_grant')),
  points_spent integer NOT NULL DEFAULT 0,
  price_paid_idr integer NOT NULL DEFAULT 0,
  request_id uuid REFERENCES public.pro_upgrade_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_learner_unlocked_items_email_key
  ON public.learner_unlocked_items (lower(user_email), item_key);

CREATE INDEX IF NOT EXISTS idx_learner_unlocked_items_user
  ON public.learner_unlocked_items (user_id, created_at DESC);

ALTER TABLE public.learner_unlocked_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unlocked_items_select_own_or_staff" ON public.learner_unlocked_items;
CREATE POLICY "unlocked_items_select_own_or_staff"
  ON public.learner_unlocked_items FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(user_email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin_or_mentor()
  );

DROP POLICY IF EXISTS "unlocked_items_write_admin_only" ON public.learner_unlocked_items;
CREATE POLICY "unlocked_items_write_admin_only"
  ON public.learner_unlocked_items FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tambahkan ke supabase_realtime secara idempoten agar unlock sinkron instan
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'learner_unlocked_items'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.learner_unlocked_items;
    END IF;
  END IF;
END;
$$;

-- Backfill `has_used_trial` secara aman untuk akun yang sebelumnya pernah memakai trial 7 hari
DO $$
BEGIN
  PERFORM set_config('app.bypass_profile_protection', 'on', true);
  UPDATE public.profiles p
  SET
    has_used_trial = true,
    trial_used_at = COALESCE(p.trial_used_at, now())
  WHERE p.has_used_trial = false
    AND EXISTS (
      SELECT 1
      FROM public.pro_upgrade_requests r
      WHERE (r.user_id = p.id OR lower(r.user_email) = lower(p.email))
        AND (
          r.billing_cycle = '7d_trial'
          OR lower(COALESCE(r.package_name, '')) LIKE '%trial 7%'
        )
        AND COALESCE(r.status, 'pending') <> 'rejected'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. PERBARUI RPC `submit_pro_upgrade_request` (VALIDASI TRIAL 1x + ITEM UNLOCK)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_pro_upgrade_request(text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.submit_pro_upgrade_request(text, text, text, text, text, text, text, text, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_pro_upgrade_request(
  p_user_name text,
  p_package_id text,
  p_package_name text,
  p_price_label text,
  p_payment_method text DEFAULT 'QRIS / Transfer Manual',
  p_buyer_contact text DEFAULT '',
  p_proof_url text DEFAULT NULL,
  p_billing_cycle text DEFAULT '30d',
  p_duration_days integer DEFAULT 30,
  p_request_type text DEFAULT 'subscription',
  p_target_item_key text DEFAULT NULL,
  p_target_item_title text DEFAULT NULL
)
RETURNS public.pro_upgrade_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_has_used_trial boolean := false;
  v_cycle text := COALESCE(NULLIF(lower(trim(p_billing_cycle)), ''), '30d');
  v_req_type text := COALESCE(NULLIF(lower(trim(p_request_type)), ''), 'subscription');
  v_duration integer;
  v_req public.pro_upgrade_requests;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  IF v_cycle NOT IN ('7d_trial', '30d', 'single_item') THEN
    v_cycle := '30d';
  END IF;

  IF v_req_type NOT IN ('subscription', 'item_unlock') THEN
    v_req_type := CASE WHEN v_cycle = 'single_item' THEN 'item_unlock' ELSE 'subscription' END;
  END IF;

  v_duration := COALESCE(
    p_duration_days,
    CASE
      WHEN v_cycle = '7d_trial' THEN 7
      WHEN v_cycle = 'single_item' THEN 0
      ELSE 30
    END
  );

  SELECT
    email,
    COALESCE(NULLIF(trim(p_user_name), ''), full_name, split_part(email, '@', 1)),
    COALESCE(has_used_trial, false)
  INTO v_email, v_name, v_has_used_trial
  FROM public.profiles
  WHERE id = v_uid;

  v_email := lower(trim(COALESCE(v_email, auth.jwt()->>'email', '')));
  v_name := COALESCE(NULLIF(trim(v_name), ''), NULLIF(trim(p_user_name), ''), split_part(v_email, '@', 1), 'Learner');

  IF v_email = '' THEN
    RAISE EXCEPTION 'Profile email not found';
  END IF;

  -- Tolak mutlak jika user mencoba mengambil Trial 7 hari lebih dari 1x
  IF v_req_type = 'subscription' AND v_cycle = '7d_trial' THEN
    IF v_has_used_trial OR EXISTS (
      SELECT 1
      FROM public.pro_upgrade_requests r
      WHERE (r.user_id = v_uid OR lower(r.user_email) = v_email)
        AND r.billing_cycle = '7d_trial'
        AND COALESCE(r.status, 'pending') <> 'rejected'
    ) THEN
      RAISE EXCEPTION 'Paket percobaan 7 hari hanya berlaku 1x untuk member baru dan sudah pernah digunakan pada akun ini.';
    END IF;
  END IF;

  INSERT INTO public.pro_upgrade_requests (
    user_id, user_email, user_name, package_id, package_name, price_label,
    payment_method, buyer_contact, proof_url, status,
    billing_cycle, duration_days, request_type, target_item_key, target_item_title
  ) VALUES (
    v_uid,
    v_email,
    v_name,
    COALESCE(NULLIF(trim(p_package_id), ''), 'pkg-pro'),
    COALESCE(NULLIF(trim(p_package_name), ''), 'Pro'),
    COALESCE(NULLIF(trim(p_price_label), ''), 'Rp 150.000'),
    COALESCE(NULLIF(trim(p_payment_method), ''), 'QRIS / Transfer Manual'),
    COALESCE(trim(p_buyer_contact), ''),
    NULLIF(trim(COALESCE(p_proof_url, '')), ''),
    'pending',
    v_cycle,
    GREATEST(0, v_duration),
    v_req_type,
    NULLIF(trim(COALESCE(p_target_item_key, '')), ''),
    NULLIF(trim(COALESCE(p_target_item_title, '')), '')
  )
  RETURNING * INTO v_req;

  PERFORM public._append_admin_notification(
    jsonb_build_object(
      'id', 'notif-pro-req-' || v_req.id::text,
      'eventType', 'pro_subscribed',
      'title', CASE
        WHEN v_req_type = 'item_unlock' THEN 'Konfirmasi Buka Materi Satuan'
        WHEN v_cycle = '7d_trial' THEN 'Konfirmasi Trial 7 Hari Baru'
        ELSE 'Konfirmasi Pembayaran Paket Baru'
      END,
      'message', CASE
        WHEN v_req_type = 'item_unlock' THEN format(
          '%s mengajukan pembayaran buka materi "%s" (%s). Verifikasi di Daftar Akun.',
          v_name,
          COALESCE(v_req.target_item_title, v_req.package_name),
          v_req.price_label
        )
        ELSE format(
          'Yuhuu ... %s mengajukan pembayaran paket %s (%s • %s). Verifikasi pembayaran di Daftar Akun sebelum mengaktifkan akses.',
          v_name,
          v_req.package_name,
          CASE WHEN v_cycle = '7d_trial' THEN 'Trial 7 Hari' ELSE 'Bulanan 30 Hari' END,
          v_req.price_label
        )
      END,
      'userName', v_name,
      'userEmail', v_email,
      'packageName', v_req.package_name,
      'priceLabel', v_req.price_label,
      'requestId', v_req.id,
      'read', false,
      'createdAt', now()
    )
  );

  RETURN v_req;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_pro_upgrade_request(text, text, text, text, text, text, text, text, integer, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_pro_upgrade_request(text, text, text, text, text, text, text, text, integer, text, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. PERBARUI RPC `admin_set_learner_pro` (MENDUKUNG PACKAGE_ID, TRIAL 1x & ITEM UNLOCK)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_set_learner_pro(text, text, boolean, text, uuid);
DROP FUNCTION IF EXISTS public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer);
DROP FUNCTION IF EXISTS public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer, text, text);

CREATE OR REPLACE FUNCTION public.admin_set_learner_pro(
  p_target_email text,
  p_target_name text,
  p_is_pro boolean,
  p_package_name text DEFAULT 'Pro',
  p_request_id uuid DEFAULT NULL,
  p_started_at date DEFAULT NULL,
  p_due_at date DEFAULT NULL,
  p_duration_days integer DEFAULT NULL,
  p_package_id text DEFAULT NULL,
  p_billing_cycle text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_name text := COALESCE(NULLIF(trim(p_target_name), ''), split_part(v_clean_email, '@', 1), 'Learner');
  v_pkg text := COALESCE(NULLIF(trim(p_package_name), ''), 'Pro');
  v_pkg_id text := NULLIF(trim(COALESCE(p_package_id, '')), '');
  v_cycle text := NULLIF(lower(trim(COALESCE(p_billing_cycle, ''))), '');
  v_duration integer := COALESCE(p_duration_days, 30);
  v_req_type text := 'subscription';
  v_req_item_key text;
  v_req_item_title text;
  v_req_user_id uuid;
  v_username text;
  v_start_date date := COALESCE(p_started_at, (now() AT TIME ZONE 'Asia/Jakarta')::date);
  v_due_date date;
  v_start_ts timestamptz;
  v_expires_ts timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF p_request_id IS NOT NULL THEN
    SELECT
      COALESCE(request_type, 'subscription'),
      target_item_key,
      target_item_title,
      COALESCE(v_pkg_id, NULLIF(trim(package_id), '')),
      COALESCE(v_cycle, NULLIF(lower(trim(billing_cycle)), '')),
      COALESCE(p_duration_days, NULLIF(duration_days, 0), CASE WHEN billing_cycle = '7d_trial' THEN 7 ELSE 30 END),
      user_id
    INTO
      v_req_type,
      v_req_item_key,
      v_req_item_title,
      v_pkg_id,
      v_cycle,
      v_duration,
      v_req_user_id
    FROM public.pro_upgrade_requests
    WHERE id = p_request_id;
  END IF;

  IF v_clean_email = '' THEN
    RETURN false;
  END IF;

  -- Jika request adalah buka materi satuan, jangan ubah paket/tanggal langganan utama user
  IF v_req_type = 'item_unlock' THEN
    IF p_is_pro AND v_req_item_key IS NOT NULL THEN
      INSERT INTO public.learner_unlocked_items (
        user_id, user_email, item_key, course_title, chapter_id,
        unlock_method, points_spent, price_paid_idr, request_id
      ) VALUES (
        COALESCE(
          v_req_user_id,
          (SELECT id FROM public.profiles WHERE lower(email) = v_clean_email LIMIT 1)
        ),
        v_clean_email,
        v_req_item_key,
        COALESCE(v_req_item_title, v_pkg),
        NULL,
        'purchase',
        0,
        0,
        p_request_id
      )
      ON CONFLICT (lower(user_email), item_key) DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, public.learner_unlocked_items.user_id),
        unlock_method = 'purchase',
        request_id = COALESCE(EXCLUDED.request_id, public.learner_unlocked_items.request_id);
    END IF;

    IF p_request_id IS NOT NULL THEN
      UPDATE public.pro_upgrade_requests
      SET
        status = CASE WHEN p_is_pro THEN 'approved' ELSE 'rejected' END,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
      WHERE id = p_request_id;
    END IF;

    RETURN true;
  END IF;

  v_cycle := COALESCE(v_cycle, CASE WHEN COALESCE(v_duration, 30) <= 8 THEN '7d_trial' ELSE '30d' END);
  IF v_pkg_id IS NULL THEN
    v_pkg_id := CASE
      WHEN lower(v_pkg) LIKE '%basic%' THEN 'pkg-basic'
      WHEN lower(v_pkg) LIKE '%free%' THEN 'pkg-free'
      ELSE 'pkg-pro'
    END;
  END IF;

  v_due_date := COALESCE(p_due_at, v_start_date + GREATEST(1, COALESCE(v_duration, 30)));
  IF v_due_date < v_start_date THEN
    v_due_date := v_start_date + GREATEST(1, COALESCE(v_duration, 30));
  END IF;

  v_start_ts := (v_start_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  v_expires_ts := ((v_due_date::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta');

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  IF p_is_pro THEN
    UPDATE public.profiles
    SET
      subscription_tier = 'pro',
      pro_started_at = v_start_ts,
      pro_expires_at = v_expires_ts,
      pro_package_name = v_pkg,
      pro_package_id = v_pkg_id,
      pro_billing_cycle = v_cycle,
      has_used_trial = CASE WHEN v_cycle = '7d_trial' THEN true ELSE has_used_trial END,
      trial_used_at = CASE WHEN v_cycle = '7d_trial' THEN COALESCE(trial_used_at, now()) ELSE trial_used_at END
    WHERE lower(email) = v_clean_email;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      UPDATE public.user_profiles
      SET
        perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object(
          'is_pro', true,
          'pro_started_at', v_start_ts,
          'pro_expires_at', v_expires_ts,
          'pro_package_name', v_pkg,
          'pro_package_id', v_pkg_id,
          'pro_billing_cycle', v_cycle
        ),
        updated_at = timezone('utc', now())
      WHERE lower(email) = v_clean_email;

      SELECT username
      INTO v_username
      FROM public.user_profiles
      WHERE lower(email) = v_clean_email
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;

    IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
      INSERT INTO public.user_subscriptions (
        username, plan_tier, status, started_at, due_at, payment_method, renewal_status, updated_at
      ) VALUES (
        v_username,
        'PRO',
        'aktif',
        v_start_date,
        v_due_date,
        'admin verified',
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
  ELSIF p_request_id IS NULL THEN
    -- Cabut akses hanya saat explicit revoke (p_request_id IS NULL), bukan saat Admin menolak request upgrade baru dari member yang masih aktif paket lain.
    -- JANGAN mereset `has_used_trial` agar trial tetap 1x.
    UPDATE public.profiles
    SET
      subscription_tier = 'free',
      pro_expires_at = NULL,
      pro_package_id = NULL,
      pro_package_name = NULL,
      pro_billing_cycle = NULL
    WHERE lower(email) = v_clean_email;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      UPDATE public.user_profiles
      SET
        perks = (COALESCE(perks, '{}'::jsonb) - 'pro_expires_at' - 'pro_package_id' - 'pro_billing_cycle')
          || jsonb_build_object('is_pro', false),
        updated_at = timezone('utc', now())
      WHERE lower(email) = v_clean_email;

      SELECT username
      INTO v_username
      FROM public.user_profiles
      WHERE lower(email) = v_clean_email
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;

    IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
      UPDATE public.user_subscriptions
      SET
        plan_tier = 'Free',
        status = 'nonaktif',
        renewal_status = 'nonaktif',
        updated_at = timezone('utc', now())
      WHERE lower(username) = lower(v_username);
    END IF;
  END IF;

  IF p_request_id IS NOT NULL THEN
    UPDATE public.pro_upgrade_requests
    SET
      status = CASE WHEN p_is_pro THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = p_request_id;
  END IF;

  IF p_is_pro THEN
    PERFORM public._append_admin_notification(
      jsonb_build_object(
        'id', 'notif-pro-active-' || encode(convert_to(v_clean_email || '-' || extract(epoch from now())::text, 'UTF8'), 'hex'),
        'eventType', 'pro_subscribed',
        'title', 'Yuhuu! ⚡ Paket Berbayar Aktif',
        'message', format(
          'Yuhuu! %s telah aktif pada paket %s (%s • berlaku s/d %s).',
          v_clean_name,
          v_pkg,
          CASE WHEN v_cycle = '7d_trial' THEN 'Trial 7 Hari' ELSE 'Bulanan' END,
          to_char(v_due_date, 'DD Mon YYYY')
        ),
        'userName', v_clean_name,
        'userEmail', v_clean_email,
        'packageName', v_pkg,
        'read', false,
        'createdAt', now()
      )
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. PERBARUI RPC `admin_extend_learner_pro`
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_extend_learner_pro(text, text, date, date, text);
DROP FUNCTION IF EXISTS public.admin_extend_learner_pro(text, text, date, date, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_extend_learner_pro(
  p_target_email text,
  p_target_name text,
  p_started_at date,
  p_due_at date,
  p_package_name text DEFAULT 'Pro',
  p_package_id text DEFAULT NULL,
  p_billing_cycle text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_name text := COALESCE(NULLIF(trim(p_target_name), ''), split_part(v_clean_email, '@', 1), 'Learner');
  v_pkg text := COALESCE(NULLIF(trim(p_package_name), ''), 'Pro');
  v_pkg_id text := NULLIF(trim(COALESCE(p_package_id, '')), '');
  v_start_date date := COALESCE(p_started_at, (now() AT TIME ZONE 'Asia/Jakarta')::date);
  v_due_date date;
  v_cycle text;
  v_start_ts timestamptz;
  v_expires_ts timestamptz;
  v_username text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email target wajib diisi.');
  END IF;

  IF p_due_at IS NOT NULL AND p_due_at >= v_start_date THEN
    v_due_date := p_due_at;
  ELSE
    v_due_date := v_start_date + 30;
  END IF;

  v_cycle := COALESCE(
    NULLIF(lower(trim(COALESCE(p_billing_cycle, ''))), ''),
    CASE WHEN (v_due_date - v_start_date) <= 8 THEN '7d_trial' ELSE '30d' END
  );

  IF v_pkg_id IS NULL THEN
    v_pkg_id := CASE
      WHEN lower(v_pkg) LIKE '%basic%' THEN 'pkg-basic'
      WHEN lower(v_pkg) LIKE '%free%' THEN 'pkg-free'
      ELSE 'pkg-pro'
    END;
  END IF;

  v_start_ts := (v_start_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  v_expires_ts := ((v_due_date::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta');

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET
    subscription_tier = 'pro',
    pro_started_at = v_start_ts,
    pro_expires_at = v_expires_ts,
    pro_package_name = v_pkg,
    pro_package_id = v_pkg_id,
    pro_billing_cycle = v_cycle,
    has_used_trial = CASE WHEN v_cycle = '7d_trial' THEN true ELSE has_used_trial END,
    trial_used_at = CASE WHEN v_cycle = '7d_trial' THEN COALESCE(trial_used_at, now()) ELSE trial_used_at END
  WHERE lower(email) = v_clean_email;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    UPDATE public.user_profiles
    SET
      perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object(
        'is_pro', true,
        'pro_started_at', v_start_ts,
        'pro_expires_at', v_expires_ts,
        'pro_package_name', v_pkg,
        'pro_package_id', v_pkg_id,
        'pro_billing_cycle', v_cycle
      ),
      updated_at = timezone('utc', now())
    WHERE lower(email) = v_clean_email;

    SELECT username
    INTO v_username
    FROM public.user_profiles
    WHERE lower(email) = v_clean_email
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (
      username, plan_tier, status, started_at, due_at, payment_method, renewal_status, updated_at
    ) VALUES (
      v_username,
      'PRO',
      'aktif',
      v_start_date,
      v_due_date,
      'manual renewal by admin',
      'diperpanjang manual',
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

  PERFORM public._append_admin_notification(
    jsonb_build_object(
      'id', 'notif-pro-renew-' || encode(convert_to(v_clean_email || '-' || extract(epoch from now())::text, 'UTF8'), 'hex'),
      'eventType', 'pro_subscribed',
      'title', '🔄 Aktivasi / Perpanjangan Paket Berhasil',
      'message', format(
        'Admin mengaktifkan / memperpanjang paket %s untuk %s hingga jatuh tempo %s.',
        v_pkg,
        v_clean_name,
        to_char(v_due_date, 'DD Mon YYYY')
      ),
      'userName', v_clean_name,
      'userEmail', v_clean_email,
      'packageName', v_pkg,
      'read', false,
      'createdAt', now()
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'pro_started_at', v_start_ts,
    'pro_expires_at', v_expires_ts,
    'pro_package_name', v_pkg,
    'pro_package_id', v_pkg_id,
    'pro_billing_cycle', v_cycle,
    'started_date', v_start_date,
    'due_date', v_due_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_extend_learner_pro(text, text, date, date, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_learner_pro(text, text, date, date, text, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. RPC `unlock_module_with_points` (BUKA MATERI LANJUTAN DENGAN POIN SISWA)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_module_with_points(
  p_course_title text,
  p_chapter_id text DEFAULT NULL,
  p_points_cost integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_clean_course text := lower(trim(COALESCE(p_course_title, '')));
  v_clean_chapter text := NULLIF(trim(COALESCE(p_chapter_id, '')), '');
  v_item_key text;
  v_cost integer := GREATEST(1, COALESCE(p_points_cost, 50));
  v_current_points integer := 0;
  v_new_points integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Silakan login terlebih dahulu.');
  END IF;

  IF v_clean_course = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Judul materi tidak valid.');
  END IF;

  v_item_key := CASE
    WHEN v_clean_chapter IS NOT NULL THEN 'chapter::' || v_clean_course || '::' || v_clean_chapter
    ELSE 'course::' || v_clean_course
  END;

  SELECT lower(trim(email)), COALESCE(total_points, 0)
  INTO v_email, v_current_points
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  v_email := COALESCE(NULLIF(v_email, ''), lower(trim(COALESCE(auth.jwt()->>'email', ''))));
  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email profil tidak ditemukan.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.learner_unlocked_items
    WHERE (user_id = v_uid OR lower(user_email) = v_email)
      AND item_key = v_item_key
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_unlocked', true,
      'new_points', v_current_points,
      'item_key', v_item_key
    );
  END IF;

  IF v_current_points < v_cost THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('Saldo poin tidak cukup. Butuh %s pts (saldo: %s pts).', v_cost, v_current_points)
    );
  END IF;

  v_new_points := GREATEST(0, v_current_points - v_cost);

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET total_points = v_new_points
  WHERE id = v_uid;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    UPDATE public.user_profiles
    SET
      perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object('total_points', v_new_points),
      updated_at = timezone('utc', now())
    WHERE user_id = v_uid OR lower(email) = v_email;
  END IF;

  INSERT INTO public.learner_unlocked_items (
    user_id, user_email, item_key, course_title, chapter_id,
    unlock_method, points_spent, price_paid_idr
  ) VALUES (
    v_uid,
    v_email,
    v_item_key,
    trim(p_course_title),
    v_clean_chapter,
    'points',
    v_cost,
    0
  )
  ON CONFLICT (lower(user_email), item_key) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'new_points', v_new_points,
    'item_key', v_item_key
  );
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_module_with_points(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_module_with_points(text, text, integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- 8. RPC `admin_grant_unlocked_item` (ADMIN MEMBUKA MATERI SATUAN UNTUK SISWA)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_grant_unlocked_item(
  p_target_email text,
  p_item_key text,
  p_course_title text,
  p_chapter_id text DEFAULT NULL,
  p_request_id uuid DEFAULT NULL,
  p_price_paid_idr integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_item_key text := trim(COALESCE(p_item_key, ''));
  v_target_uid uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' OR v_item_key = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email dan item_key wajib diisi.');
  END IF;

  SELECT id INTO v_target_uid
  FROM public.profiles
  WHERE lower(email) = v_clean_email
  LIMIT 1;

  INSERT INTO public.learner_unlocked_items (
    user_id, user_email, item_key, course_title, chapter_id,
    unlock_method, points_spent, price_paid_idr, request_id
  ) VALUES (
    v_target_uid,
    v_clean_email,
    v_item_key,
    COALESCE(NULLIF(trim(p_course_title), ''), 'Materi Satuan'),
    NULLIF(trim(COALESCE(p_chapter_id, '')), ''),
    CASE WHEN p_request_id IS NOT NULL THEN 'purchase' ELSE 'admin_grant' END,
    0,
    GREATEST(0, COALESCE(p_price_paid_idr, 0)),
    p_request_id
  )
  ON CONFLICT (lower(user_email), item_key) DO UPDATE SET
    user_id = COALESCE(EXCLUDED.user_id, public.learner_unlocked_items.user_id),
    unlock_method = EXCLUDED.unlock_method,
    price_paid_idr = GREATEST(public.learner_unlocked_items.price_paid_idr, EXCLUDED.price_paid_idr),
    request_id = COALESCE(EXCLUDED.request_id, public.learner_unlocked_items.request_id);

  IF p_request_id IS NOT NULL THEN
    UPDATE public.pro_upgrade_requests
    SET
      status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'item_key', v_item_key
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_unlocked_item(text, text, text, text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_unlocked_item(text, text, text, text, uuid, integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- 9. PERBARUI `get_workspace_sync_watermark()` (PERTAHANKAN SEMUA FIELD 016 + TIER V2)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_workspace_sync_watermark()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
  v_contents_ts timestamptz;
  v_contents_count bigint := 0;
  v_own_profile_role text;
  v_own_profile_tier text;
  v_own_pro_expires_at timestamptz;
  v_own_profile_points integer := 0;
  v_own_avatar text;
  v_own_pkg_id text;
  v_own_billing_cycle text;
  v_own_used_trial boolean := false;
  v_own_unlocked_count bigint := 0;
  v_own_unlocked_ts timestamptz;
  v_user_profile_ts timestamptz;
  v_inbox_ts timestamptz;
  v_inbox_count bigint := 0;
  v_issues_ts timestamptz;
  v_pro_settings_ts timestamptz;
  v_all_profiles_count bigint := 0;
  v_pro_requests_pending bigint := 0;
  v_admin_notifs_ts timestamptz;
  v_learner_notifs_ts timestamptz;
  v_learner_pages_ts timestamptz;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT
      role::text,
      subscription_tier,
      pro_expires_at,
      total_points,
      avatar_url,
      pro_package_id,
      pro_billing_cycle,
      COALESCE(has_used_trial, false)
    INTO
      v_own_profile_role,
      v_own_profile_tier,
      v_own_pro_expires_at,
      v_own_profile_points,
      v_own_avatar,
      v_own_pkg_id,
      v_own_billing_cycle,
      v_own_used_trial
    FROM public.profiles
    WHERE id = v_uid;

    v_is_staff := COALESCE(v_own_profile_role, '') IN ('admin', 'mentor');

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      SELECT MAX(updated_at)
      INTO v_user_profile_ts
      FROM public.user_profiles
      WHERE user_id = v_uid
         OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''));
    END IF;

    IF to_regclass('public.learner_unlocked_items') IS NOT NULL THEN
      SELECT COUNT(*), MAX(created_at)
      INTO v_own_unlocked_count, v_own_unlocked_ts
      FROM public.learner_unlocked_items
      WHERE user_id = v_uid
         OR lower(user_email) = lower(COALESCE(auth.jwt()->>'email', ''));
    END IF;
  END IF;

  IF v_is_staff THEN
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents;
  ELSE
    SELECT MAX(updated_at), COUNT(*)
    INTO v_contents_ts, v_contents_count
    FROM public.contents
    WHERE (
      status = 'published'::public.content_status
      AND title NOT LIKE '__SYSTEM_%'
    )
    OR title IN (
      '__SYSTEM_MAINTENANCE_CONFIG__',
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__',
      '__SYSTEM_LEARNER_NOTIFICATIONS__',
      '__SYSTEM_USER_AVATARS__',
      '__SYSTEM_LEARNER_PAGES_CONFIG__'
    );
  END IF;

  IF v_uid IS NOT NULL THEN
    IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
      SELECT MAX(updated_at), COUNT(*)
      INTO v_inbox_ts, v_inbox_count
      FROM public.mentor_inbox_threads;
    END IF;
    IF to_regclass('public.mentor_reported_issues') IS NOT NULL THEN
      SELECT MAX(created_at) INTO v_issues_ts FROM public.mentor_reported_issues;
    END IF;
    IF to_regclass('public.learner_pro_settings') IS NOT NULL THEN
      SELECT updated_at INTO v_pro_settings_ts FROM public.learner_pro_settings WHERE id = 'default' LIMIT 1;
    END IF;
    SELECT MAX(updated_at)
    INTO v_learner_notifs_ts
    FROM public.contents
    WHERE title = '__SYSTEM_LEARNER_NOTIFICATIONS__';
    SELECT MAX(updated_at)
    INTO v_learner_pages_ts
    FROM public.contents
    WHERE title = '__SYSTEM_LEARNER_PAGES_CONFIG__';
  END IF;

  IF v_is_staff THEN
    SELECT COUNT(*) INTO v_all_profiles_count FROM public.profiles;
    IF to_regclass('public.pro_upgrade_requests') IS NOT NULL THEN
      SELECT COUNT(*) INTO v_pro_requests_pending
      FROM public.pro_upgrade_requests
      WHERE status = 'pending';
    END IF;
    SELECT MAX(updated_at)
    INTO v_admin_notifs_ts
    FROM public.contents
    WHERE title = '__SYSTEM_ADMIN_NOTIFICATIONS__';
  END IF;

  RETURN jsonb_build_object(
    'uid', v_uid,
    'staff', v_is_staff,
    'contents_ts', v_contents_ts,
    'contents_count', v_contents_count,
    'own_role', v_own_profile_role,
    'own_tier', v_own_profile_tier,
    'own_pro_expires_at', v_own_pro_expires_at,
    'own_points', v_own_profile_points,
    'own_avatar', v_own_avatar,
    'own_pkg_id', v_own_pkg_id,
    'own_billing_cycle', v_own_billing_cycle,
    'own_used_trial', v_own_used_trial,
    'own_unlocked_count', v_own_unlocked_count,
    'own_unlocked_ts', v_own_unlocked_ts,
    'up_ts', v_user_profile_ts,
    'inbox_ts', v_inbox_ts,
    'inbox_count', v_inbox_count,
    'issues_ts', v_issues_ts,
    'pro_cfg_ts', v_pro_settings_ts,
    'staff_profiles_count', v_all_profiles_count,
    'pro_req_pending', v_pro_requests_pending,
    'admin_notifs_ts', v_admin_notifs_ts,
    'learner_notifs_ts', v_learner_notifs_ts,
    'learner_pages_ts', v_learner_pages_ts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_sync_watermark() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_sync_watermark() TO anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 018_trial_3_days_support.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRATION 018:
--   1. Tambah dukungan Trial 3 Hari (`3d_trial`) di samping Trial 7 Hari (`7d_trial`)
--      dengan aturan 1x pakai untuk member baru (jika salah satu trial dipakai,
--      akun ditandai `has_used_trial = true` dan pilihan aktif selanjutnya 30 hari)
--   2. Perbarui RPC `submit_pro_upgrade_request`, `admin_set_learner_pro`, &
--      `admin_extend_learner_pro` (tanpa mengubah signature parameter agar aman dari overload)
-- =============================================================================

-- 1) Backfill `has_used_trial` bila ada request/histori Trial 3 hari maupun 7 hari
DO $$
BEGIN
  PERFORM set_config('app.bypass_profile_protection', 'on', true);
  UPDATE public.profiles p
  SET
    has_used_trial = true,
    trial_used_at = COALESCE(p.trial_used_at, now())
  WHERE p.has_used_trial = false
    AND EXISTS (
      SELECT 1
      FROM public.pro_upgrade_requests r
      WHERE (r.user_id = p.id OR lower(r.user_email) = lower(p.email))
        AND (
          r.billing_cycle IN ('3d_trial', '7d_trial')
          OR lower(COALESCE(r.package_name, '')) LIKE '%trial 3%'
          OR lower(COALESCE(r.package_name, '')) LIKE '%trial 7%'
        )
        AND COALESCE(r.status, 'pending') <> 'rejected'
    );
END;
$$;

-- 2) Perbarui `submit_pro_upgrade_request` untuk menerima '3d_trial' & validasi 1x pakai
CREATE OR REPLACE FUNCTION public.submit_pro_upgrade_request(
  p_user_name text,
  p_package_id text,
  p_package_name text,
  p_price_label text,
  p_payment_method text DEFAULT 'QRIS / Transfer Manual',
  p_buyer_contact text DEFAULT '',
  p_proof_url text DEFAULT NULL,
  p_billing_cycle text DEFAULT '30d',
  p_duration_days integer DEFAULT 30,
  p_request_type text DEFAULT 'subscription',
  p_target_item_key text DEFAULT NULL,
  p_target_item_title text DEFAULT NULL
)
RETURNS public.pro_upgrade_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_has_used_trial boolean := false;
  v_cycle text := COALESCE(NULLIF(lower(trim(p_billing_cycle)), ''), '30d');
  v_req_type text := COALESCE(NULLIF(lower(trim(p_request_type)), ''), 'subscription');
  v_duration integer;
  v_req public.pro_upgrade_requests;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  IF v_cycle NOT IN ('3d_trial', '7d_trial', '30d', 'single_item') THEN
    v_cycle := '30d';
  END IF;

  IF v_req_type NOT IN ('subscription', 'item_unlock') THEN
    v_req_type := CASE WHEN v_cycle = 'single_item' THEN 'item_unlock' ELSE 'subscription' END;
  END IF;

  v_duration := COALESCE(
    p_duration_days,
    CASE
      WHEN v_cycle = '3d_trial' THEN 3
      WHEN v_cycle = '7d_trial' THEN 7
      WHEN v_cycle = 'single_item' THEN 0
      ELSE 30
    END
  );

  SELECT
    email,
    COALESCE(NULLIF(trim(p_user_name), ''), full_name, split_part(email, '@', 1)),
    COALESCE(has_used_trial, false)
  INTO v_email, v_name, v_has_used_trial
  FROM public.profiles
  WHERE id = v_uid;

  v_email := lower(trim(COALESCE(v_email, auth.jwt()->>'email', '')));
  v_name := COALESCE(NULLIF(trim(v_name), ''), NULLIF(trim(p_user_name), ''), split_part(v_email, '@', 1), 'Learner');

  IF v_email = '' THEN
    RAISE EXCEPTION 'Profile email not found';
  END IF;

  -- Tolak mutlak jika user mencoba mengambil Trial (3 hari / 7 hari) lebih dari 1x
  IF v_req_type = 'subscription' AND v_cycle IN ('3d_trial', '7d_trial') THEN
    IF v_has_used_trial OR EXISTS (
      SELECT 1
      FROM public.pro_upgrade_requests r
      WHERE (r.user_id = v_uid OR lower(r.user_email) = v_email)
        AND r.billing_cycle IN ('3d_trial', '7d_trial')
        AND COALESCE(r.status, 'pending') <> 'rejected'
    ) THEN
      RAISE EXCEPTION 'Paket percobaan (3 hari / 7 hari) hanya berlaku 1x untuk member baru dan sudah pernah digunakan pada akun ini.';
    END IF;
  END IF;

  INSERT INTO public.pro_upgrade_requests (
    user_id, user_email, user_name, package_id, package_name, price_label,
    payment_method, buyer_contact, proof_url, status,
    billing_cycle, duration_days, request_type, target_item_key, target_item_title
  ) VALUES (
    v_uid,
    v_email,
    v_name,
    COALESCE(NULLIF(trim(p_package_id), ''), 'pkg-pro'),
    COALESCE(NULLIF(trim(p_package_name), ''), 'Pro'),
    COALESCE(NULLIF(trim(p_price_label), ''), 'Rp 150.000'),
    COALESCE(NULLIF(trim(p_payment_method), ''), 'QRIS / Transfer Manual'),
    COALESCE(trim(p_buyer_contact), ''),
    NULLIF(trim(COALESCE(p_proof_url, '')), ''),
    'pending',
    v_cycle,
    GREATEST(0, v_duration),
    v_req_type,
    NULLIF(trim(COALESCE(p_target_item_key, '')), ''),
    NULLIF(trim(COALESCE(p_target_item_title, '')), '')
  )
  RETURNING * INTO v_req;

  PERFORM public._append_admin_notification(
    jsonb_build_object(
      'id', 'notif-pro-req-' || v_req.id::text,
      'eventType', 'pro_subscribed',
      'title', CASE
        WHEN v_req_type = 'item_unlock' THEN 'Konfirmasi Buka Materi Satuan'
        WHEN v_cycle = '3d_trial' THEN 'Konfirmasi Trial 3 Hari Baru'
        WHEN v_cycle = '7d_trial' THEN 'Konfirmasi Trial 7 Hari Baru'
        ELSE 'Konfirmasi Pembayaran Paket Baru'
      END,
      'message', CASE
        WHEN v_req_type = 'item_unlock' THEN format(
          '%s mengajukan pembayaran buka materi "%s" (%s). Verifikasi di Daftar Akun.',
          v_name,
          COALESCE(v_req.target_item_title, v_req.package_name),
          v_req.price_label
        )
        ELSE format(
          'Yuhuu ... %s mengajukan pembayaran paket %s (%s • %s). Verifikasi pembayaran di Daftar Akun sebelum mengaktifkan akses.',
          v_name,
          v_req.package_name,
          CASE
            WHEN v_cycle = '3d_trial' THEN 'Trial 3 Hari'
            WHEN v_cycle = '7d_trial' THEN 'Trial 7 Hari'
            ELSE 'Bulanan 30 Hari'
          END,
          v_req.price_label
        )
      END,
      'userName', v_name,
      'userEmail', v_email,
      'packageName', v_req.package_name,
      'priceLabel', v_req.price_label,
      'requestId', v_req.id,
      'read', false,
      'createdAt', now()
    )
  );

  RETURN v_req;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_pro_upgrade_request(text, text, text, text, text, text, text, text, integer, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_pro_upgrade_request(text, text, text, text, text, text, text, text, integer, text, text, text) TO authenticated;

-- 3) Perbarui `admin_set_learner_pro` untuk mendukung '3d_trial' & '7d_trial'
CREATE OR REPLACE FUNCTION public.admin_set_learner_pro(
  p_target_email text,
  p_target_name text,
  p_is_pro boolean,
  p_package_name text DEFAULT 'Pro',
  p_request_id uuid DEFAULT NULL,
  p_started_at date DEFAULT NULL,
  p_due_at date DEFAULT NULL,
  p_duration_days integer DEFAULT NULL,
  p_package_id text DEFAULT NULL,
  p_billing_cycle text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_name text := COALESCE(NULLIF(trim(p_target_name), ''), split_part(v_clean_email, '@', 1), 'Learner');
  v_pkg text := COALESCE(NULLIF(trim(p_package_name), ''), 'Pro');
  v_pkg_id text := NULLIF(trim(COALESCE(p_package_id, '')), '');
  v_cycle text := NULLIF(lower(trim(COALESCE(p_billing_cycle, ''))), '');
  v_duration integer := COALESCE(p_duration_days, 30);
  v_req_type text := 'subscription';
  v_req_item_key text;
  v_req_item_title text;
  v_req_user_id uuid;
  v_username text;
  v_start_date date := COALESCE(p_started_at, (now() AT TIME ZONE 'Asia/Jakarta')::date);
  v_due_date date;
  v_start_ts timestamptz;
  v_expires_ts timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF p_request_id IS NOT NULL THEN
    SELECT
      COALESCE(request_type, 'subscription'),
      target_item_key,
      target_item_title,
      COALESCE(v_pkg_id, NULLIF(trim(package_id), '')),
      COALESCE(v_cycle, NULLIF(lower(trim(billing_cycle)), '')),
      COALESCE(
        p_duration_days,
        NULLIF(duration_days, 0),
        CASE
          WHEN billing_cycle = '3d_trial' THEN 3
          WHEN billing_cycle = '7d_trial' THEN 7
          ELSE 30
        END
      ),
      user_id
    INTO
      v_req_type,
      v_req_item_key,
      v_req_item_title,
      v_pkg_id,
      v_cycle,
      v_duration,
      v_req_user_id
    FROM public.pro_upgrade_requests
    WHERE id = p_request_id;
  END IF;

  IF v_clean_email = '' THEN
    RETURN false;
  END IF;

  IF v_req_type = 'item_unlock' THEN
    IF p_is_pro AND v_req_item_key IS NOT NULL THEN
      INSERT INTO public.learner_unlocked_items (
        user_id, user_email, item_key, course_title, chapter_id,
        unlock_method, points_spent, price_paid_idr, request_id
      ) VALUES (
        COALESCE(
          v_req_user_id,
          (SELECT id FROM public.profiles WHERE lower(email) = v_clean_email LIMIT 1)
        ),
        v_clean_email,
        v_req_item_key,
        COALESCE(v_req_item_title, v_pkg),
        NULL,
        'purchase',
        0,
        0,
        p_request_id
      )
      ON CONFLICT (lower(user_email), item_key) DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, public.learner_unlocked_items.user_id),
        unlock_method = 'purchase',
        request_id = COALESCE(EXCLUDED.request_id, public.learner_unlocked_items.request_id);
    END IF;

    IF p_request_id IS NOT NULL THEN
      UPDATE public.pro_upgrade_requests
      SET
        status = CASE WHEN p_is_pro THEN 'approved' ELSE 'rejected' END,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
      WHERE id = p_request_id;
    END IF;

    RETURN true;
  END IF;

  v_cycle := COALESCE(
    v_cycle,
    CASE
      WHEN COALESCE(v_duration, 30) <= 4 THEN '3d_trial'
      WHEN COALESCE(v_duration, 30) <= 8 THEN '7d_trial'
      ELSE '30d'
    END
  );

  IF v_pkg_id IS NULL THEN
    v_pkg_id := CASE
      WHEN lower(v_pkg) LIKE '%basic%' THEN 'pkg-basic'
      WHEN lower(v_pkg) LIKE '%free%' THEN 'pkg-free'
      ELSE 'pkg-pro'
    END;
  END IF;

  v_due_date := COALESCE(p_due_at, v_start_date + GREATEST(1, COALESCE(v_duration, 30)));
  IF v_due_date < v_start_date THEN
    v_due_date := v_start_date + GREATEST(1, COALESCE(v_duration, 30));
  END IF;

  v_start_ts := (v_start_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  v_expires_ts := ((v_due_date::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta');

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  IF p_is_pro THEN
    UPDATE public.profiles
    SET
      subscription_tier = 'pro',
      pro_started_at = v_start_ts,
      pro_expires_at = v_expires_ts,
      pro_package_name = v_pkg,
      pro_package_id = v_pkg_id,
      pro_billing_cycle = v_cycle,
      has_used_trial = CASE WHEN v_cycle IN ('3d_trial', '7d_trial') THEN true ELSE has_used_trial END,
      trial_used_at = CASE WHEN v_cycle IN ('3d_trial', '7d_trial') THEN COALESCE(trial_used_at, now()) ELSE trial_used_at END
    WHERE lower(email) = v_clean_email;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      UPDATE public.user_profiles
      SET
        perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object(
          'is_pro', true,
          'pro_started_at', v_start_ts,
          'pro_expires_at', v_expires_ts,
          'pro_package_name', v_pkg,
          'pro_package_id', v_pkg_id,
          'pro_billing_cycle', v_cycle
        ),
        updated_at = timezone('utc', now())
      WHERE lower(email) = v_clean_email;

      SELECT username
      INTO v_username
      FROM public.user_profiles
      WHERE lower(email) = v_clean_email
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;

    IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
      INSERT INTO public.user_subscriptions (
        username, plan_tier, status, started_at, due_at, payment_method, renewal_status, updated_at
      ) VALUES (
        v_username,
        'PRO',
        'aktif',
        v_start_date,
        v_due_date,
        'admin verified',
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
  ELSIF p_request_id IS NULL THEN
    -- Cabut akses hanya saat explicit revoke (p_request_id IS NULL); JANGAN mereset `has_used_trial`
    UPDATE public.profiles
    SET
      subscription_tier = 'free',
      pro_expires_at = NULL,
      pro_package_id = NULL,
      pro_package_name = NULL,
      pro_billing_cycle = NULL
    WHERE lower(email) = v_clean_email;

    IF to_regclass('public.user_profiles') IS NOT NULL THEN
      UPDATE public.user_profiles
      SET
        perks = (COALESCE(perks, '{}'::jsonb) - 'pro_expires_at' - 'pro_package_id' - 'pro_billing_cycle')
          || jsonb_build_object('is_pro', false),
        updated_at = timezone('utc', now())
      WHERE lower(email) = v_clean_email;

      SELECT username
      INTO v_username
      FROM public.user_profiles
      WHERE lower(email) = v_clean_email
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;

    IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
      UPDATE public.user_subscriptions
      SET
        plan_tier = 'Free',
        status = 'nonaktif',
        renewal_status = 'nonaktif',
        updated_at = timezone('utc', now())
      WHERE lower(username) = lower(v_username);
    END IF;
  END IF;

  IF p_request_id IS NOT NULL THEN
    UPDATE public.pro_upgrade_requests
    SET
      status = CASE WHEN p_is_pro THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = p_request_id;
  END IF;

  IF p_is_pro THEN
    PERFORM public._append_admin_notification(
      jsonb_build_object(
        'id', 'notif-pro-active-' || encode(convert_to(v_clean_email || '-' || extract(epoch from now())::text, 'UTF8'), 'hex'),
        'eventType', 'pro_subscribed',
        'title', 'Yuhuu! ⚡ Paket Berbayar Aktif',
        'message', format(
          'Yuhuu! %s telah aktif pada paket %s (%s • berlaku s/d %s).',
          v_clean_name,
          v_pkg,
          CASE
            WHEN v_cycle = '3d_trial' THEN 'Trial 3 Hari'
            WHEN v_cycle = '7d_trial' THEN 'Trial 7 Hari'
            ELSE 'Bulanan'
          END,
          to_char(v_due_date, 'DD Mon YYYY')
        ),
        'userName', v_clean_name,
        'userEmail', v_clean_email,
        'packageName', v_pkg,
        'read', false,
        'createdAt', now()
      )
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid, date, date, integer, text, text) TO authenticated;

-- 4) Perbarui `admin_extend_learner_pro` untuk mendukung '3d_trial' & '7d_trial'
CREATE OR REPLACE FUNCTION public.admin_extend_learner_pro(
  p_target_email text,
  p_target_name text,
  p_started_at date,
  p_due_at date,
  p_package_name text DEFAULT 'Pro',
  p_package_id text DEFAULT NULL,
  p_billing_cycle text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_name text := COALESCE(NULLIF(trim(p_target_name), ''), split_part(v_clean_email, '@', 1), 'Learner');
  v_pkg text := COALESCE(NULLIF(trim(p_package_name), ''), 'Pro');
  v_pkg_id text := NULLIF(trim(COALESCE(p_package_id, '')), '');
  v_start_date date := COALESCE(p_started_at, (now() AT TIME ZONE 'Asia/Jakarta')::date);
  v_due_date date;
  v_cycle text;
  v_start_ts timestamptz;
  v_expires_ts timestamptz;
  v_username text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email target wajib diisi.');
  END IF;

  IF p_due_at IS NOT NULL AND p_due_at >= v_start_date THEN
    v_due_date := p_due_at;
  ELSE
    v_due_date := v_start_date + 30;
  END IF;

  v_cycle := COALESCE(
    NULLIF(lower(trim(COALESCE(p_billing_cycle, ''))), ''),
    CASE
      WHEN (v_due_date - v_start_date) <= 4 THEN '3d_trial'
      WHEN (v_due_date - v_start_date) <= 8 THEN '7d_trial'
      ELSE '30d'
    END
  );

  IF v_pkg_id IS NULL THEN
    v_pkg_id := CASE
      WHEN lower(v_pkg) LIKE '%basic%' THEN 'pkg-basic'
      WHEN lower(v_pkg) LIKE '%free%' THEN 'pkg-free'
      ELSE 'pkg-pro'
    END;
  END IF;

  v_start_ts := (v_start_date::timestamp AT TIME ZONE 'Asia/Jakarta');
  v_expires_ts := ((v_due_date::timestamp + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta');

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET
    subscription_tier = 'pro',
    pro_started_at = v_start_ts,
    pro_expires_at = v_expires_ts,
    pro_package_name = v_pkg,
    pro_package_id = v_pkg_id,
    pro_billing_cycle = v_cycle,
    has_used_trial = CASE WHEN v_cycle IN ('3d_trial', '7d_trial') THEN true ELSE has_used_trial END,
    trial_used_at = CASE WHEN v_cycle IN ('3d_trial', '7d_trial') THEN COALESCE(trial_used_at, now()) ELSE trial_used_at END
  WHERE lower(email) = v_clean_email;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    UPDATE public.user_profiles
    SET
      perks = COALESCE(perks, '{}'::jsonb) || jsonb_build_object(
        'is_pro', true,
        'pro_started_at', v_start_ts,
        'pro_expires_at', v_expires_ts,
        'pro_package_name', v_pkg,
        'pro_package_id', v_pkg_id,
        'pro_billing_cycle', v_cycle
      ),
      updated_at = timezone('utc', now())
    WHERE lower(email) = v_clean_email;

    SELECT username
    INTO v_username
    FROM public.user_profiles
    WHERE lower(email) = v_clean_email
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF v_username IS NOT NULL AND to_regclass('public.user_subscriptions') IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (
      username, plan_tier, status, started_at, due_at, payment_method, renewal_status, updated_at
    ) VALUES (
      v_username,
      'PRO',
      'aktif',
      v_start_date,
      v_due_date,
      'manual renewal by admin',
      'diperpanjang manual',
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

  PERFORM public._append_admin_notification(
    jsonb_build_object(
      'id', 'notif-pro-renew-' || encode(convert_to(v_clean_email || '-' || extract(epoch from now())::text, 'UTF8'), 'hex'),
      'eventType', 'pro_subscribed',
      'title', '🔄 Aktivasi / Perpanjangan Paket Berhasil',
      'message', format(
        'Admin mengaktifkan / memperpanjang paket %s untuk %s hingga jatuh tempo %s.',
        v_pkg,
        v_clean_name,
        to_char(v_due_date, 'DD Mon YYYY')
      ),
      'userName', v_clean_name,
      'userEmail', v_clean_email,
      'packageName', v_pkg,
      'read', false,
      'createdAt', now()
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'pro_started_at', v_start_ts,
    'pro_expires_at', v_expires_ts,
    'pro_package_name', v_pkg,
    'pro_package_id', v_pkg_id,
    'pro_billing_cycle', v_cycle,
    'started_date', v_start_date,
    'due_date', v_due_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_extend_learner_pro(text, text, date, date, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_learner_pro(text, text, date, date, text, text, text) TO authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 019_cleanup_ghost_partial_courses.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — CLEANUP GHOST UNFOLDERED PARTIAL-TITLE COURSES
-- File: supabase/migrations/019_cleanup_ghost_partial_courses.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

DELETE FROM public.contents
WHERE COALESCE(lower(type::text), '') <> 'folder'
  AND COALESCE(
    NULLIF(trim(folder_name), ''),
    NULLIF(trim(settings_json->'explorer_meta'->>'folderName'), '')
  ) IS NULL
  AND lower(trim(title)) IN (
    'mini bootcamp s',
    'mini bootcamp social media specialist b',
    'mini bootcamp social media specialist ba',
    'mini bootcamp social media specialist bat',
    'mini bootcamp social media specialist batc',
    'mini bootcamp social media specialist batch'
  );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 020_telegram_bot_and_proof_cleanup.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRATION 020:
--   1. Tabel `public.telegram_bot_settings` (ketat Admin-only RLS) untuk menyimpan
--      Bot Token, Admin Chat ID, Webhook Secret, & preferensi notifikasi Telegram
--   2. Kolom tracking pesan Telegram (`telegram_chat_id`, `telegram_message_id`,
--      `proof_deleted_at`) pada `public.pro_upgrade_requests`
--   3. Trigger otomatis mengosongkan `proof_url` saat status request berubah
--      menjadi 'approved' atau 'rejected' (penghapusan file Storage ditangani server/app)
-- =============================================================================

-- 1) Tabel Pengaturan Bot Telegram (Admin-only, tersembunyi dari public/anon/learner)
CREATE TABLE IF NOT EXISTS public.telegram_bot_settings (
  id text PRIMARY KEY DEFAULT 'default',
  enabled boolean NOT NULL DEFAULT false,
  bot_token text,
  admin_chat_id text,
  webhook_secret text,
  notify_payments boolean NOT NULL DEFAULT true,
  notify_new_users boolean NOT NULL DEFAULT true,
  notify_quiz_submissions boolean NOT NULL DEFAULT false,
  notify_content_issues boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_bot_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.telegram_bot_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.telegram_bot_settings TO authenticated, service_role;

DROP POLICY IF EXISTS "telegram_bot_settings_admin_only" ON public.telegram_bot_settings;
CREATE POLICY "telegram_bot_settings_admin_only"
  ON public.telegram_bot_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.telegram_bot_settings (id, enabled)
VALUES ('default', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Kolom tracking Telegram & penghapusan bukti bayar pada `pro_upgrade_requests`
ALTER TABLE IF EXISTS public.pro_upgrade_requests
  ADD COLUMN IF NOT EXISTS telegram_chat_id text,
  ADD COLUMN IF NOT EXISTS telegram_message_id bigint,
  ADD COLUMN IF NOT EXISTS proof_deleted_at timestamptz;

-- 3) Trigger otomatis hapus referensi `proof_url` saat request selesai diverifikasi/ditolak
CREATE OR REPLACE FUNCTION public.clear_proof_on_request_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') THEN
    IF OLD.proof_url IS NOT NULL OR NEW.proof_url IS NOT NULL THEN
      NEW.proof_deleted_at := COALESCE(NEW.proof_deleted_at, now());
    END IF;
    NEW.proof_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_proof_on_request_resolution ON public.pro_upgrade_requests;
CREATE TRIGGER trg_clear_proof_on_request_resolution
  BEFORE UPDATE ON public.pro_upgrade_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_proof_on_request_resolution();

-- 4) Bersihkan `proof_url` lama pada request yang sudah approved/rejected sebelumnya
UPDATE public.pro_upgrade_requests
SET
  proof_url = NULL,
  proof_deleted_at = COALESCE(proof_deleted_at, now())
WHERE status IN ('approved', 'rejected')
  AND proof_url IS NOT NULL;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 021_pro_voucher_codes.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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
