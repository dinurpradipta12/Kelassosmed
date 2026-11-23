-- =============================================================================
-- RUANG SOSMED 2.0 LMS — ULTRA-LOW EGRESS OPTIMIZATION MIGRATION
-- File: supabase/migrations/025_egress_ultra_optimization.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor.
-- Tujuan:
--   1. Memisahkan watermark katalog konten (`catalog_ts`, `catalog_count`) dari
--      baris sistem (`sys_ts`) agar update notifikasi/config tidak membuat semua
--      user menarik ulang seluruh katalog kelas.
--   2. Menambahkan indeks komposit ringan untuk watermark & landing_pages.
--   3. Memastikan bucket Storage publik tetap memiliki konfigurasi aman & ter-cache.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. UPGRADE WATERMARK RPC (`get_workspace_sync_watermark`)
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
  v_catalog_ts timestamptz;
  v_catalog_count bigint := 0;
  v_sys_ts timestamptz;
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

    SELECT MAX(updated_at), COUNT(*)
    INTO v_catalog_ts, v_catalog_count
    FROM public.contents
    WHERE title NOT LIKE '__SYSTEM_%';

    SELECT MAX(updated_at)
    INTO v_sys_ts
    FROM public.contents
    WHERE title LIKE '__SYSTEM_%';
  ELSE
    SELECT MAX(updated_at), COUNT(*)
    INTO v_catalog_ts, v_catalog_count
    FROM public.contents
    WHERE status = 'published'::public.content_status
      AND title NOT LIKE '__SYSTEM_%';

    SELECT MAX(updated_at)
    INTO v_sys_ts
    FROM public.contents
    WHERE title IN (
      '__SYSTEM_MAINTENANCE_CONFIG__',
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__',
      '__SYSTEM_USER_AVATARS__',
      '__SYSTEM_USER_POINTS__',
      '__SYSTEM_LEARNER_NOTIFICATIONS__',
      '__SYSTEM_LEARNER_PAGES_CONFIG__'
    );

    v_contents_ts := GREATEST(COALESCE(v_catalog_ts, 'epoch'::timestamptz), COALESCE(v_sys_ts, 'epoch'::timestamptz));
    v_contents_count := v_catalog_count;
  END IF;

  IF v_uid IS NOT NULL THEN
    IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
      SELECT MAX(updated_at) INTO v_inbox_ts FROM public.mentor_inbox_threads;
    END IF;
    IF v_is_staff AND to_regclass('public.mentor_reported_issues') IS NOT NULL THEN
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
    'catalog_ts', v_catalog_ts,
    'catalog_count', v_catalog_count,
    'sys_ts', v_sys_ts,
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

-- -----------------------------------------------------------------------------
-- 2. INDEKS RINGAN UNTUK WATERMARK & LANDING PAGE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.contents') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_contents_title_updated
      ON public.contents(title, updated_at DESC);
  END IF;

  IF to_regclass('public.landing_pages') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_landing_pages_slug_updated
      ON public.landing_pages(slug, updated_at DESC);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. VERIFIKASI STORAGE BUCKET PUBLIK (CACHEABLE CDN)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('ruang-sosmed-media', 'ruang-sosmed-media', true, 52428800),
  ('ruang-sosmed-avatars', 'ruang-sosmed-avatars', true, 10485760),
  ('ruang-sosmed-attachments', 'ruang-sosmed-attachments', true, 26214400)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit;
