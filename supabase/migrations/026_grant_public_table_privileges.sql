-- =============================================================================
-- RUANG SOSMED 2.0 LMS — EXPLICIT PUBLIC SCHEMA TABLE & SEQUENCE PRIVILEGES
-- Migration: 026_grant_public_table_privileges.sql
-- Supabase (2026+) projects do not auto-grant `public` table permissions to
-- `authenticated` / `anon`. RLS still governs row access per table policy.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

DO $$
DECLARE
  tbl text;
  anon_read_tables text[] := ARRAY[
    'landing_pages',
    'contents',
    'lms_courses',
    'public_content_revisions',
    'courses',
    'lessons',
    'lesson_assets',
    'shared_assets',
    'learning_hub_content'
  ];
BEGIN
  FOREACH tbl IN ARRAY anon_read_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', tbl);
    END IF;
  END LOOP;

  IF to_regclass('public.events') IS NOT NULL THEN
    GRANT INSERT ON TABLE public.events TO anon;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
