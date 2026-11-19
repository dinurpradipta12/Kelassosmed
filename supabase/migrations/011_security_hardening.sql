-- =============================================================================
-- RUANG SOSMED 2.0 LMS — FULL-STACK SECURITY HARDENING MIGRATION
-- File: supabase/migrations/011_security_hardening.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. HAPUS BARIS SISTEM YANG MEMBOCORKAN DATA SENSITIF / PASSWORD PLAINTEXT
-- -----------------------------------------------------------------------------
DELETE FROM public.contents
WHERE title IN (
  '__SYSTEM_USER_PASSWORDS__',
  '__SYSTEM_USER_PROFILE_ADMIN__',
  '__SYSTEM_USER_PROFILE_LEARNER__'
);

-- -----------------------------------------------------------------------------
-- 2. PASTIKAN KOLOM & ROLE FOUNDER ADMIN SINKRON DENGAN SUPABASE AUTH
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS total_points integer NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS header_url text;

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Backfill founder & admin accounts dari auth.users ke public.profiles agar auth.uid() terverifikasi
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  avatar_url,
  role,
  job_title,
  subscription_tier,
  total_points
)
SELECT
  u.id,
  COALESCE(NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
  u.email,
  u.raw_user_meta_data->>'avatar_url',
  'admin'::public.user_role,
  COALESCE(NULLIF(trim(u.raw_user_meta_data->>'job_title'), ''), 'Platform Admin'),
  'pro',
  0
FROM auth.users u
WHERE lower(u.email) IN (
  'contact.dinurpradipta@gmail.com',
  'dinurm.pradipta@gmail.com',
  'dinur@ruangsosmed.id',
  'admin@ruangsosmed.id'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin'::public.user_role,
  subscription_tier = 'pro';

UPDATE public.user_profiles up
SET
  role = 'admin',
  updated_at = timezone('utc', now())
WHERE lower(up.email) IN (
  'contact.dinurpradipta@gmail.com',
  'dinurm.pradipta@gmail.com',
  'dinur@ruangsosmed.id',
  'admin@ruangsosmed.id'
)
OR lower(up.username) IN ('arunika', 'dinur');

-- Hubungkan user_profiles.user_id dengan profiles.id berdasarkan email bila masih null
UPDATE public.user_profiles up
SET user_id = p.id
FROM public.profiles p
WHERE up.user_id IS NULL
  AND lower(trim(up.email)) = lower(trim(p.email));

-- -----------------------------------------------------------------------------
-- 3. HELPER ROLE CHECKERS (SECURITY DEFINER, ANTI RECURSION RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_mentor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin'::public.user_role, 'mentor'::public.user_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_mentor_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_admin_or_mentor();
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin_or_mentor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_mentor() TO authenticated;

REVOKE ALL ON FUNCTION public.is_mentor_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_mentor_or_admin() TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. TABEL ANTREAN VERIFIKASI PEMBAYARAN LEARNER PRO (`pro_upgrade_requests`)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pro_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text NOT NULL,
  package_id text NOT NULL,
  package_name text NOT NULL,
  price_label text NOT NULL,
  payment_method text NOT NULL DEFAULT 'QRIS / Transfer Manual',
  buyer_contact text NOT NULL DEFAULT '',
  proof_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_upgrade_requests_user ON public.pro_upgrade_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pro_upgrade_requests_status ON public.pro_upgrade_requests(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_pro_upgrade_requests_updated_at ON public.pro_upgrade_requests;
CREATE TRIGGER trg_pro_upgrade_requests_updated_at
  BEFORE UPDATE ON public.pro_upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. DROP SEMUA POLICY LAMA YANG TERBUKA (`USING (true)` / `sync_all`) & PERKETAT RLS
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_table text;
  v_pol record;
  v_tables text[] := ARRAY[
    'profiles',
    'user_profiles',
    'user_subscriptions',
    'pro_upgrade_requests',
    'contents',
    'course_sections',
    'course_chapters',
    'projects',
    'enrollments',
    'submissions',
    'landing_pages',
    'learner_pro_settings',
    'mentor_inbox_threads',
    'mentor_reported_issues',
    'lms_courses',
    'lms_class_results',
    'public_content_revisions',
    'lesson_notes',
    'lesson_progress'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
      FOR v_pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_table
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_table);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 5A. profiles (STRICT: user hanya lihat/edit profil sendiri; Admin/Mentor lihat semua)
CREATE POLICY "profiles_select_own_or_staff"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_mentor());

CREATE POLICY "profiles_insert_own_or_admin"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_delete_admin_only"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5B. user_profiles (STRICT: no anon read; user hanya akses miliknya)
CREATE POLICY "user_profiles_select_own_or_staff"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin_or_mentor()
  );

CREATE POLICY "user_profiles_insert_own_or_admin"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin()
  );

CREATE POLICY "user_profiles_update_own_or_admin"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin()
  );

