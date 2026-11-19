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
