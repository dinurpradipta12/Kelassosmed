-- =============================================================================
-- RUANG SOSMED 2.0 LMS — KOSONGKAN ULASAN DUMMY & SINKRONISASI PERUBAHAN
-- File: supabase/migrations/008_clear_dummy_reviews.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

-- 1. Kosongkan seluruh data ulasan dummy / testing sebelum peluncuran resmi
TRUNCATE TABLE IF EXISTS public.lesson_reviews;

-- 2. Pastikan RLS policy pada public.lesson_reviews aktif & siap menerima ulasan siswa baru
ALTER TABLE IF EXISTS public.lesson_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_reviews_select_all" ON public.lesson_reviews;
CREATE POLICY "lesson_reviews_select_all"
  ON public.lesson_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "lesson_reviews_insert_all" ON public.lesson_reviews;
CREATE POLICY "lesson_reviews_insert_all"
  ON public.lesson_reviews FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "lesson_reviews_delete_all" ON public.lesson_reviews;
CREATE POLICY "lesson_reviews_delete_all"
  ON public.lesson_reviews FOR DELETE
  USING (true);

-- 3. (Opsional) Jika ingin membersihkan diskusi & laporan kendala testing juga,
--    hapus tanda komentar "--" pada dua baris di bawah ini:
-- TRUNCATE TABLE IF EXISTS public.mentor_inbox_threads;
-- TRUNCATE TABLE IF EXISTS public.mentor_reported_issues;
