-- =============================================================================
-- RUANG SOSMED 2.0 LMS — TRUNCATE / BERSIHKAN SEMUA DATA DUMMY (ZERO DATA)
-- Jalankan script ini di Supabase SQL Editor jika kamu ingin mengosongkan
-- seluruh materi, kuis, tugas, progres, dan review agar siap diisi dari awal.
-- Struktur tabel, fungsi RPC, RLS, dan storage buckets TETAP AMAN.
-- =============================================================================

-- 1. Bersihkan data aktivitas siswa & penilaian (relational children first)
truncate table public.submissions cascade;
truncate table public.enrollments cascade;
truncate table public.discussions cascade;
truncate table public.content_issues cascade;
truncate table public.content_versions cascade;

-- 2. Bersihkan data kurikulum, bab, dan kuis
truncate table public.quiz_questions cascade;
truncate table public.learning_path_items cascade;
truncate table public.course_chapters cascade;
truncate table public.course_sections cascade;
truncate table public.contents cascade;
truncate table public.projects cascade;

-- 3. Bersihkan data integrasi rs-learning-26 (catalog, notes, reviews, progress)
truncate table public.lesson_reviews cascade;
truncate table public.lesson_notes cascade;
truncate table public.lesson_progress cascade;
truncate table public.lesson_assets cascade;
truncate table public.lessons cascade;
truncate table public.courses cascade;
truncate table public.shared_assets cascade;
truncate table public.user_video_unlocks cascade;
truncate table public.user_asset_unlocks cascade;
truncate table public.forum_replies cascade;
truncate table public.forum_threads cascade;

-- (Opsional: Bersihkan profil user demo non-auth jika ada)
truncate table public.user_subscriptions cascade;
truncate table public.user_profiles cascade;

-- Selesai: Database sekarang 100% bersih tanpa data dummy!
