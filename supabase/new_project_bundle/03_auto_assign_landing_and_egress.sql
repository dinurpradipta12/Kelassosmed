-- =============================================================================
-- RUANG SOSMED 2.0 LMS — FRESH PROJECT SQL BUNDLE
-- BAGIAN 3/3 — Auto-Assign Project, Hapus Siswa, Landing Page V7 & Watermark Egress (022 - 025)
-- Target Project: wdmfxlrdyqxnycbebwpv
-- Jalankan file ini di Supabase SQL Editor secara berurutan (01 -> 02 -> 03).
-- =============================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 022_auto_assign_shared_projects.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — AUTO-ASSIGN SHARED PROJECTS ("Bagikan ke Semua Siswa")
-- File: supabase/migrations/022_auto_assign_shared_projects.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================
-- Fitur:
-- 1. Saat suatu Project/Cohort mengaktifkan `Bagikan ke Semua Siswa: ON`
--    (shareWithAllLearners = true di `__SYSTEM_COHORT_PROJECTS__`),
--    seluruh folder dan materi di dalam project tsb otomatis meng-assign
--    semua siswa aktif ke `public.enrollments` dan `contents.settings_json`.
-- 2. Saat siswa baru mendaftar / masuk ke `public.profiles` (role = 'learner'),
--    trigger otomatis langsung memasukkan siswa tsb ke semua folder & materi
--    dari project yang mengaktifkan `shareWithAllLearners = true`.
-- 3. Saat folder/materi baru dibuat atau dipindah ke project shared-all,
--    trigger otomatis langsung mengisi seluruh daftar siswa aktif.
-- 4. Backfill dijalankan di akhir script untuk mensinkronkan data eksisting.
-- =============================================================================

