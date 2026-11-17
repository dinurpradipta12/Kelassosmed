-- =============================================================================
-- RUANG SOSMED 2.0 LMS — URUTAN MATERI DI FOLDER (1 -> 2 -> 3) & PEMBERSIHAN
-- File: supabase/migrations/009_folder_order_and_cleanup.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

-- 1. Tambah kolom sort_order (opsional) & index pengurutan kronologis per folder
ALTER TABLE IF EXISTS public.contents
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_contents_folder_created_at
  ON public.contents(folder_name, created_at ASC);

-- 2. Hapus sisa draft potongan judul yang mungkin masih tersisa di tabel contents
DELETE FROM public.contents
WHERE type <> 'folder'
  AND title LIKE 'Mini Bootcamp S%'
  AND title NOT IN (
    'Mini Bootcamp Batch 1',
    'Mini Bootcamp Social Media Specialist',
    'Mini Bootcamp Social Media Specialist Batch 2'
  );

-- 3. Pastikan "Mini Bootcamp Social Media Specialist Batch 2" berada di folder yang benar
UPDATE public.contents
SET
  folder_name = 'Mini Bootcamp Social Media Specialist',
  settings_json = jsonb_set(
    COALESCE(settings_json, '{}'::jsonb),
    '{explorer_meta,folderName}',
    '"Mini Bootcamp Social Media Specialist"'::jsonb,
    true
  )
WHERE title = 'Mini Bootcamp Social Media Specialist Batch 2';

-- 4. Pastikan urutan created_at: Batch 1 tampil lebih dulu daripada Batch 2
UPDATE public.contents
SET created_at = LEAST(
  created_at,
  COALESCE(
    (SELECT created_at - interval '1 minute'
     FROM public.contents
     WHERE title = 'Mini Bootcamp Social Media Specialist Batch 2'
     LIMIT 1),
    created_at
  )
)
WHERE title = 'Mini Bootcamp Batch 1';
