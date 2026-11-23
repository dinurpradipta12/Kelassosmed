-- =============================================================================
-- RUANG SOSMED 2.0 LMS — SECURITY HARDENING: ANON, STORAGE, & PROOF CLEANUP
-- Migration: 027_security_hardening_anon_and_storage.sql
-- 1. Membatasi akses `anon` pada `public.contents` hanya untuk config maintenance
-- 2. Mencabut akses `anon` pada tabel legacy (`courses`, `lessons`, `lesson_assets`,
--    `shared_assets`, `learning_hub_content`)
-- 3. Membatasi `get_workspace_sync_watermark()` hanya untuk role `authenticated`
-- 4. Menjaga helper RLS `is_admin*()` tetap callable agar policy landing page
--    publik berjalan normal tanpa error 42501
-- 5. Mengunci listing `storage.objects` untuk `anon` & membatasi pembacaan
--    `ruang-sosmed-attachments` hanya ke pemilik folder / Admin / Mentor
-- 6. Memastikan trigger auto-clear `proof_url` aktif & membersihkan duplikat
--    baris konfigurasi `__SYSTEM_%` di `public.contents`
-- =============================================================================

-- 1. Kunci `public.contents` untuk pengunjung anonim (hanya maintenance config)
DROP POLICY IF EXISTS "contents_select_public_catalog" ON public.contents;
DROP POLICY IF EXISTS "contents_select_anon_maintenance_only" ON public.contents;
DROP POLICY IF EXISTS "contents_select_authenticated_catalog" ON public.contents;

CREATE POLICY "contents_select_anon_maintenance_only"
  ON public.contents FOR SELECT TO anon
  USING (title = '__SYSTEM_MAINTENANCE_CONFIG__');

CREATE POLICY "contents_select_authenticated_catalog"
  ON public.contents FOR SELECT TO authenticated
  USING (
    (status = 'published'::public.content_status AND title NOT LIKE '__SYSTEM_%')
    OR title = '__SYSTEM_MAINTENANCE_CONFIG__'
  );

-- 2. Cabut hak akses tabel legacy dari `anon`
DO $$
DECLARE
  tbl text;
  legacy_tables text[] := ARRAY[
    'courses',
    'lessons',
    'lesson_assets',
    'shared_assets',
    'learning_hub_content'
  ];
BEGIN
  FOREACH tbl IN ARRAY legacy_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', tbl);
    END IF;
  END LOOP;
END $$;

-- 3. Batasi RPC watermark hanya untuk user login (`authenticated`)
REVOKE ALL ON FUNCTION public.get_workspace_sync_watermark() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_sync_watermark() TO authenticated;

-- 4. Pastikan helper RLS publik dapat dievaluasi saat policy `landing_pages` & `lms_courses` dicek
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_mentor() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_mentor_or_admin() TO anon, authenticated;

-- 5. Kunci listing `storage.objects` untuk `anon` & lindungi bucket bukti transfer
DROP POLICY IF EXISTS "storage_public_read_assets" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_read_media" ON storage.objects;
DROP POLICY IF EXISTS "storage_attachments_owner_or_staff" ON storage.objects;

CREATE POLICY "storage_authenticated_read_media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN (
      'ruang-sosmed-media',
      'ruang-sosmed-avatars',
      'lesson-assets',
      'profile-avatars'
    )
  );

CREATE POLICY "storage_attachments_owner_or_staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ruang-sosmed-attachments'
    AND (
      public.is_admin_or_mentor()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- 6. Pastikan trigger hapus otomatis referensi `proof_url` aktif pada `pro_upgrade_requests`
CREATE OR REPLACE FUNCTION public.clear_proof_on_request_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') THEN
    IF OLD.proof_url IS NOT NULL OR NEW.proof_url IS NOT NULL THEN
      NEW.proof_deleted_at := COALESCE(NEW.proof_deleted_at, now());
    END IF;
    NEW.proof_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.pro_upgrade_requests') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_clear_proof_on_request_resolution ON public.pro_upgrade_requests;
    CREATE TRIGGER trg_clear_proof_on_request_resolution
      BEFORE UPDATE ON public.pro_upgrade_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.clear_proof_on_request_resolution();

    UPDATE public.pro_upgrade_requests
    SET
      proof_url = NULL,
      proof_deleted_at = COALESCE(proof_deleted_at, now())
    WHERE status IN ('approved', 'rejected')
      AND proof_url IS NOT NULL;
  END IF;
END $$;

-- 7. Bersihkan duplikat baris sistem `__SYSTEM_%` di `public.contents`
WITH ranked_system_rows AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY title
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.contents
  WHERE left(title, 9) = '__SYSTEM_'
)
DELETE FROM public.contents c
USING ranked_system_rows r
WHERE c.id = r.id
  AND r.rn > 1;

NOTIFY pgrst, 'reload schema';
