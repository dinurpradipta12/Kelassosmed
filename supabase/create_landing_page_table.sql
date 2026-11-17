-- =============================================================================
-- RUANG SOSMED 2.0 LMS — TABEL LANDING PAGE & VISUAL BUILDER
-- File: supabase/create_landing_page_table.sql
-- Idempotent (aman dijalankan ulang untuk instalasi baru maupun upgrade tabel lama)
-- =============================================================================

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

-- Normalisasi constraint status agar mendukung uppercase/lowercase ('draft', 'published', 'archived')
ALTER TABLE public.landing_pages
  DROP CONSTRAINT IF EXISTS landing_pages_status_check;

ALTER TABLE public.landing_pages
  ADD CONSTRAINT landing_pages_status_check
  CHECK (lower(status) IN ('draft', 'published', 'archived'));

-- Normalisasi constraint theme agar tidak gagal saat kustomisasi tema
ALTER TABLE public.landing_pages
  DROP CONSTRAINT IF EXISTS landing_pages_theme_check;

ALTER TABLE public.landing_pages
  ADD CONSTRAINT landing_pages_theme_check
  CHECK (length(trim(theme)) > 0);

-- Pastikan constraint/unique index pada slug ada untuk kebutuhan upsert({ onConflict: 'slug' })
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.landing_pages'::regclass
      AND conname = 'landing_pages_slug_key'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS landing_pages_slug_unique_idx ON public.landing_pages(slug);
  END IF;
END $$;

-- Indexing
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON public.landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON public.landing_pages(status);

-- RLS (Row Level Security)
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Izinkan publik melihat landing page
DROP POLICY IF EXISTS "Public can view published landing pages" ON public.landing_pages;
CREATE POLICY "Public can view published landing pages"
  ON public.landing_pages FOR SELECT
  USING (true);

-- Izinkan authenticated user / admin mengelola landing page
DROP POLICY IF EXISTS "Authenticated users can manage landing pages" ON public.landing_pages;
CREATE POLICY "Authenticated users can manage landing pages"
  ON public.landing_pages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Helper trigger auto updated_at
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
