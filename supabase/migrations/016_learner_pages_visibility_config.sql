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