CREATE POLICY "user_profiles_delete_admin_only"
  ON public.user_profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5C. user_subscriptions
CREATE POLICY "user_subscriptions_select_own_or_staff"
  ON public.user_subscriptions FOR SELECT TO authenticated
  USING (
    public.is_admin_or_mentor()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE lower(up.username) = lower(user_subscriptions.username)
        AND (
          up.user_id = auth.uid()
          OR lower(up.email) = lower(COALESCE(auth.jwt()->>'email', ''))
        )
    )
  );

CREATE POLICY "user_subscriptions_write_admin_only"
  ON public.user_subscriptions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5D. pro_upgrade_requests
CREATE POLICY "pro_requests_select_own_or_admin"
  ON public.pro_upgrade_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "pro_requests_insert_own_pending"
  ON public.pro_upgrade_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "pro_requests_update_admin_only"
  ON public.pro_upgrade_requests FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "pro_requests_delete_admin_only"
  ON public.pro_upgrade_requests FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5E. contents (sembunyikan __SYSTEM_ADMIN_NOTIFICATIONS__ & __SYSTEM_USER_*__ dari non-staff, izinkan konfigurasi non-PII)
CREATE POLICY "contents_select_public_catalog"
  ON public.contents FOR SELECT TO anon, authenticated
  USING (
    (status = 'published'::public.content_status AND title NOT LIKE '__SYSTEM_%')
    OR title = '__SYSTEM_MAINTENANCE_CONFIG__'
  );

CREATE POLICY "contents_select_authenticated_and_staff"
  ON public.contents FOR SELECT TO authenticated
  USING (
    public.is_admin_or_mentor()
    OR title IN (
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__'
    )
    OR EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.content_id = contents.id
        AND e.learner_id = auth.uid()
    )
  );

CREATE POLICY "contents_write_staff_only"
  ON public.contents FOR ALL TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

