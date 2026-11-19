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
