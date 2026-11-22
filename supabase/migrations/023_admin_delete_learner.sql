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
