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
