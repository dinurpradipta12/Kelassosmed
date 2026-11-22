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