-- 5F. course_sections & course_chapters
CREATE POLICY "course_sections_select_accessible"
  ON public.course_sections FOR SELECT TO authenticated
  USING (
    public.is_admin_or_mentor()
    OR EXISTS (
      SELECT 1
      FROM public.contents c
      WHERE c.id = course_sections.content_id
        AND (
          c.status = 'published'::public.content_status
          OR EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.content_id = c.id AND e.learner_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "course_sections_write_staff_only"
  ON public.course_sections FOR ALL TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

CREATE POLICY "course_chapters_select_accessible"
  ON public.course_chapters FOR SELECT TO authenticated
  USING (
    public.is_admin_or_mentor()
    OR EXISTS (
      SELECT 1
      FROM public.contents c
      WHERE c.id = course_chapters.content_id
        AND (
          c.status = 'published'::public.content_status
          OR EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.content_id = c.id AND e.learner_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "course_chapters_write_staff_only"
  ON public.course_chapters FOR ALL TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

-- 5G. projects
CREATE POLICY "projects_select_authenticated"
  ON public.projects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "projects_write_staff_only"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

-- 5H. enrollments & submissions
CREATE POLICY "enrollments_select_own_or_staff"
  ON public.enrollments FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR public.is_admin_or_mentor());

CREATE POLICY "enrollments_insert_own_or_staff"
  ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid() OR public.is_admin_or_mentor());

CREATE POLICY "enrollments_update_own_or_staff"
  ON public.enrollments FOR UPDATE TO authenticated
  USING (learner_id = auth.uid() OR public.is_admin_or_mentor())
  WITH CHECK (learner_id = auth.uid() OR public.is_admin_or_mentor());

CREATE POLICY "enrollments_delete_staff_only"
  ON public.enrollments FOR DELETE TO authenticated
  USING (public.is_admin_or_mentor());

CREATE POLICY "submissions_select_own_or_staff"
  ON public.submissions FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR public.is_admin_or_mentor());

CREATE POLICY "submissions_insert_own_or_staff"
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid() OR public.is_admin_or_mentor());

CREATE POLICY "submissions_update_staff_only"
  ON public.submissions FOR UPDATE TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

CREATE POLICY "submissions_delete_staff_only"
  ON public.submissions FOR DELETE TO authenticated
  USING (public.is_admin_or_mentor());

-- 5I. landing_pages & learner_pro_settings (hanya Admin/Mentor bisa edit; publik hanya baca yang published)
DO $$
BEGIN
  IF to_regclass('public.landing_pages') IS NOT NULL THEN
    CREATE POLICY "landing_pages_select_published_or_staff"
      ON public.landing_pages FOR SELECT TO anon, authenticated
      USING (lower(status) = 'published' OR public.is_admin_or_mentor());

    CREATE POLICY "landing_pages_write_staff_only"
      ON public.landing_pages FOR ALL TO authenticated
      USING (public.is_admin_or_mentor())
      WITH CHECK (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.learner_pro_settings') IS NOT NULL THEN
    CREATE POLICY "learner_pro_settings_select_authenticated"
      ON public.learner_pro_settings FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "learner_pro_settings_write_admin_only"
      ON public.learner_pro_settings FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
    CREATE POLICY "mentor_inbox_threads_select_auth"
      ON public.mentor_inbox_threads FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "mentor_inbox_threads_insert_auth"
      ON public.mentor_inbox_threads FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "mentor_inbox_threads_update_auth"
      ON public.mentor_inbox_threads FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "mentor_inbox_threads_delete_staff"
      ON public.mentor_inbox_threads FOR DELETE TO authenticated
      USING (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.mentor_reported_issues') IS NOT NULL THEN
    CREATE POLICY "mentor_reported_issues_select_auth"
      ON public.mentor_reported_issues FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "mentor_reported_issues_insert_auth"
      ON public.mentor_reported_issues FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "mentor_reported_issues_update_staff"
      ON public.mentor_reported_issues FOR UPDATE TO authenticated
      USING (public.is_admin_or_mentor())
      WITH CHECK (public.is_admin_or_mentor());

    CREATE POLICY "mentor_reported_issues_delete_staff"
      ON public.mentor_reported_issues FOR DELETE TO authenticated
      USING (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.lms_courses') IS NOT NULL THEN
    CREATE POLICY "lms_courses_select_published_or_staff"
      ON public.lms_courses FOR SELECT TO anon, authenticated
      USING (published = true OR public.is_admin_or_mentor());

    CREATE POLICY "lms_courses_write_staff"
      ON public.lms_courses FOR ALL TO authenticated
      USING (public.is_admin_or_mentor())
      WITH CHECK (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.lms_class_results') IS NOT NULL THEN
    CREATE POLICY "lms_class_results_select_staff_only"
      ON public.lms_class_results FOR SELECT TO authenticated
      USING (public.is_admin_or_mentor());

    CREATE POLICY "lms_class_results_insert_auth"
      ON public.lms_class_results FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "lms_class_results_write_staff"
      ON public.lms_class_results FOR UPDATE TO authenticated
      USING (public.is_admin_or_mentor())
      WITH CHECK (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.public_content_revisions') IS NOT NULL THEN
    CREATE POLICY "revisions_select_public"
      ON public.public_content_revisions FOR SELECT TO anon, authenticated
      USING (true);

    CREATE POLICY "revisions_write_staff"
      ON public.public_content_revisions FOR ALL TO authenticated
      USING (public.is_admin_or_mentor())
      WITH CHECK (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.lesson_notes') IS NOT NULL THEN
    CREATE POLICY "lesson_notes_own_or_staff"
      ON public.lesson_notes FOR ALL TO authenticated
      USING (
        public.is_admin_or_mentor()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE lower(up.username) = lower(lesson_notes.username)
            AND (up.user_id = auth.uid() OR lower(up.email) = lower(COALESCE(auth.jwt()->>'email', '')))
        )
      )
      WITH CHECK (
        public.is_admin_or_mentor()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE lower(up.username) = lower(lesson_notes.username)
            AND (up.user_id = auth.uid() OR lower(up.email) = lower(COALESCE(auth.jwt()->>'email', '')))
        )
      );
  END IF;

  IF to_regclass('public.lesson_progress') IS NOT NULL THEN
    CREATE POLICY "lesson_progress_own_or_staff"
      ON public.lesson_progress FOR ALL TO authenticated
      USING (
        public.is_admin_or_mentor()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE lower(up.username) = lower(lesson_progress.session_username)
            AND (up.user_id = auth.uid() OR lower(up.email) = lower(COALESCE(auth.jwt()->>'email', '')))
        )
      )
      WITH CHECK (
        public.is_admin_or_mentor()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE lower(up.username) = lower(lesson_progress.session_username)
            AND (up.user_id = auth.uid() OR lower(up.email) = lower(COALESCE(auth.jwt()->>'email', '')))
        )
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. TRIGGER PROTEKSI KOLOM SENSITIF & NORMALISASI SIGNUP
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
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
       OR NEW.total_points IS DISTINCT FROM OLD.total_points THEN
      RAISE EXCEPTION 'Forbidden: only verified admin can modify role, subscription_tier, or total_points';
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

CREATE OR REPLACE FUNCTION public.protect_user_profiles_sensitive_fields()
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
    NEW.role := 'learner';
    NEW.perks := COALESCE(NEW.perks, '{}'::jsonb) - 'is_pro' - 'tier';
    NEW.referral_perks := '{}'::jsonb;
    NEW.referral_perks_expires_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR (COALESCE(NEW.perks, '{}'::jsonb)->>'is_pro') IS DISTINCT FROM (COALESCE(OLD.perks, '{}'::jsonb)->>'is_pro')
       OR (COALESCE(NEW.perks, '{}'::jsonb)->>'tier') IS DISTINCT FROM (COALESCE(OLD.perks, '{}'::jsonb)->>'tier')
       OR NEW.referral_perks IS DISTINCT FROM OLD.referral_perks
       OR NEW.referral_perks_expires_at IS DISTINCT FROM OLD.referral_perks_expires_at
       OR (to_jsonb(NEW)->>'points') IS DISTINCT FROM (to_jsonb(OLD)->>'points') THEN
      RAISE EXCEPTION 'Forbidden: only verified admin can modify protected user_profile fields';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_profiles_sensitive_fields ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profiles_sensitive_fields
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_profiles_sensitive_fields();

-- Paksa semua pendaftar baru memiliki role='learner', subscription_tier='free', total_points=0
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  INSERT INTO public.profiles (
    id, full_name, email, avatar_url, role, job_title, subscription_tier, total_points
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    'learner'::public.user_role,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'job_title'), ''), 'Social Media Specialist'),
    'free',
    0
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 7. NOTIFIKASI ADMIN INTERNAL (HANYA VIA TRIGGER / RPC AMAN, NO DIRECT WRITE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._append_admin_notification(p_notif jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_id uuid;
  v_existing jsonb;
  v_next jsonb;
BEGIN
  SELECT id, COALESCE(settings_json->'notifications', '[]'::jsonb)
  INTO v_row_id, v_existing
  FROM public.contents
  WHERE title = '__SYSTEM_ADMIN_NOTIFICATIONS__'
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF jsonb_typeof(v_existing) <> 'array' THEN
    v_existing := '[]'::jsonb;
  END IF;

  WITH combined AS (
    SELECT elem, 0 AS prio, 0 AS ord FROM (SELECT p_notif AS elem) n
    UNION ALL
    SELECT elem, 1 AS prio, ord::integer FROM jsonb_array_elements(v_existing) WITH ORDINALITY AS t(elem, ord)
    WHERE elem->>'id' IS DISTINCT FROM p_notif->>'id'
  ),
  limited AS (
    SELECT elem FROM combined ORDER BY prio ASC, ord ASC LIMIT 80
  )
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_next FROM limited;

  IF v_row_id IS NULL THEN
    INSERT INTO public.contents (
      id, title, type, status, description, urgency, estimated_minutes, points_reward, settings_json
    ) VALUES (
      gen_random_uuid(),
      '__SYSTEM_ADMIN_NOTIFICATIONS__',
      'page',
      'published',
      'System storage for Admin activity notifications',
      'not_urgent',
      0,
      0,
      jsonb_build_object('notifications', v_next, 'updatedAt', now())
    );
  ELSE
    UPDATE public.contents
    SET
      settings_json = jsonb_build_object('notifications', v_next, 'updatedAt', now()),
      updated_at = now()
    WHERE id = v_row_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._append_admin_notification(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_admin_on_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text := COALESCE(NULLIF(trim(NEW.full_name), ''), split_part(COALESCE(NEW.email, 'Learner'), '@', 1));
BEGIN
  IF NEW.role = 'learner'::public.user_role THEN
    PERFORM public._append_admin_notification(
      jsonb_build_object(
        'id', 'notif-signup-' || NEW.id::text,
        'eventType', 'user_registered',
        'title', 'Say, Hi! 🎉 Member Baru Bergabung',
        'message', format('Say, Hi! %s telah bergabung ke Ruang Sosmed 2.0. Yuk sambut member baru dan bantu mereka memulai perjalanan belajarnya!', v_display_name),
        'userName', v_display_name,
        'userEmail', NEW.email,
        'read', false,
        'createdAt', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_new_profile ON public.profiles;
CREATE TRIGGER trg_notify_admin_on_new_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_new_profile();

-- -----------------------------------------------------------------------------
-- 8. HARDENED RPCs (EXPLICIT CALLER VERIFICATION + PROTECTION BYPASS)
-- -----------------------------------------------------------------------------

-- 8A. Submit PRO upgrade request (Learner hanya bisa membuat status 'pending')
CREATE OR REPLACE FUNCTION public.submit_pro_upgrade_request(
  p_user_name text,
  p_package_id text,
  p_package_name text,
  p_price_label text,
  p_payment_method text DEFAULT 'QRIS / Transfer Manual',
  p_buyer_contact text DEFAULT '',
  p_proof_url text DEFAULT NULL
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
  v_req public.pro_upgrade_requests;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  SELECT email, COALESCE(NULLIF(trim(p_user_name), ''), full_name, split_part(email, '@', 1))
  INTO v_email, v_name
  FROM public.profiles
  WHERE id = v_uid;

  v_email := COALESCE(v_email, auth.jwt()->>'email', '');
  v_name := COALESCE(NULLIF(trim(v_name), ''), NULLIF(trim(p_user_name), ''), split_part(v_email, '@', 1), 'Learner');

  IF v_email = '' THEN
    RAISE EXCEPTION 'Profile email not found';
  END IF;

  INSERT INTO public.pro_upgrade_requests (
    user_id, user_email, user_name, package_id, package_name, price_label,
    payment_method, buyer_contact, proof_url, status
  ) VALUES (
    v_uid,
    v_email,
    v_name,
    COALESCE(NULLIF(trim(p_package_id), ''), 'pro-monthly'),
    COALESCE(NULLIF(trim(p_package_name), ''), 'Learner PRO Monthly'),
    COALESCE(NULLIF(trim(p_price_label), ''), 'Rp 149.000'),
    COALESCE(NULLIF(trim(p_payment_method), ''), 'QRIS / Transfer Manual'),
    COALESCE(trim(p_buyer_contact), ''),
    NULLIF(trim(COALESCE(p_proof_url, '')), ''),
    'pending'
  )
  RETURNING * INTO v_req;

  PERFORM public._append_admin_notification(
    jsonb_build_object(
      'id', 'notif-pro-req-' || v_req.id::text,
      'eventType', 'pro_subscribed',
      'title', 'Konfirmasi Pembayaran PRO Baru',
      'message', format(
        'Yuhuu ... %s telah mengajukan pembayaran paket %s (%s). Verifikasi pembayaran di Daftar Akun sebelum mengaktifkan akses PRO.',
        v_name,
        v_req.package_name,
        v_req.price_label
      ),
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

REVOKE ALL ON FUNCTION public.submit_pro_upgrade_request(text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_pro_upgrade_request(text, text, text, text, text, text, text) TO authenticated;

-- 8B. Admin password reset (hanya Admin terautentikasi, min 6 karakter)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_identifier text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_clean_id text := lower(trim(COALESCE(p_identifier, '')));
  v_target_uid uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_id = '' OR length(trim(COALESCE(p_new_password, ''))) < 6 THEN
    RETURN false;
  END IF;

  SELECT u.id
  INTO v_target_uid
  FROM auth.users u
  WHERE lower(u.email) = v_clean_id
     OR lower(COALESCE(u.raw_user_meta_data->>'username', '')) = v_clean_id
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_target_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = crypt(trim(p_new_password), gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE id = v_target_uid;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_user_password(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(text, text) TO authenticated;

-- 8C. Admin approve / grant / revoke Learner PRO
CREATE OR REPLACE FUNCTION public.admin_set_learner_pro(
  p_target_email text,
  p_target_name text,
  p_is_pro boolean,
  p_package_name text DEFAULT 'Learner PRO Monthly',
  p_request_id uuid DEFAULT NULL
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET subscription_tier = CASE WHEN p_is_pro THEN 'pro' ELSE 'free' END
  WHERE lower(email) = v_clean_email;

  UPDATE public.user_profiles
  SET
    perks = jsonb_set(COALESCE(perks, '{}'::jsonb), '{is_pro}', to_jsonb(p_is_pro), true),
    updated_at = timezone('utc', now())
  WHERE lower(email) = v_clean_email
  RETURNING username INTO v_username;

  IF v_username IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (
      username, plan_tier, status, started_at, due_at, payment_method, renewal_status, updated_at
    ) VALUES (
      v_username,
      CASE WHEN p_is_pro THEN 'PRO' ELSE 'Free' END,
      CASE WHEN p_is_pro THEN 'aktif' ELSE 'nonaktif' END,
      current_date,
      current_date + 30,
      'admin verified',
      CASE WHEN p_is_pro THEN 'siap diperpanjang' ELSE 'nonaktif' END,
      timezone('utc', now())
    )
    ON CONFLICT (username) DO UPDATE SET
      plan_tier = EXCLUDED.plan_tier,
      status = EXCLUDED.status,
      started_at = EXCLUDED.started_at,
      due_at = EXCLUDED.due_at,
      payment_method = EXCLUDED.payment_method,
      renewal_status = EXCLUDED.renewal_status,
      updated_at = timezone('utc', now());
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
        'message', format('Yuhuu! %s telah berlangganan dan mengambil paket %s. Akses fitur eksklusifnya sudah aktif dan siap digunakan!', v_clean_name, v_pkg),
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

REVOKE ALL ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid) TO authenticated;

-- 8C-2. Learner menukar poin dengan hadiah secara atomik via RPC
CREATE OR REPLACE FUNCTION public.redeem_learner_points(
  p_points_cost integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR COALESCE(p_points_cost, 0) <= 0 THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET total_points = total_points - p_points_cost
  WHERE id = v_uid
    AND total_points >= p_points_cost;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_learner_points(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_learner_points(integer) TO authenticated;

-- 8D. Admin ubah role anggota (`admin` / `mentor` / `learner`)
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_target_email text,
  p_new_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_role text := lower(trim(COALESCE(p_new_role, '')));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' OR v_clean_role NOT IN ('admin', 'mentor', 'learner') THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET role = v_clean_role::public.user_role
  WHERE lower(email) = v_clean_email;

  UPDATE public.user_profiles
  SET
    role = v_clean_role,
    updated_at = timezone('utc', now())
  WHERE lower(email) = v_clean_email;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(text, text) TO authenticated;

-- 8E. Staff ubah poin learner (menggantikan update langsung ke tabel profiles)
CREATE OR REPLACE FUNCTION public.admin_adjust_learner_points(
  p_target_id uuid,
  p_new_points integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_mentor() THEN
    RAISE EXCEPTION 'Forbidden: Staff access required';
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET total_points = GREATEST(0, COALESCE(p_new_points, 0))
  WHERE id = p_target_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_learner_points(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_learner_points(uuid, integer) TO authenticated;

-- 8F. Hardening RPC lama (`upsert_user_subscription`, `complete_chapter_and_award_points`, `grade_submission_and_update_enrollment`)
CREATE OR REPLACE FUNCTION public.upsert_user_subscription(
  p_username text,
  p_status text,
  p_started_at date,
  p_due_at date,
  p_payment_method text,
  p_renewal_status text
)
RETURNS public.user_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_row public.user_subscriptions;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  INSERT INTO public.user_subscriptions (
    username, status, started_at, due_at, payment_method, renewal_status, updated_at
  )
  VALUES (
    lower(trim(p_username)),
    coalesce(nullif(trim(p_status), ''), 'aktif'),
    coalesce(p_started_at, current_date),
    coalesce(p_due_at, current_date + 30),
    coalesce(nullif(trim(p_payment_method), ''), 'admin verified'),
    coalesce(nullif(trim(p_renewal_status), ''), 'siap diperpanjang'),
    timezone('utc', now())
  )
  ON CONFLICT (username) DO UPDATE SET
    status = excluded.status,
    started_at = excluded.started_at,
    due_at = excluded.due_at,
    payment_method = excluded.payment_method,
    renewal_status = excluded.renewal_status,
    updated_at = timezone('utc', now())
  RETURNING * INTO subscription_row;

  RETURN subscription_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_user_subscription(text, text, date, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_subscription(text, text, date, date, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_chapter_and_award_points(
  p_content_id uuid,
  p_chapter_id uuid,
  p_learner_id uuid
)
RETURNS public.enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment public.enrollments;
  v_total_chapters integer;
  v_completed_count integer;
  v_chapter_points integer;
  v_new_progress integer;
BEGIN
  IF auth.uid() IS NULL
     OR (auth.uid() <> p_learner_id AND NOT public.is_admin_or_mentor()) THEN
    RAISE EXCEPTION 'Unauthorized chapter completion update';
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  SELECT COALESCE(points, 10)
    INTO v_chapter_points
    FROM public.course_chapters
   WHERE id = p_chapter_id;

  SELECT COUNT(*)
    INTO v_total_chapters
    FROM public.course_chapters
   WHERE content_id = p_content_id;

  IF v_total_chapters = 0 THEN
    v_total_chapters := 1;
  END IF;

  INSERT INTO public.enrollments (content_id, learner_id, status, progress_percent, completed_chapter_ids)
  VALUES (p_content_id, p_learner_id, 'in_progress', 0, ARRAY[]::uuid[])
  ON CONFLICT (content_id, learner_id) DO NOTHING;

  SELECT *
    INTO v_enrollment
    FROM public.enrollments
   WHERE content_id = p_content_id
     AND learner_id = p_learner_id
   FOR UPDATE;

  IF NOT (p_chapter_id = ANY(v_enrollment.completed_chapter_ids)) THEN
    v_enrollment.completed_chapter_ids := array_append(v_enrollment.completed_chapter_ids, p_chapter_id);
    v_completed_count := COALESCE(array_length(v_enrollment.completed_chapter_ids, 1), 0);
    v_new_progress := least(100, round((v_completed_count::numeric / v_total_chapters::numeric) * 100)::integer);

    UPDATE public.enrollments
       SET completed_chapter_ids = v_enrollment.completed_chapter_ids,
           progress_percent = v_new_progress,
           status = CASE WHEN v_new_progress >= 100 THEN 'passed'::public.enrollment_status ELSE 'in_progress'::public.enrollment_status END,
           updated_at = now()
     WHERE id = v_enrollment.id
     RETURNING * INTO v_enrollment;

    UPDATE public.profiles
       SET total_points = total_points + COALESCE(v_chapter_points, 10)
     WHERE id = p_learner_id;
  END IF;

  RETURN v_enrollment;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_chapter_and_award_points(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_chapter_and_award_points(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.grade_submission_and_update_enrollment(
  p_submission_id uuid,
  p_grading_status public.grading_status,
  p_score_percent integer,
  p_mentor_feedback text
)
RETURNS public.submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.submissions;
  v_points_reward integer;
BEGIN
  IF NOT public.is_admin_or_mentor() THEN
    RAISE EXCEPTION 'Only mentors or admins can grade submissions';
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.submissions
     SET grading_status = p_grading_status,
         score_percent = greatest(0, least(100, p_score_percent)),
         mentor_feedback = p_mentor_feedback,
         graded_at = now(),
         graded_by = auth.uid()
   WHERE id = p_submission_id
   RETURNING * INTO v_sub;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission % not found', p_submission_id;
  END IF;

  IF p_grading_status = 'passed' THEN
    SELECT COALESCE(points_reward, 100)
      INTO v_points_reward
      FROM public.contents
     WHERE id = v_sub.content_id;

    UPDATE public.enrollments
       SET status = 'passed',
           progress_percent = 100,
           updated_at = now()
     WHERE content_id = v_sub.content_id
       AND learner_id = v_sub.learner_id;

    UPDATE public.profiles
       SET total_points = total_points + v_points_reward
     WHERE id = v_sub.learner_id;
  ELSIF p_grading_status = 'failed' THEN
    UPDATE public.enrollments
       SET status = 'failed',
           updated_at = now()
     WHERE content_id = v_sub.content_id
       AND learner_id = v_sub.learner_id;
  END IF;

  RETURN v_sub;
END;
$$;

REVOKE ALL ON FUNCTION public.grade_submission_and_update_enrollment(uuid, public.grading_status, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grade_submission_and_update_enrollment(uuid, public.grading_status, integer, text) TO authenticated;