-- 1. Helper normalisasi nama Project/Cohort (selaras dengan normalizeCohortProjectName di app)
CREATE OR REPLACE FUNCTION public._normalize_cohort_project_name(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_trimmed text := trim(coalesce(p_raw, ''));
  v_lower text;
BEGIN
  IF v_trimmed = '' THEN
    RETURN '';
  END IF;

  v_lower := lower(v_trimmed);
  IF v_lower = 'ruang sosmed core' THEN
    RETURN 'Ruang Sosmed Class';
  ELSIF v_lower = 'creator growth lab' THEN
    RETURN 'Specialist Growth Lab';
  END IF;

  RETURN v_trimmed;
END;
$$;

-- 2. Helper pencocokan cohort item vs nama project (selaras dengan doesItemMatchCohortProject di app)
CREATE OR REPLACE FUNCTION public._cohort_matches_project(
  p_item_cohort text,
  p_project_name text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_p text := lower(public._normalize_cohort_project_name(p_project_name));
  v_c text := lower(public._normalize_cohort_project_name(p_item_cohort));
BEGIN
  IF v_p = '' THEN
    RETURN false;
  END IF;
  IF v_c = v_p THEN
    RETURN true;
  END IF;
  IF v_p LIKE '%ruang sosmed%' AND (v_c = '' OR v_c LIKE '%ruang sosmed%') THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- 3. Ambil daftar nama Project/Cohort yang sedang mengaktifkan shareWithAllLearners = true
CREATE OR REPLACE FUNCTION public._get_shared_project_names()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_row AS (
    SELECT c.settings_json
    FROM public.contents c
    WHERE c.title = '__SYSTEM_COHORT_PROJECTS__'
    ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST
    LIMIT 1
  ),
  shared_elems AS (
    SELECT public._normalize_cohort_project_name(elem->>'name') AS project_name
    FROM latest_row,
         LATERAL jsonb_array_elements(
           CASE
             WHEN jsonb_typeof(latest_row.settings_json->'cohortProjects') = 'array'
               THEN latest_row.settings_json->'cohortProjects'
             ELSE '[]'::jsonb
           END
         ) AS elem
    WHERE coalesce((elem->>'shareWithAllLearners')::boolean, false) = true
  )
  SELECT coalesce(array_agg(DISTINCT project_name), '{}'::text[])
  FROM shared_elems
  WHERE project_name <> '';
$$;

-- 4. Fungsi inti auto-assign learners ke seluruh folder & materi pada project shared-all
CREATE OR REPLACE FUNCTION public._assign_learners_to_shared_contents(
  p_project_name text DEFAULT NULL,
  p_learner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shared_projects text[];
  v_filter_project text := lower(public._normalize_cohort_project_name(p_project_name));
  v_learner_names text[];
  v_content record;
  v_meta jsonb;
  v_settings jsonb;
  v_existing_learners jsonb;
  v_next_learners jsonb;
  v_ins_count integer := 0;
  v_total_enrollments integer := 0;
  v_updated_contents integer := 0;
BEGIN
  v_shared_projects := public._get_shared_project_names();

  IF v_filter_project <> '' THEN
    SELECT coalesce(array_agg(sp), '{}'::text[])
    INTO v_shared_projects
    FROM unnest(v_shared_projects) AS sp
    WHERE lower(public._normalize_cohort_project_name(sp)) = v_filter_project;
  END IF;

  IF coalesce(array_length(v_shared_projects, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'contents_updated', 0,
      'enrollments_inserted', 0
    );
  END IF;

  -- Kumpulkan tepat 1 nama tampilan unik per siswa target agar tidak terjadi double-count
  SELECT coalesce(array_agg(display_name ORDER BY created_at ASC), '{}'::text[])
  INTO v_learner_names
  FROM (
    SELECT DISTINCT ON (lower(display_name))
      display_name,
      created_at
    FROM (
      SELECT
        COALESCE(
          NULLIF(trim(p.full_name), ''),
          split_part(COALESCE(p.email, 'Learner'), '@', 1)
        ) AS display_name,
        p.created_at
      FROM public.profiles p
      WHERE p.role = 'learner'::public.user_role
        AND lower(coalesce(p.email, '')) <> 'admin@ruangsosmed.id'
        AND lower(coalesce(p.email, '')) NOT LIKE '%dinur%'
        AND (p_learner_id IS NULL OR p.id = p_learner_id)
    ) raw_learners
    WHERE display_name <> ''
    ORDER BY lower(display_name), created_at ASC
  ) dedup_learners;

  IF coalesce(array_length(v_learner_names, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'contents_updated', 0,
      'enrollments_inserted', 0
    );
  END IF;

  FOR v_content IN
    WITH active_contents AS (
      SELECT
        c.id,
        c.title,
        c.type::text AS db_type,
        c.category_tags,
        c.cohort,
        c.folder_name,
        c.settings_json,
        (
          c.type::text = 'folder'
          OR coalesce((c.settings_json->'explorer_meta'->>'isFolder')::boolean, false)
          OR (c.settings_json->'explorer_meta'->>'itemType' = 'Folder')
          OR ('Folder' = ANY(coalesce(c.category_tags, '{}'::text[])))
        ) AS is_folder,
        coalesce(
          nullif(trim(c.cohort), ''),
          nullif(trim(c.settings_json->'explorer_meta'->>'cohort'), ''),
          ''
        ) AS own_cohort,
        coalesce(
          nullif(trim(c.folder_name), ''),
          nullif(trim(c.settings_json->'explorer_meta'->>'folderName'), ''),
          ''
        ) AS eff_folder_name
      FROM public.contents c
      WHERE c.title NOT LIKE '__SYSTEM_%'
        AND c.status::text IS DISTINCT FROM 'archived'
        AND coalesce((c.settings_json->'explorer_meta'->>'isArchived')::boolean, false) = false
    ),
    folder_cohorts AS (
      SELECT DISTINCT ON (lower(trim(ac.title)))
        lower(trim(ac.title)) AS folder_key,
        ac.own_cohort AS folder_cohort
      FROM active_contents ac
      WHERE ac.is_folder = true
        AND ac.own_cohort <> ''
      ORDER BY lower(trim(ac.title))
    ),
    resolved_contents AS (
      SELECT
        ac.id,
        ac.title,
        ac.is_folder,
        ac.settings_json,
        CASE
          WHEN NOT ac.is_folder AND fc.folder_cohort IS NOT NULL AND fc.folder_cohort <> ''
            THEN fc.folder_cohort
          ELSE ac.own_cohort
        END AS effective_cohort
      FROM active_contents ac
      LEFT JOIN folder_cohorts fc
        ON fc.folder_key = lower(trim(ac.eff_folder_name))
    )
    SELECT rc.id, rc.title, rc.is_folder, rc.settings_json
    FROM resolved_contents rc
    WHERE EXISTS (
      SELECT 1
      FROM unnest(v_shared_projects) AS sp
      WHERE public._cohort_matches_project(rc.effective_cohort, sp)
    )
  LOOP
    -- Enroll setiap siswa aktif untuk materi non-Folder (tanpa menimpa progress yang sudah ada)
    IF NOT v_content.is_folder THEN
      INSERT INTO public.enrollments (
        content_id,
        learner_id,
        status,
        progress_percent,
        completed_chapter_ids
      )
      SELECT
        v_content.id,
        p.id,
        'not_started'::public.enrollment_status,
        0,
        '{}'::uuid[]
      FROM public.profiles p
      WHERE p.role = 'learner'::public.user_role
        AND lower(coalesce(p.email, '')) <> 'admin@ruangsosmed.id'
        AND lower(coalesce(p.email, '')) NOT LIKE '%dinur%'
        AND (p_learner_id IS NULL OR p.id = p_learner_id)
      ON CONFLICT (content_id, learner_id) DO NOTHING;

      GET DIAGNOSTICS v_ins_count = ROW_COUNT;
      v_total_enrollments := v_total_enrollments + coalesce(v_ins_count, 0);
    END IF;

    v_settings := coalesce(v_content.settings_json, '{}'::jsonb);
    v_meta := CASE
      WHEN jsonb_typeof(v_settings->'explorer_meta') = 'object'
        THEN v_settings->'explorer_meta'
      ELSE '{}'::jsonb
    END;
    v_existing_learners := CASE
      WHEN jsonb_typeof(v_meta->'assignedLearners') = 'array'
        THEN v_meta->'assignedLearners'
      ELSE '[]'::jsonb
    END;

    -- Gabungkan daftar siswa eksisting + siswa baru secara case-insensitive sambil mempertahankan urutan awal
    SELECT coalesce(jsonb_agg(sub.val ORDER BY sub.first_ord), '[]'::jsonb)
    INTO v_next_learners
    FROM (
      SELECT DISTINCT ON (lower(trim(val)))
        trim(val) AS val,
        ord AS first_ord
      FROM (
        SELECT val, ord
        FROM jsonb_array_elements_text(v_existing_learners) WITH ORDINALITY AS t(val, ord)
        UNION ALL
        SELECT val, (1000000 + ord) AS ord
        FROM unnest(v_learner_names) WITH ORDINALITY AS u(val, ord)
      ) combined
      WHERE coalesce(trim(val), '') <> ''
      ORDER BY lower(trim(val)), ord
    ) sub;

    IF v_next_learners IS DISTINCT FROM v_existing_learners
       OR (v_meta->>'assignedCount') IS DISTINCT FROM jsonb_array_length(v_next_learners)::text THEN
      v_meta := v_meta || jsonb_build_object(
        'assignedLearners', v_next_learners,
        'assignedCount', jsonb_array_length(v_next_learners)
      );

      UPDATE public.contents
      SET
        settings_json = v_settings || jsonb_build_object('explorer_meta', v_meta),
        updated_at = now()
      WHERE id = v_content.id;

      v_updated_contents := v_updated_contents + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'contents_updated', v_updated_contents,
    'enrollments_inserted', v_total_enrollments
  );
END;
$$;

-- 5. RPC untuk Admin/Mentor menyinkronkan seluruh siswa ke project shared-all
CREATE OR REPLACE FUNCTION public.sync_shared_project_enrollments(
  p_project_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_mentor() THEN
    RAISE EXCEPTION 'Forbidden: hanya Admin/Mentor yang dapat menjalankan sinkronisasi massal';
  END IF;

  RETURN public._assign_learners_to_shared_contents(p_project_name, NULL);
END;
$$;

-- 6. RPC untuk Learner menyinkronkan dirinya sendiri saat daftar / login ke semua project shared-all
CREATE OR REPLACE FUNCTION public.sync_my_shared_project_enrollments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  RETURN public._assign_learners_to_shared_contents(NULL, v_uid);
END;
$$;

-- 7. Trigger otomatis saat siswa baru mendaftar / di-update pada `public.profiles`
CREATE OR REPLACE FUNCTION public.trg_fn_profiles_auto_assign_shared_projects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'learner'::public.user_role
     AND lower(coalesce(NEW.email, '')) <> 'admin@ruangsosmed.id'
     AND lower(coalesce(NEW.email, '')) NOT LIKE '%dinur%' THEN
    BEGIN
      PERFORM public._assign_learners_to_shared_contents(NULL, NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[RuangSosmed] Auto-assign profile gagal tanpa memblokir signup: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_auto_assign_shared_projects ON public.profiles;
CREATE TRIGGER trg_profiles_auto_assign_shared_projects
  AFTER INSERT OR UPDATE OF role, full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_profiles_auto_assign_shared_projects();

-- 8. Trigger otomatis saat project shared-all diubah atau folder/materi baru ditambahkan/dipindah
CREATE OR REPLACE FUNCTION public.trg_fn_contents_auto_assign_shared_projects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.title = '__SYSTEM_COHORT_PROJECTS__' THEN
    IF TG_OP = 'INSERT'
       OR (OLD.settings_json->'cohortProjects') IS DISTINCT FROM (NEW.settings_json->'cohortProjects') THEN
      BEGIN
        PERFORM public._assign_learners_to_shared_contents(NULL, NULL);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[RuangSosmed] Auto-assign cohort update gagal: %', SQLERRM;
      END;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.title LIKE '__SYSTEM_%' THEN
    RETURN NEW;
  END IF;

  IF NEW.status::text = 'archived'
     OR coalesce((NEW.settings_json->'explorer_meta'->>'isArchived')::boolean, false) = true THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.cohort IS NOT DISTINCT FROM NEW.cohort
       AND OLD.folder_name IS NOT DISTINCT FROM NEW.folder_name
       AND OLD.status IS NOT DISTINCT FROM NEW.status
       AND (OLD.settings_json->'explorer_meta'->>'cohort') IS NOT DISTINCT FROM (NEW.settings_json->'explorer_meta'->>'cohort')
       AND (OLD.settings_json->'explorer_meta'->>'folderName') IS NOT DISTINCT FROM (NEW.settings_json->'explorer_meta'->>'folderName') THEN
      RETURN NEW;
    END IF;
  END IF;

  BEGIN
    PERFORM public._assign_learners_to_shared_contents(NULL, NULL);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[RuangSosmed] Auto-assign content insert/move gagal: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contents_auto_assign_shared_projects ON public.contents;
CREATE TRIGGER trg_contents_auto_assign_shared_projects
  AFTER INSERT OR UPDATE ON public.contents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_contents_auto_assign_shared_projects();

-- 9. Hak akses ketat untuk fungsi internal & RPC
REVOKE ALL ON FUNCTION public._get_shared_project_names() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._assign_learners_to_shared_contents(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_fn_profiles_auto_assign_shared_projects() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_fn_contents_auto_assign_shared_projects() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.sync_shared_project_enrollments(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_shared_project_enrollments(text) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_my_shared_project_enrollments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_my_shared_project_enrollments() TO authenticated;

-- 10. Backfill langsung untuk seluruh siswa & project shared-all yang sudah ada
SELECT public._assign_learners_to_shared_contents(NULL, NULL) AS backfill_result;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 023_admin_delete_learner.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — ADMIN DELETE LEARNER (PERMANENT DB + AUTH CLEANUP)
-- File: supabase/migrations/023_admin_delete_learner.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================
-- Fitur:
-- 1. RPC `public.admin_delete_learner_account(p_user_id, p_email, p_name)`
--    (khusus Admin terverifikasi via `public.is_admin()`).
-- 2. Menghapus permanen seluruh data siswa di database (`enrollments`,
--    `submissions`, `discussions`, `content_issues`, `user_subscriptions`,
--    `user_video_unlocks`, `user_asset_unlocks`, `lesson_progress`,
--    `lesson_notes`, `pro_voucher_redemptions`, `learner_unlocked_items`,
--    `pro_upgrade_requests`, `user_profiles`, `profiles`), membersihkan
--    nama/email dari `contents.settings_json->explorer_meta->assignedLearners`,
--    mencabut sesi/token aktif, serta menghapus user dari `auth.users`
--    sehingga siswa otomatis logout dan wajib daftar baru bila ingin masuk.
-- 3. Memastikan tabel `public.profiles` terdaftar di `supabase_realtime`
--    agar sinyal DELETE langsung memutus sesi siswa yang sedang online.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_learner_account(
  p_user_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_clean_email text := lower(trim(coalesce(p_email, '')));
  v_clean_name text := trim(coalesce(p_name, ''));
  v_target_uid uuid := p_user_id;
  v_target_email text;
  v_target_name text;
  v_target_role text;
  v_usernames text[] := '{}'::text[];
  v_deleted_profiles integer := 0;
  v_deleted_user_profiles integer := 0;
  v_deleted_auth integer := 0;
  v_cleaned_contents integer := 0;
  v_content record;
  v_settings jsonb;
  v_meta jsonb;
  v_existing_learners jsonb;
  v_next_learners jsonb;
BEGIN
  -- 1. Hanya Admin terautentikasi yang diizinkan
  IF v_caller_uid IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: hanya Admin yang dapat menghapus akun siswa';
  END IF;

  -- 2. Resolusi target user dari `public.profiles` (ID prioritas, lalu email)
  SELECT p.id, lower(trim(p.email)), trim(p.full_name), p.role::text
  INTO v_target_uid, v_target_email, v_target_name, v_target_role
  FROM public.profiles p
  WHERE (p_user_id IS NOT NULL AND p.id = p_user_id)
     OR (v_clean_email <> '' AND lower(trim(p.email)) = v_clean_email)
  ORDER BY CASE WHEN p_user_id IS NOT NULL AND p.id = p_user_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Fallback cek langsung ke `auth.users` bila baris `profiles` sudah hilang
  IF v_target_uid IS NULL THEN
    SELECT
      u.id,
      lower(trim(u.email)),
      trim(coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, ''), '@', 1)))
    INTO v_target_uid, v_target_email, v_target_name
    FROM auth.users u
    WHERE (p_user_id IS NOT NULL AND u.id = p_user_id)
       OR (v_clean_email <> '' AND lower(trim(u.email)) = v_clean_email)
    ORDER BY u.created_at DESC
    LIMIT 1;
  END IF;

  IF coalesce(v_target_email, '') <> '' THEN
    v_clean_email := v_target_email;
  END IF;
  IF coalesce(v_target_name, '') <> '' THEN
    v_clean_name := v_target_name;
  END IF;

  IF v_target_uid IS NULL AND v_clean_email = '' AND v_clean_name = '' THEN
    RAISE EXCEPTION 'Data siswa tidak ditemukan.';
  END IF;

  -- 3. Proteksi ketat: tolak hapus diri sendiri dan tolak hapus akun Admin/Founder
  IF v_target_uid IS NOT NULL AND v_target_uid = v_caller_uid THEN
    RAISE EXCEPTION 'Forbidden: tidak dapat menghapus akun Anda sendiri';
  END IF;

  IF lower(coalesce(v_target_role, '')) = 'admin'
     OR v_clean_email = 'admin@ruangsosmed.id'
     OR v_clean_email LIKE '%dinur%' THEN
    RAISE EXCEPTION 'Forbidden: akun Admin tidak dapat dihapus melalui menu siswa';
  END IF;

  -- 4. Kumpulkan username legacy (`public.user_profiles`) jika tabel tersedia
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    SELECT coalesce(array_agg(DISTINCT lower(trim(up.username))), '{}'::text[])
    INTO v_usernames
    FROM public.user_profiles up
    WHERE (v_target_uid IS NOT NULL AND up.user_id = v_target_uid)
       OR (v_clean_email <> '' AND lower(trim(up.email)) = v_clean_email);
  END IF;

  -- 5. Hapus seluruh data turunan di tabel-tabel terkait secara aman
  IF to_regclass('public.pro_voucher_redemptions') IS NOT NULL THEN
    DELETE FROM public.pro_voucher_redemptions
    WHERE (v_target_uid IS NOT NULL AND user_id = v_target_uid)
       OR (v_clean_email <> '' AND lower(trim(user_email)) = v_clean_email);
  END IF;

  IF to_regclass('public.learner_unlocked_items') IS NOT NULL THEN
    DELETE FROM public.learner_unlocked_items
    WHERE (v_target_uid IS NOT NULL AND user_id = v_target_uid)
       OR (v_clean_email <> '' AND lower(trim(user_email)) = v_clean_email);
  END IF;

  IF to_regclass('public.pro_upgrade_requests') IS NOT NULL THEN
    DELETE FROM public.pro_upgrade_requests
    WHERE (v_target_uid IS NOT NULL AND user_id = v_target_uid)
       OR (v_clean_email <> '' AND lower(trim(user_email)) = v_clean_email);
  END IF;

  IF coalesce(array_length(v_usernames, 1), 0) > 0 THEN
    IF to_regclass('public.user_subscriptions') IS NOT NULL THEN
      DELETE FROM public.user_subscriptions
      WHERE lower(trim(username)) = ANY(v_usernames);
    END IF;

    IF to_regclass('public.user_video_unlocks') IS NOT NULL THEN
      DELETE FROM public.user_video_unlocks
      WHERE lower(trim(username)) = ANY(v_usernames);
    END IF;

    IF to_regclass('public.user_asset_unlocks') IS NOT NULL THEN
      DELETE FROM public.user_asset_unlocks
      WHERE lower(trim(username)) = ANY(v_usernames);
    END IF;

    IF to_regclass('public.lesson_progress') IS NOT NULL THEN
      DELETE FROM public.lesson_progress
      WHERE lower(trim(session_username)) = ANY(v_usernames);
    END IF;

    IF to_regclass('public.lesson_notes') IS NOT NULL THEN
      DELETE FROM public.lesson_notes
      WHERE lower(trim(username)) = ANY(v_usernames);
    END IF;
  END IF;

  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    DELETE FROM public.user_profiles
    WHERE (v_target_uid IS NOT NULL AND user_id = v_target_uid)
       OR (v_clean_email <> '' AND lower(trim(email)) = v_clean_email);
    GET DIAGNOSTICS v_deleted_user_profiles = ROW_COUNT;
  END IF;

  IF v_target_uid IS NOT NULL THEN
    IF to_regclass('public.enrollments') IS NOT NULL THEN
      DELETE FROM public.enrollments WHERE learner_id = v_target_uid;
    END IF;

    IF to_regclass('public.submissions') IS NOT NULL THEN
      DELETE FROM public.submissions WHERE learner_id = v_target_uid;
    END IF;

    IF to_regclass('public.discussions') IS NOT NULL THEN
      DELETE FROM public.discussions WHERE author_id = v_target_uid;
    END IF;

    IF to_regclass('public.content_issues') IS NOT NULL THEN
      DELETE FROM public.content_issues WHERE reporter_id = v_target_uid;
    END IF;
  END IF;

  -- 6. Bersihkan nama/email target dari `contents.settings_json->explorer_meta->assignedLearners`
  IF v_clean_email <> '' OR v_clean_name <> '' THEN
    FOR v_content IN
      SELECT c.id, c.settings_json
      FROM public.contents c
      WHERE c.title NOT LIKE '__SYSTEM_%'
        AND jsonb_typeof(c.settings_json->'explorer_meta'->'assignedLearners') = 'array'
    LOOP
      v_settings := coalesce(v_content.settings_json, '{}'::jsonb);
      v_meta := v_settings->'explorer_meta';
      v_existing_learners := v_meta->'assignedLearners';

      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(v_existing_learners) AS elem(val)
        WHERE (v_clean_email <> '' AND lower(trim(elem.val)) = v_clean_email)
           OR (v_clean_name <> '' AND lower(trim(elem.val)) = lower(v_clean_name))
      ) THEN
        SELECT coalesce(jsonb_agg(sub.val ORDER BY sub.ord), '[]'::jsonb)
        INTO v_next_learners
        FROM (
          SELECT val, ord
          FROM jsonb_array_elements_text(v_existing_learners) WITH ORDINALITY AS t(val, ord)
          WHERE coalesce(trim(val), '') <> ''
            AND NOT (v_clean_email <> '' AND lower(trim(val)) = v_clean_email)
            AND NOT (v_clean_name <> '' AND lower(trim(val)) = lower(v_clean_name))
        ) sub;

        v_meta := v_meta || jsonb_build_object(
          'assignedLearners', v_next_learners,
          'assignedCount', jsonb_array_length(v_next_learners)
        );

        UPDATE public.contents
        SET
          settings_json = v_settings || jsonb_build_object('explorer_meta', v_meta),
          updated_at = now()
        WHERE id = v_content.id;

        v_cleaned_contents := v_cleaned_contents + 1;
      END IF;
    END LOOP;
  END IF;

  -- 7. Hapus dari `public.profiles` (akan memicu Realtime DELETE event ke client aktif)
  DELETE FROM public.profiles
  WHERE (v_target_uid IS NOT NULL AND id = v_target_uid)
     OR (v_clean_email <> '' AND lower(trim(email)) = v_clean_email);
  GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;

  -- 8. Cabut seluruh sesi/token aktif & hapus permanen dari `auth.users`
  IF v_target_uid IS NOT NULL THEN
    BEGIN
      DELETE FROM auth.sessions WHERE user_id = v_target_uid;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    BEGIN
      DELETE FROM auth.refresh_tokens WHERE user_id::text = v_target_uid::text;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    DELETE FROM auth.users WHERE id = v_target_uid;
    GET DIAGNOSTICS v_deleted_auth = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'target_uid', v_target_uid,
    'email', v_clean_email,
    'deleted_auth_user', v_deleted_auth > 0,
    'deleted_profile', v_deleted_profiles,
    'deleted_user_profiles', v_deleted_user_profiles,
    'cleaned_contents', v_cleaned_contents
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_learner_account(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_learner_account(uuid, text, text) TO authenticated;

-- Pastikan `public.profiles` masuk dalam publikasi Realtime agar event DELETE instan terbaca
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'profiles'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 024_landing_page_v6_full_system.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — LANDING PAGE V7 (FOKUS BELAJAR & TUJUAN SISWA)
-- File: supabase/migrations/024_landing_page_v6_full_system.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor.
-- Memperbarui baris slug = 'home' di public.landing_pages dengan preset lengkap
-- Ruang Sosmed 2.0 sambil mempertahankan payment_config & header_image_url
-- yang sudah dikonfigurasi oleh Admin.
-- =============================================================================

INSERT INTO public.landing_pages (
  slug,
  title,
  description,
  header_image_url,
  header_config,
  payment_config,
  footer_config,
  theme,
  status,
  blocks
)
VALUES (
  'home',
  'Ruang Sosmed 2.0 — Official Platform',
  'Platform belajar Social Media Specialist 100% Full Organik dengan Kurikulum Berjenjang, Wiki SOP, Catatan & Diskusi Mentor, Rumi XP, Rewards Shop & Sertifikat HD.',
  '',
  $header_cfg${
    "showAnnouncement": true,
    "announcementBadge": "Ruang Sosmed 2.0 Live",
    "announcementText": "Belajar Strategi Social Media 100% Full Organik • Roadmap Siap Kerja • Gamifikasi Rumi XP • Trial 3 & 7 Hari",
    "announcementBgColor": "#121215",
    "announcementBadgeColor": "#10B981",
    "showNavbar": true,
    "logoUrl": "/logo1.png",
    "brandTitle": "Ruang Sosmed 2.0",
    "navLinks": [
      { "id": "nav-1", "label": "Alur Belajar", "href": "#flow-section" },
      { "id": "nav-2", "label": "Ekosistem", "href": "#ecosystem-section" },
      { "id": "nav-3", "label": "Fitur", "href": "#features-section" },
      { "id": "nav-4", "label": "Kurikulum", "href": "#topics-section" },
      { "id": "nav-5", "label": "Paket Akses", "href": "#pricing-section" },
      { "id": "nav-6", "label": "FAQ", "href": "#faq-section" }
    ],
    "loginLabel": "Masuk",
    "registerLabel": "Daftar Akun",
    "navbarBgColor": "#FFFFFF",
    "primaryButtonColor": "#4F39F6"
  }$header_cfg$::jsonb,
  $payment_cfg${
    "qrCodeUrl": "",
    "bankName": "BCA / Mandiri / QRIS",
    "accountNumber": "123-456-7890",
    "accountHolder": "PT Ruang Sosmed Indonesia",
    "whatsappNumber": "6281234567890",
    "merchantName": "Ruang Sosmed 2.0",
    "paymentInstructions": "Scan kode QRIS di atas melalui m-Banking atau e-wallet (GoPay, OVO, Dana, ShopeePay) Anda. Setelah pembayaran berhasil, kirim konfirmasi untuk aktivasi akses."
  }$payment_cfg$::jsonb,
  $footer_cfg${
    "showFooter": true,
    "brandTitle": "Ruang Sosmed 2.0",
    "logoUrl": "/favicon.png",
    "description": "Platform belajar Social Media Specialist 100% Full Organik — lengkap dengan Kurikulum Berjenjang, Wiki SOP, Catatan & Diskusi Mentor, Gamifikasi Rumi XP, Rewards Shop, dan Sertifikat HD.",
    "copyrightText": "© 2026 Ruang Sosmed 2.0. All rights reserved.",
    "bgColor": "#121215",
    "textColor": "#FFFFFF"
  }$footer_cfg$::jsonb,
  'violet',
  'published',
  $blocks$[
    {
      "id": "block-hero",
      "type": "hero",
      "data": {
        "badgeText": "🌱 100% Full Organik • Kurikulum, Praktik, SOP & Sertifikat Siap Kerja",
        "eyebrow": "Ruang Sosmed 2.0 • Platform Belajar Social Media Specialist",
        "headline": "Belajar Strategi Social Media Organik dari Nol hingga Siap Handle Brand",
        "body": "Platform belajar terstruktur untuk kamu yang ingin menguasai strategi konten organik, workflow kerja agensi, dan portofolio Social Media Specialist—lengkap dengan Ruang Kelas interaktif, Wiki SOP, Diskusi Mentor, Gamifikasi Rumi XP, Rewards Shop, hingga Sertifikat HD.",
        "buttonLabel": "Daftar Gratis Sekarang",
        "secondaryButtonLabel": "Pelajari Alur Sistem",
        "secondaryTargetId": "flow-section",
        "showSystemPreview": true,
        "imageUrl": "",
        "imageAlt": "Pratinjau Portal Ruang Sosmed 2.0",
        "stats": [
          { "label": "Kurikulum Organik", "value": "3 Seri • 22 Modul" },
          { "label": "Belajar Praktis", "value": "Video, Wiki SOP & Kuis" },
          { "label": "Akses Fleksibel", "value": "FREE • Basic • PRO + Trial" },
          { "label": "Output Karir", "value": "Rewards & Sertifikat HD" }
        ]
      }
    },
    {
      "id": "block-flow",
      "type": "benefits",
      "eyebrow": "ALUR & FLOW BELAJAR",
      "sectionTitle": "Alur Belajar End-to-End di Ruang Sosmed 2.0",
      "subtitle": "Dari pertama kali mendaftar sampai meraih sertifikat kelulusan HD—semua dirancang untuk membawamu siap terjun sebagai Social Media Specialist.",
      "items": [
        {
          "id": "flow-1",
          "number": 1,
          "tag": "Mulai Cepat",
          "title": "Daftar Akun & Buka Akses Kelas",
          "description": "Buat akun gratis via Email atau Google. Materi utama langsung siap diakses di berandamu, atau masukkan Kode Akses jika kamu mengikuti kelas batch khusus."
        },
        {
          "id": "flow-2",
          "number": 2,
          "tag": "Kurikulum Terstruktur",
          "title": "Ikuti Roadmap Organik dari Nol",
          "description": "Pelajari materi secara berjenjang mulai dari Fundamental & Mindset, Content System & Workflow, hingga Optimization & Maintenance—100% strategi organik tanpa iklan berbayar."
        },
        {
          "id": "flow-3",
          "number": 3,
          "tag": "Belajar Aktif",
          "title": "Praktik Kuis, Wiki SOP & Diskusi Mentor",
          "description": "Pelajari video & panduan Wiki SOP siap pakai, simpan catatan pribadi per bab, kerjakan kuis & tugas praktik, serta tanya jawab langsung bersama Mentor."
        },
        {
          "id": "flow-4",
          "number": 4,
          "tag": "Jaga Konsistensi",
          "title": "Tumbuhkan Maskot Rumi & Kumpulkan XP",
          "description": "Setiap bab selesai, kuis, catatan, hingga streak harian menaikkan tahap evolusi Rumi (Lv.1 Baby → Lv.5 Superior) agar ritme belajarmu selalu terjaga."
        },
        {
          "id": "flow-5",
          "number": 5,
          "tag": "Benefit Nyata",
          "title": "Raih Poin Bintang & Tukar di Rewards Shop",
          "description": "Kumpulkan Poin Bintang (★) dari progres belajarmu untuk naik Leaderboard, tukar Template/E-Book/Voucher/1-on-1 Mentoring, atau buka modul lanjutan satuan."
        },
        {
          "id": "flow-6",
          "number": 6,
          "tag": "Siap Kerja & Klien",
          "title": "Audit Portofolio & Sertifikat Kelulusan HD",
          "description": "Tuntaskan kelas dan tugas praktik untuk mendapatkan feedback personal dari Mentor serta Sertifikat Kelulusan HD siap lampir di CV & LinkedIn."
        }
      ],
      "data": {}
    },
    {
      "id": "block-system-showcase",
      "type": "system_showcase",
      "data": {
        "eyebrow": "EKSPLORASI EKOSISTEM 2.0",
        "heading": "Lihat Cara Kerja Setiap Fitur di Dalam Ruang Sosmed 2.0",
        "subtitle": "Klik tiap tab untuk melihat bagaimana Ruang Kelas, Evolusi Rumi, hingga sistem Paket, Poin & Sertifikat membantu proses belajarmu.",
        "tabs": [
          {
            "id": "tab-learner-portal",
            "tabLabel": "Ruang Kelas & Wiki SOP",
            "badge": "Active Classroom",
            "title": "Ruang Kelas Interaktif, Wiki SOP & Diskusi Langsung Mentor",
            "subtitle": "Belajar tidak cuma menonton video pasif. Setiap bab dilengkapi catatan pribadi, panduan SOP siap pakai, latihan praktik, dan ruang tanya jawab langsung bersama Mentor.",
            "visualType": "learner_portal",
            "highlights": [
              {
                "title": "Kurikulum Organik & Wiki SOP Siap Pakai",
                "description": "Materi video terstruktur ditambah dokumen Wiki SOP (content calendar, brief kreatif, 30 days handling, rate card) yang bisa langsung dipakai kerja."
              },
              {
                "title": "Kuis Interaktif & Tugas Praktik Nyata",
                "description": "Uji pemahaman melalui beragam format kuis dan kerjakan studi kasus nyata dengan feedback langsung dari Mentor."
              },
              {
                "title": "Catatan Pribadi, Favorit & Q&A per Bab",
                "description": "Simpan catatan penting di tiap bab, tandai materi favorit, unduh lampiran template, dan ajukan pertanyaan langsung tanpa keluar dari kelas."
              }
            ],
            "ctaLabel": "Coba Masuk Portal Gratis",
            "ctaAction": "register"
          },
          {
            "id": "tab-rumi-xp",
            "tabLabel": "Evolusi Rumi & Konsistensi",
            "badge": "Gamifikasi 5 Tahap",
            "title": "Maskot Rumi Tumbuh Seiring Konsistensi Belajarmu",
            "subtitle": "Setiap aktivitas belajar memberi Rumi XP nyata untuk berevolusi dari Lv.1 Baby Rumi hingga Lv.5 Superior Rumi, ditemani Rumi Assistant cepat di setiap halaman.",
            "visualType": "rumi_evolution",
            "highlights": [
              {
                "title": "5 Tahap Evolusi Rumi (Lv.1–Lv.5)",
                "description": "Baby Rumi 🌱 (0 XP) → Junior Rumi ✨ (50 XP) → Teen Rumi 🚀 (250 XP) → Pro Rumi 👑 (600 XP) → Superior Rumi 🏆 (1000 XP)."
              },
              {
                "title": "XP dari Aktivitas Nyata + Multiplier",
                "description": "Login harian (+1 XP), streak 7 hari (+5 XP), selesai bab (+2 XP), submit kuis (+4 XP), catat & ulasan (+2 XP), hingga 2× XP di paket PRO."
              },
              {
                "title": "Rumi Floating Stream Deck",
                "description": "Tekan tombol cepat atau shortcut keyboard 1–6 untuk lompat menu, lihat ringkasan halaman, serta tanya jawab FAQ kontekstual instan."
              }
            ],
            "ctaLabel": "Lihat Paket dengan Bonus XP",
            "ctaAction": "scroll_pricing"
          },
          {
            "id": "tab-access-rewards",
            "tabLabel": "Akses Fleksibel, Poin & Hadiah",
            "badge": "Ekonomi & Sertifikat",
            "title": "3 Tier Fleksibel, Trial 3/7 Hari, Redeem Kode, Poin & Sertifikat HD",
            "subtitle": "Belajar sesuai ritmemu tanpa terpaksa bayar penuh di awal. Pilih FREE, Basic, PRO Unlimited, uji coba Trial, tukar Kode Kelas/Voucher, atau buka bab lanjutan via Poin Bintang.",
            "visualType": "access_rewards",
            "highlights": [
              {
                "title": "Akses Langsung & Redeem Kode Kelas",
                "description": "Materi utama langsung terbuka setelah mendaftar. Untuk kelas batch khusus, cukup masukkan Kode Akses Folder di Beranda untuk membuka seluruh bab."
              },
              {
                "title": "Unlock Satuan, Trial 3/7 Hari & Voucher PRO",
                "description": "Buka bab lanjutan pakai Poin Bintang (★), bayar per materi, klaim Kode Voucher PRO berjangka, atau coba paket Basic/PRO dengan Trial 3 & 7 Hari."
              },
              {
                "title": "Rewards Shop & Sertifikat HD",
                "description": "Poin Bintang masuk Leaderboard dan bisa ditukar Template, E-Book, Voucher Diskon, 1-on-1 Mentoring, atau Merch—plus Sertifikat Kelulusan HD otomatis."
              }
            ],
            "ctaLabel": "Bandingkan Paket Belajar",
            "ctaAction": "scroll_pricing"
          }
        ]
      }
    },
    {
      "id": "block-features",
      "type": "features",
      "data": {
        "heading": "Semua Fitur yang Bikin Belajar Konsisten & Terukur",
        "subtitle": "Bukan sekadar kumpulan video pasif—Ruang Sosmed 2.0 menyatukan kurikulum organik terarah, praktik nyata, gamifikasi XP, dan mentoring aktif.",
        "items": [
          {
            "title": "Akses Instan & Redeem Kode Kelas",
            "description": "Materi utama langsung terbuka saat akun aktif, sedangkan kelas batch khusus cukup dibuka lewat Kode Akses dari mentor di Beranda.",
            "icon": "KeyRound"
          },
          {
            "title": "Ruang Kelas Multi-Format & Wiki SOP",
            "description": "Kombinasi video pembelajaran, halaman artikel, Wiki SOP kerja agensi, kuis interaktif 5 tipe soal, dan tugas praktik nyata.",
            "icon": "BookOpen"
          },
          {
            "title": "Catatan Bab, Favorit & Diskusi Mentor",
            "description": "Setiap siswa bisa menyimpan catatan pribadi per bab, menandai materi favorit, mengunduh template, dan tanya jawab langsung dengan Mentor.",
            "icon": "MessageSquare"
          },
          {
            "title": "Evolusi Maskot Rumi (Lv.1–5) & Stream Deck",
            "description": "Kumpulkan Rumi XP dari login & belajar untuk menumbuhkan Baby Rumi hingga Superior Rumi, lengkap dengan asisten pintasan Stream Deck 1–6.",
            "icon": "Bot"
          },
          {
            "title": "Poin Bintang, Leaderboard & Rewards Shop",
            "description": "Raih Poin Bintang (★) tiap selesai bab dan tukar di Rewards Shop atau gunakan untuk membuka bab lanjutan tanpa harus langsung upgrade.",
            "icon": "Gift"
          },
          {
            "title": "Sertifikat Kelulusan HD Terverifikasi",
            "description": "Setelah menuntaskan seluruh bab wajib dan evaluasi kelas, klaim Sertifikat Kelulusan HD (PNG/PDF) resmi sebagai bukti kompetensi portofolio.",
            "icon": "Award"
          },
          {
            "title": "3 Tier + Trial 3/7 Hari + Voucher PRO",
            "description": "Mulai gratis di FREE, coba Basic atau PRO lewat Trial 3 & 7 Hari, aktivasi Kode Voucher PRO berjangka, atau checkout cepat via QRIS & Transfer.",
            "icon": "Zap"
          },
          {
            "title": "Dokumen Kerja, Rate Card & Portofolio",
            "description": "Panduan lengkap 30 hari handling akun, penyusunan SOP kerja, penentuan rate card jasa, hingga portofolio siap pitching klien maupun melamar kerja.",
            "icon": "FolderOpen"
          }
        ]
      }
    },
    {
      "id": "block-topics",
      "type": "topics",
      "data": {
        "heading": "Learning Center",
        "subtitle": "Pilih kelas yang ingin kamu pelajari — Kurikulum berjenjang dari Fundamental, Intermediate, hingga Masterclass (100% Full Organik).",
        "topics": [
          {
            "id": "fundamental-series",
            "tag": "FUNDAMENTAL",
            "tagColor": "#2563EB",
            "eyebrow": "FUNDAMENTAL SERIES",
            "bannerTitle": "INTRODUCE TO SOCIAL MEDIA SPECIALIST",
            "bannerSubtitle": "Kelas untuk kamu yang ingin memulai",
            "bannerTheme": "blue",
            "category": "SERIES FUNDAMENTAL",
            "title": "Fundamental Social Media Specialist",
            "description": "Pelajari strategi konten, ritme posting, dan cara membaca performa sosial media dari nol.",
            "lessonsCount": 10,
            "modules": [
              { "number": 1, "title": "Modul 1 - Social Media Specialist Fundamental & Mindset" },
              { "number": 2, "title": "Modul 2 - Social Media Channel Behavioral Part 1" },
              { "number": 3, "title": "Modul 3 - Social Media Channel Behavioral Part 2" },
              { "number": 4, "title": "Modul 4 - Audience Insight Development" },
              { "number": 5, "title": "Modul 5 - Social Media Analytics" },
              { "number": 6, "title": "Modul 6 - Social Media Hacks for Social Media Specialist" },
              { "number": 7, "title": "Modul 7 - 30 Days Social Media Specialist in Handling" },
              { "number": 8, "title": "Modul 8 - Persiapan Dokumen Social Media Specialist" },
              { "number": 9, "title": "Modul 9 - Social Media Specialist Rate Development" },
              { "number": 10, "title": "Modul 10 - Portofolio Development for Social Media Specialist" }
            ]
          },
          {
            "id": "intermediate-series",
            "tag": "INTERMEDIATE",
            "tagColor": "#EA580C",
            "eyebrow": "INTERMEDIATE SERIES",
            "bannerTitle": "CONTENT SYSTEM & WORKFLOW SOCIAL MEDIA SPECIALIST",
            "bannerSubtitle": "Bangun workflow dari ide hingga approval",
            "bannerTheme": "coral",
            "category": "SERIES INTERMEDIATE",
            "title": "Content System & Workflow",
            "description": "Bangun workflow pembuatan konten yang efisien mulai dari ide, asset, revisi, hingga approval.",
            "lessonsCount": 7,
            "modules": [
              { "number": 1, "title": "Modul 1 - Pemetaan Content Pillars & Editorial Calendar" },
              { "number": 2, "title": "Modul 2 - Ideation Framework & Hook Formula Organik" },
              { "number": 3, "title": "Modul 3 - Asset Sourcing & Brief Desain/Video Kreatif" },
              { "number": 4, "title": "Modul 4 - SOP Revisi & Internal Quality Control" },
              { "number": 5, "title": "Modul 5 - Client Approval Workflow & Feedback Handling" },
              { "number": 6, "title": "Modul 6 - Automation & Scheduling Tools Setup" },
              { "number": 7, "title": "Modul 7 - Weekly Content Reporting System" }
            ]
          },
          {
            "id": "advance-series",
            "tag": "MASTERCLASS",
            "tagColor": "#7C3AED",
            "eyebrow": "ADVANCE SERIES",
            "bannerTitle": "SOCIAL MEDIA OPTIMIZATION & MAINTENANCE",
            "bannerSubtitle": "Optimasi lanjutan lintas platform",
            "bannerTheme": "purple",
            "category": "SERIES MASTERCLASS",
            "title": "Social Media Optimization & Maintenance",
            "description": "Pelajari kelas lanjutan tentang optimasi social media hingga konten yang bisa diaplikasikan ke berbagai media, platform, bahkan kategori akun.",
            "lessonsCount": 5,
            "modules": [
              { "number": 1, "title": "Modul 1 - Multi-Platform Content Adaptation & Distribution" },
              { "number": 2, "title": "Modul 2 - Advanced Organic Algorithm & Virality Principles" },
              { "number": 3, "title": "Modul 3 - Crisis Management & Brand Reputation Handling" },
              { "number": 4, "title": "Modul 4 - Account Maintenance & Evergreen Content Recycling" },
              { "number": 5, "title": "Modul 5 - Scaling Organic Reach Across Niche Categories" }
            ]
          }
        ]
      }
    },
    {
      "id": "block-pricing",
      "type": "pricing",
      "data": {
        "heading": "Pilihan Paket & Akses Fleksibel",
        "subtitle": "Sesuaikan dengan tahap belajarmu: mulai gratis di paket FREE, buka akses inti dengan Basic, atau maksimalkan seluruh fitur tanpa batas lewat PRO Unlimited (tersedia Trial 3 & 7 Hari).",
        "tiers": [
          {
            "id": "tier-free",
            "name": "FREE",
            "price": "Rp 0",
            "numericPrice": 0,
            "period": "Selamanya",
            "badge": "Mulai Tanpa Risiko",
            "description": "Akses seluruh materi gratis & project publik, kumpulkan Rumi XP + Poin Bintang, dan coba sistem kelas interaktif.",
            "features": [
              "Akses langsung materi utama & kelas publik gratis",
              "Redeem Kode Akses Folder / Kelas Batch dari Mentor",
              "Akses materi berstatus Gratis + Kuis Interaktif dasar",
              "Maskot Baby Rumi XP + Poin Bintang (★) & Leaderboard",
              "Beli & buka materi/modul PRO secara satuan kapan saja"
            ],
            "buttonLabel": "Mulai Gratis",
            "highlighted": false,
            "buttonAction": "register"
          },
          {
            "id": "tier-basic",
            "name": "Basic",
            "price": "Rp 75.000",
            "numericPrice": 75000,
            "period": "bulan",
            "badge": "Tersedia Trial 3 & 7 Hari",
            "description": "Buka fitur penting plus hingga 6 modul awal di tiap materi premium. Modul lanjutan bisa dibuka pakai Poin atau beli satuan.",
            "features": [
              "Semua fitur FREE + Bonus Aktivasi & Multiplier XP Rumi",
              "Akses hingga 6 modul awal pada setiap kelas premium",
              "Buka modul lanjutan fleksibel via Poin Bintang atau satuan",
              "Akses Unduh File Lampiran, Template & Dokumen Wiki SOP",
              "Catatan Pribadi per Bab, Simpan Favorit & Diskusi Mentor",
              "Mendukung aktivasi Trial 3 Hari & Trial 7 Hari di dalam portal"
            ],
            "buttonLabel": "Pilih Paket Basic",
            "highlighted": false,
            "buttonAction": "payment_modal"
          },
          {
            "id": "tier-pro",
            "name": "PRO Unlimited",
            "price": "Rp 150.000",
            "numericPrice": 150000,
            "period": "bulan",
            "badge": "Paling Lengkap • 100% Tanpa Batas",
            "description": "Semua fitur FREE dan Basic ditambah akses penuh 100% ke seluruh modul, Sertifikat Kelulusan HD, dan Review Tugas 1-on-1.",
            "features": [
              "Semua 7 Fitur Premium Tanpa Batas + 2× Multiplier XP Rumi",
              "Seluruh modul & video lanjutan terbuka 100% tanpa potong poin",
              "Akses penuh Fundamental, Intermediate & Masterclass Series",
              "Review Tugas Praktik & Audit Portofolio 1-on-1 bersama Mentor",
              "Penerbitan Sertifikat Kelulusan HD resmi saat kelas tuntas",
              "Dukung Trial 3/7 Hari, Kode Voucher PRO & checkout QRIS/Transfer"
            ],
            "buttonLabel": "Aktifkan Paket PRO",
            "highlighted": true,
            "buttonAction": "payment_modal"
          }
        ],
        "footnote": "Punya Kode Akses Folder kelas atau Kode Voucher PRO? Daftar akun gratis terlebih dahulu, lalu tukarkan langsung di Beranda atau menu Paket Akses. Pembayaran QRIS & Transfer Bank diproses cepat dengan konfirmasi praktis."
      }
    },
    {
      "id": "block-testimonial",
      "type": "testimonial",
      "data": {
        "heading": "Cerita dari Pembelajar Ruang Sosmed 2.0",
        "subtitle": "Pengalaman nyata mereka menggunakan Ruang Kelas, Wiki SOP, Catatan Bab, dan Gamifikasi Rumi hingga siap mengelola akun brand.",
        "reviews": [
          {
            "name": "Sarah Wijaya",
            "role": "Junior Social Media Specialist",
            "company": "D2C Fashion Brand",
            "comment": "Begitu daftar dan masukkan kode folder dari mentor, semua materi langsung rapi di Beranda. Fitur catatan per bab dan SOP 30 days in handling-nya bikin saya pede handle 2 akun brand secara full organik.",
            "rating": 5
          },
          {
            "name": "Rian Ramadhan",
            "role": "Freelance Content Strategist",
            "company": "Independent Creator",
            "comment": "Sistem Content Workflow plus Wiki SOP & template rate card di Ruang Sosmed 2.0 benar-benar terpakai saat pitching klien. Tanya jawab di diskusi bab juga cepat dibalas mentor!",
            "rating": 5
          },
          {
            "name": "Nadia Kusuma",
            "role": "Social Media Intern",
            "company": "Creative Digital Agency",
            "comment": "Belajar jadi nggak gampang bolong karena ngejar evolusi Rumi XP tiap hari sama ngumpulin Poin Bintang buat tukar template di Rewards Shop. Sertifikat HD-nya juga langsung kepakai buat CV.",
            "rating": 5
          }
        ]
      }
    },
    {
      "id": "block-faq",
      "type": "faq",
      "data": {
        "heading": "Pertanyaan yang Sering Diajukan",
        "subtitle": "Semua hal yang perlu kamu ketahui tentang alur belajar, sistem akses, gamifikasi Rumi, dan kurikulum Ruang Sosmed 2.0.",
        "faqs": [
          {
            "question": "Bagaimana alur mulai belajar setelah mendaftar akun gratis?",
            "answer": "Setelah daftar via Email atau Google, materi utama & publik langsung siap diakses di portal kamu. Jika kamu ikut kelas batch tertentu, cukup masukkan Kode Akses pada kolom Redeem Kode di Beranda."
          },
          {
            "question": "Apa perbedaan paket FREE, Basic, dan PRO Unlimited (serta Trial 3/7 Hari)?",
            "answer": "FREE memberi akses ke materi gratis, kuis dasar, leaderboard, dan fitur beli satuan. Paket Basic (Rp 75.000/bulan) membuka lampiran unduhan, Wiki SOP, Diskusi Mentor, Catatan/Favorit, dan hingga 6 modul awal per materi (lanjutan via Poin atau satuan). Paket PRO Unlimited (Rp 150.000/bulan) membuka 100% seluruh modul tanpa batas, Review Tugas 1-on-1, Sertifikat HD, dan 2× XP Rumi. Baik Basic maupun PRO tersedia opsi Trial 3 & 7 Hari di dalam portal."
          },
          {
            "question": "Apa bedanya XP Rumi dengan Poin Bintang (★) di dalam sistem?",
            "answer": "XP Rumi menumbuhkan maskot belajar Rumi melalui 5 tahap evolusi (Lv.1 Baby Rumi hingga Lv.5 Superior Rumi) dari login harian, streak 7 hari, selesai bab, kuis, catatan, dan ulasan. Sedangkan Poin Bintang (★) adalah poin reward dari penyelesaian materi yang masuk Leaderboard dan bisa ditukar hadiah di Rewards Shop atau digunakan untuk membuka bab lanjutan satuan."
          },
          {
            "question": "Bagaimana cara kerja Kode Akses Folder vs Kode Voucher PRO?",
            "answer": "Kode Akses Folder digunakan di Beranda (Redeem Kode) untuk membuka folder kelas atau batch tertentu ke daftar belajar kamu. Sedangkan Kode Voucher PRO ditukarkan pada halaman Paket/Upgrade untuk mengaktifkan akses Basic atau PRO berjangka waktu sesuai durasi voucher."
          },
          {
            "question": "Apakah materi ini cocok untuk pemula dan apakah ada materi Paid Ads?",
            "answer": "Sangat cocok untuk pemula dari nol dan 100% full organik tanpa paid ads! Kurikulum dirancang berjenjang dari Fundamental (10 modul), Intermediate Content System & Workflow (7 modul), hingga Masterclass Optimization & Maintenance (5 modul)."
          },
          {
            "question": "Bagaimana cara mendapatkan Sertifikat Kelulusan HD & menukar Rewards?",
            "answer": "Sertifikat Kelulusan HD (PNG/PDF) otomatis tersedia ketika kamu menyelesaikan 100% bab wajib pada kelas yang kamu ikuti di akun dengan entitlement Sertifikat (PRO). Sementara Poin Bintang dapat langsung ditukar kapan saja di menu Rewards Shop menjadi Template, E-Book, Voucher Diskon, 1-on-1 Mentoring, maupun Merchandise."
          },
          {
            "question": "Apakah saya bisa mencatat materi dan bertanya langsung ke Mentor di setiap bab?",
            "answer": "Bisa! Di dalam Ruang Kelas Interaktif tersedia panel Catatan Pribadi per bab, tombol Favorit, tab Lampiran/Wiki SOP, serta tab Diskusi & Q&A untuk berkonsultasi langsung dengan Mentor."
          },
          {
            "question": "Bagaimana metode pembayaran dan konfirmasi aktivasi paket?",
            "answer": "Kamu bisa membayar lewat QRIS instan maupun transfer bank (BCA/Mandiri). Bukti pembayaran dapat langsung diunggah di modal checkout atau dikonfirmasi lewat WhatsApp untuk aktivasi cepat akunmu."
          }
        ]
      }
    },
    {
      "id": "block-cta",
      "type": "cta",
      "data": {
        "heading": "Siap Mulai Belajar Social Media Organik?",
        "body": "Buat akun gratis dalam 30 detik, pelajari materi utama secara langsung, kumpulkan Rumi XP & Poin Bintang, dan bangun portofolio Social Media Specialist kamu hari ini.",
        "buttonLabel": "Daftar Akun Gratis",
        "secondaryButtonLabel": "Masuk & Redeem Kode"
      }
    }
  ]$blocks$::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  header_image_url = COALESCE(NULLIF(public.landing_pages.header_image_url, ''), EXCLUDED.header_image_url),
  header_config = EXCLUDED.header_config,
  payment_config = CASE
    WHEN public.landing_pages.payment_config IS NOT NULL
      AND public.landing_pages.payment_config <> '{}'::jsonb
    THEN public.landing_pages.payment_config
    ELSE EXCLUDED.payment_config
  END,
  footer_config = EXCLUDED.footer_config,
  theme = EXCLUDED.theme,
  status = 'published',
  blocks = EXCLUDED.blocks,
  updated_at = now();


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 025_egress_ultra_optimization.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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
