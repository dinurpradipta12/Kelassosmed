-- =============================================================================
-- RUANG SOSMED 2.0 LMS — CLEANUP GHOST UNFOLDERED PARTIAL-TITLE COURSES
-- File: supabase/migrations/019_cleanup_ghost_partial_courses.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

DELETE FROM public.contents
WHERE COALESCE(lower(type::text), '') <> 'folder'
  AND COALESCE(
    NULLIF(trim(folder_name), ''),
    NULLIF(trim(settings_json->'explorer_meta'->>'folderName'), '')
  ) IS NULL
  AND lower(trim(title)) IN (
    'mini bootcamp s',
    'mini bootcamp social media specialist b',
    'mini bootcamp social media specialist ba',
    'mini bootcamp social media specialist bat',
    'mini bootcamp social media specialist batc',
    'mini bootcamp social media specialist batch'
  );
