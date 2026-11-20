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

    DROP POLICY IF EXISTS "mentor_inbox_threads_delete_staff" ON public.mentor_inbox_threads;
    CREATE POLICY "mentor_inbox_threads_delete_staff"
      ON public.mentor_inbox_threads FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role::text IN ('admin', 'mentor')
        )
      );
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
