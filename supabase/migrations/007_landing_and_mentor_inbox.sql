-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRASI TERBARU (LANDING BUILDER & INBOX MENTOR)
-- File: supabase/migrations/007_landing_and_mentor_inbox.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABEL LANDING PAGE BUILDER (`public.landing_pages`)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE DEFAULT 'home',
  title text NOT NULL DEFAULT 'Ruang Sosmed 2.0 — Official Platform',
  description text NOT NULL DEFAULT 'Kelas fundamental untuk belajar strategi social media organik, konten, dan roadmap menjadi Social Media Specialist profesional.',
  header_image_url text NOT NULL DEFAULT '',
  header_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  footer_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme text NOT NULL DEFAULT 'violet',
  status text NOT NULL DEFAULT 'published',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Upgrade aman jika tabel landing_pages sudah dibuat versi sebelumnya
ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS header_image_url text NOT NULL DEFAULT '';

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS header_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS payment_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS footer_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Normalisasi constraint status & theme
ALTER TABLE public.landing_pages
  DROP CONSTRAINT IF EXISTS landing_pages_status_check;

ALTER TABLE public.landing_pages
  ADD CONSTRAINT landing_pages_status_check
  CHECK (lower(status) IN ('draft', 'published', 'archived'));

ALTER TABLE public.landing_pages
  DROP CONSTRAINT IF EXISTS landing_pages_theme_check;

ALTER TABLE public.landing_pages
  ADD CONSTRAINT landing_pages_theme_check
  CHECK (length(trim(theme)) > 0);

