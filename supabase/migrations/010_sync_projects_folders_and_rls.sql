-- =============================================================================
-- RUANG SOSMED 2.0 LMS — SINKRONISASI PROJECT/COHORT, FOLDER, KURSUS & RLS ADMIN
-- File: supabase/migrations/010_sync_projects_folders_and_rls.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

-- 1. Pastikan enum `public.content_type` mendukung nilai 'folder'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'content_type'
  ) THEN
    ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'folder';
  END IF;
END $$;

-- 2. Pastikan seluruh kolom metadata Folder & Cohort tersedia di `public.contents`
ALTER TABLE IF EXISTS public.contents
  ADD COLUMN IF NOT EXISTS folder_name text,
  ADD COLUMN IF NOT EXISTS folder_id text,
  ADD COLUMN IF NOT EXISTS access_code text,
  ADD COLUMN IF NOT EXISTS cohort text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_contents_folder_name ON public.contents(folder_name);
CREATE INDEX IF NOT EXISTS idx_contents_cohort ON public.contents(cohort);
CREATE INDEX IF NOT EXISTS idx_contents_title ON public.contents(title);

-- 3. Backfill kolom folder_name, access_code, dan cohort dari JSON settings_json
UPDATE public.contents
SET
  folder_name = COALESCE(NULLIF(folder_name, ''), NULLIF(settings_json->'explorer_meta'->>'folderName', '')),
  access_code = COALESCE(NULLIF(access_code, ''), NULLIF(settings_json->'explorer_meta'->>'accessCode', '')),
  cohort      = COALESCE(NULLIF(cohort, ''), NULLIF(settings_json->'explorer_meta'->>'cohort', ''))
WHERE settings_json ? 'explorer_meta';

-- 4. Buka kebijakan RLS agar sync lintas origin (localhost:3000 <-> ruangsosmedid.com)
--    dan login Developer (Arunika) tidak terblokir saat push/pull Project, Folder, & Kursus
ALTER TABLE IF EXISTS public.contents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contents_select_published_or_assigned_or_staff" ON public.contents;
DROP POLICY IF EXISTS "contents_crud_mentor_admin" ON public.contents;
DROP POLICY IF EXISTS "contents_public_select_all" ON public.contents;
DROP POLICY IF EXISTS "contents_public_write_all" ON public.contents;
DROP POLICY IF EXISTS "contents_sync_all" ON public.contents;
CREATE POLICY "contents_sync_all"
  ON public.contents FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.course_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_sections_select_accessible" ON public.course_sections;
DROP POLICY IF EXISTS "course_sections_crud_mentor_admin" ON public.course_sections;
DROP POLICY IF EXISTS "course_sections_sync_all" ON public.course_sections;
CREATE POLICY "course_sections_sync_all"
  ON public.course_sections FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.course_chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_chapters_select_accessible" ON public.course_chapters;
DROP POLICY IF EXISTS "course_chapters_crud_mentor_admin" ON public.course_chapters;
DROP POLICY IF EXISTS "course_chapters_sync_all" ON public.course_chapters;
CREATE POLICY "course_chapters_sync_all"
  ON public.course_chapters FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_select_all" ON public.projects;
DROP POLICY IF EXISTS "projects_crud_mentor_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_sync_all" ON public.projects;
CREATE POLICY "projects_sync_all"
  ON public.projects FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_sync_all" ON public.profiles;
CREATE POLICY "profiles_sync_all"
  ON public.profiles FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_public_all" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_sync_all" ON public.user_profiles;
CREATE POLICY "user_profiles_sync_all"
  ON public.user_profiles FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Seed row `__SYSTEM_COHORT_PROJECTS__` di `public.contents` jika belum ada
DO $$
DECLARE
  v_default_cohorts jsonb := '[
    {"id":"cohort-1","name":"Ruang Sosmed Class","color":"#EC4899","description":"Batch Utama Ruang Sosmed"},
    {"id":"cohort-2","name":"Creator Growth Lab","color":"#10B981","description":"Short-Form Video Track"},
    {"id":"cohort-mbsms","name":"Mini Bootcamp Social Media Specialist","color":"#0EA5E9","description":"Mini Bootcamp Social Media Specialist"}
  ]'::jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.contents WHERE title = '__SYSTEM_COHORT_PROJECTS__'
  ) THEN
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
    ) VALUES (
      gen_random_uuid(),
      '__SYSTEM_COHORT_PROJECTS__',
      'page',
      'published',
      'System storage for Workspace Cohort Projects',
      'not_urgent',
      0,
      0,
      jsonb_build_object(
        'cohortProjects', v_default_cohorts,
        'updatedAt', now()
      )
    );
  END IF;
END $$;