-- Pastikan constraint/unique index pada slug ada untuk upsert({ onConflict: 'slug' })
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.landing_pages'::regclass
      AND conname = 'landing_pages_slug_key'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS landing_pages_slug_unique_idx
      ON public.landing_pages(slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON public.landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON public.landing_pages(status);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published landing pages" ON public.landing_pages;
CREATE POLICY "Public can view published landing pages"
  ON public.landing_pages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage landing pages" ON public.landing_pages;
DROP POLICY IF EXISTS "All studio users can manage landing pages" ON public.landing_pages;
CREATE POLICY "All studio users can manage landing pages"
  ON public.landing_pages FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_landing_page_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_landing_pages_updated_at ON public.landing_pages;
CREATE TRIGGER trg_landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_landing_page_updated_at();


-- -----------------------------------------------------------------------------
-- 2. TABEL INBOX PESAN & DISKUSI MENTOR (`public.mentor_inbox_threads`)
--    Menampung pesan dari tombol "Hubungi Mentor", "Diskusi Bab", & "Inbox Admin"
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentor_inbox_threads (
  id text PRIMARY KEY,
  chapter_badge text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  excerpt text NOT NULL DEFAULT '',
  replies_count integer NOT NULL DEFAULT 1,
  views_count integer NOT NULL DEFAULT 1,
  last_reply_label text NOT NULL DEFAULT 'Baru saja',
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  replies jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_inbox_threads_chapter
  ON public.mentor_inbox_threads(chapter_badge);

CREATE INDEX IF NOT EXISTS idx_mentor_inbox_threads_updated_at
  ON public.mentor_inbox_threads(updated_at DESC);

ALTER TABLE public.mentor_inbox_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentor_inbox_threads_select_all" ON public.mentor_inbox_threads;
CREATE POLICY "mentor_inbox_threads_select_all"
  ON public.mentor_inbox_threads FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "mentor_inbox_threads_insert_all" ON public.mentor_inbox_threads;
CREATE POLICY "mentor_inbox_threads_insert_all"
  ON public.mentor_inbox_threads FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "mentor_inbox_threads_update_all" ON public.mentor_inbox_threads;
CREATE POLICY "mentor_inbox_threads_update_all"
  ON public.mentor_inbox_threads FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_mentor_inbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mentor_inbox_threads_updated_at ON public.mentor_inbox_threads;
CREATE TRIGGER trg_mentor_inbox_threads_updated_at
  BEFORE UPDATE ON public.mentor_inbox_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_mentor_inbox_updated_at();


-- -----------------------------------------------------------------------------
-- 3. TABEL LAPORAN KENDALA MATERI (`public.mentor_reported_issues`)
--    Menampung laporan kendala dari siswa ke tab "Laporan Kendala" Inbox Admin
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentor_reported_issues (
  id text PRIMARY KEY,
  chapter text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  reporter text NOT NULL DEFAULT 'Learner',
  reported_at text NOT NULL DEFAULT 'Baru saja',
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
  category text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_reported_issues_status
  ON public.mentor_reported_issues(status);

CREATE INDEX IF NOT EXISTS idx_mentor_reported_issues_created_at
  ON public.mentor_reported_issues(created_at DESC);

ALTER TABLE public.mentor_reported_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentor_reported_issues_select_all" ON public.mentor_reported_issues;
CREATE POLICY "mentor_reported_issues_select_all"
  ON public.mentor_reported_issues FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "mentor_reported_issues_insert_all" ON public.mentor_reported_issues;
CREATE POLICY "mentor_reported_issues_insert_all"
  ON public.mentor_reported_issues FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "mentor_reported_issues_update_all" ON public.mentor_reported_issues;
CREATE POLICY "mentor_reported_issues_update_all"
  ON public.mentor_reported_issues FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_mentor_reported_issues_updated_at ON public.mentor_reported_issues;
CREATE TRIGGER trg_mentor_reported_issues_updated_at
  BEFORE UPDATE ON public.mentor_reported_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_mentor_inbox_updated_at();


-- -----------------------------------------------------------------------------
-- 4. TABEL PENGATURAN LEARNER PRO, MULTI-PAKET & QRIS (`public.learner_pro_settings`)
--    Menyimpan harga, multi-paket, benefit per paket, banner siswa, & QRIS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learner_pro_settings (
  id text PRIMARY KEY DEFAULT 'default',
  price_label text NOT NULL DEFAULT 'Rp 149.000',
  period_label text NOT NULL DEFAULT '/ month (or $14/mo)',
  qr_code_url text NOT NULL DEFAULT '',
  merchant_name text NOT NULL DEFAULT 'Ruang Sosmed 2.0',
  bank_name text NOT NULL DEFAULT 'BCA / Mandiri',
  account_number text NOT NULL DEFAULT '123-456-7890',
  account_holder text NOT NULL DEFAULT 'PT Ruang Sosmed Indonesia',
  whatsapp_number text NOT NULL DEFAULT '6281234567890',
  packages jsonb NOT NULL DEFAULT '[]'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learner_pro_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learner_pro_settings_select_all" ON public.learner_pro_settings;
CREATE POLICY "learner_pro_settings_select_all"
  ON public.learner_pro_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "learner_pro_settings_insert_all" ON public.learner_pro_settings;
CREATE POLICY "learner_pro_settings_insert_all"
  ON public.learner_pro_settings FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "learner_pro_settings_update_all" ON public.learner_pro_settings;
CREATE POLICY "learner_pro_settings_update_all"
  ON public.learner_pro_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_learner_pro_settings_updated_at ON public.learner_pro_settings;
CREATE TRIGGER trg_learner_pro_settings_updated_at
  BEFORE UPDATE ON public.learner_pro_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_mentor_inbox_updated_at();


-- -----------------------------------------------------------------------------
-- 5. SINKRONISASI AVATAR LINTAS AKUN (`public.profiles` & `public.user_profiles`)
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS header_url text;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS header_url text;

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
  ON public.user_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email_lower
  ON public.user_profiles(lower(email));

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON public.profiles(lower(email));

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_public_all" ON public.user_profiles;
CREATE POLICY "user_profiles_public_all"
  ON public.user_profiles FOR ALL
  USING (true)
  WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 6. FOLDER SERIES, KODE AKSES OTOMATIS & ASSIGNMENTS (`public.contents`)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'content_type'
  ) THEN
    ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'folder';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.contents
  ADD COLUMN IF NOT EXISTS folder_name text,
  ADD COLUMN IF NOT EXISTS folder_id text,
  ADD COLUMN IF NOT EXISTS access_code text,
  ADD COLUMN IF NOT EXISTS cohort text;

CREATE INDEX IF NOT EXISTS idx_contents_folder_name
  ON public.contents(folder_name);

CREATE INDEX IF NOT EXISTS idx_contents_cohort
  ON public.contents(cohort);

-- Sinkronkan metadata folder & cohort lama dari settings_json -> kolom utama (idempotent)
UPDATE public.contents
SET
  folder_name = COALESCE(folder_name, settings_json->'explorer_meta'->>'folderName'),
  access_code = COALESCE(access_code, settings_json->'explorer_meta'->>'accessCode'),
  cohort      = COALESCE(cohort, settings_json->'explorer_meta'->>'cohort')
WHERE settings_json ? 'explorer_meta';

ALTER TABLE IF EXISTS public.contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contents_select_published_or_assigned_or_staff" ON public.contents;
DROP POLICY IF EXISTS "contents_public_select_all" ON public.contents;
CREATE POLICY "contents_public_select_all"
  ON public.contents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "contents_crud_mentor_admin" ON public.contents;
DROP POLICY IF EXISTS "contents_public_write_all" ON public.contents;
CREATE POLICY "contents_public_write_all"
  ON public.contents FOR ALL
  USING (true)
  WITH CHECK (true);