-- 6. Pastikan akun Developer & Super Admin (`arunika` & `dinur`) terdaftar sebagai `admin`
INSERT INTO public.user_profiles (
  username,
  name,
  email,
  role,
  job_title,
  joined_at,
  updated_at
)
VALUES
  (
    'arunika',
    'Arunika (Developer)',
    'contact.dinurpradipta@gmail.com',
    'admin',
    'Platform Developer & Super Admin',
    current_date,
    timezone('utc', now())
  ),
  (
    'dinur',
    'Dinur M. Pradipta',
    'dinurm.pradipta@gmail.com',
    'admin',
    'Founder & Dev Admin',
    current_date,
    timezone('utc', now())
  )
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = 'admin',
  job_title = EXCLUDED.job_title,
  updated_at = timezone('utc', now());

UPDATE public.profiles
SET role = 'admin'::public.user_role
WHERE lower(email) IN (
  'dinurm.pradipta@gmail.com',
  'contact.dinurpradipta@gmail.com',
  'dinur@ruangsosmed.id',
  'admin@ruangsosmed.id'
);

-- 7. Bersihkan draft potongan judul ketikan & seed lama yang tidak memiliki folder
DELETE FROM public.contents
WHERE title IN (
  'Mini Bootcamp S',
  'Mini Bootcamp Social Media Specialist B',
  'Mini Bootcamp Social Media Specialist Ba',
  'Mini Bootcamp Social Media Specialist Bat',
  'Mini Bootcamp Social Media Specialist Batc',
  'Mini Bootcamp Social Media Specialist Batch',
  'Content Pillars & Audience Persona',
  'Mastering Instagram Carousel & Viral Hook Strategy'
);

-- 8. Hapus duplikat baris sistem (`__SYSTEM_*__`) dan materi dengan judul yang sama (sisakan yang terbaru)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(title)), type
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM public.contents
)
DELETE FROM public.contents
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 9. Pastikan seluruh materi Mini Bootcamp Social Media Specialist terhubung ke folder & project-nya
UPDATE public.contents
SET
  folder_name = 'Mini Bootcamp Social Media Specialist',
  cohort = 'Mini Bootcamp Social Media Specialist',
  settings_json = jsonb_set(
    jsonb_set(
      COALESCE(settings_json, '{}'::jsonb),
      '{explorer_meta,folderName}',
      '"Mini Bootcamp Social Media Specialist"'::jsonb,
      true
    ),
    '{explorer_meta,cohort}',
    '"Mini Bootcamp Social Media Specialist"'::jsonb,
    true
  )
WHERE title IN (
  'Mini Bootcamp Social Media Specialist Batch 1',
  'Mini Bootcamp Social Media Specialist Batch 2',
  'Mini Bootcamp Social Media Specialist Batch 3'
);

-- 10. Buka kebijakan RLS pada `enrollments` dan `submissions` agar Modal Profil User
--     selalu dapat membaca & memperbarui progress belajar serta skor kuis siswa
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enrollments_select_own_or_staff" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_own_or_staff" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update_own_or_staff" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete_staff_only" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_sync_all" ON public.enrollments;
CREATE POLICY "enrollments_sync_all"
  ON public.enrollments FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "submissions_select_own_or_staff" ON public.submissions;
DROP POLICY IF EXISTS "submissions_insert_own_or_staff" ON public.submissions;
DROP POLICY IF EXISTS "submissions_update_staff_only" ON public.submissions;
DROP POLICY IF EXISTS "submissions_sync_all" ON public.submissions;
CREATE POLICY "submissions_sync_all"
  ON public.submissions FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 11. Seed baris sistem `__SYSTEM_USER_PASSWORDS__` untuk penyimpanan reset password Admin lintas perangkat
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
  '__SYSTEM_USER_PASSWORDS__',
  'page',
  'published',
  'System storage for admin-assisted password resets',
  'not_urgent',
  0,
  0,
  jsonb_build_object('passwords', '{}'::jsonb, 'updatedAt', now())
WHERE NOT EXISTS (
  SELECT 1 FROM public.contents WHERE title = '__SYSTEM_USER_PASSWORDS__'
);

-- 12. RPC Admin Direct Password Reset ke `auth.users` (Supabase Auth)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  IF v_clean_id = '' OR length(trim(COALESCE(p_new_password, ''))) < 4 THEN
    RETURN false;
  END IF;

  SELECT u.id
  INTO v_target_uid
  FROM auth.users u
  WHERE lower(u.email) = v_clean_id
     OR lower(COALESCE(u.raw_user_meta_data->>'username', '')) = v_clean_id
     OR lower(COALESCE(u.raw_user_meta_data->>'full_name', '')) = v_clean_id
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

REVOKE ALL ON FUNCTION public.admin_reset_user_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(text, text) TO anon, authenticated;
