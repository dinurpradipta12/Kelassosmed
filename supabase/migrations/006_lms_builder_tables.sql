-- ============================================================================
-- 006_lms_builder_tables.sql
-- Schema & RLS untuk LMS & Landing Page Builder (Product Tutorial & Recorded Class)
-- Tabel: mentor, lms_courses, lms_class_results, events, public_content_revisions
-- Jalankan di Supabase SQL Editor (aman dijalankan berulang / idempotent).
-- ============================================================================

-- 1. Tabel Mentor
create table if not exists public.mentor (
  id text primary key,
  name text not null,
  role text not null default 'Mentor',
  bio text not null default '',
  avatar_url text,
  instagram text,
  linkedin text,
  tiktok text,
  website text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 2. Tabel LMS Courses (Product Tutorial & Recorded Class)
create table if not exists public.lms_courses (
  id text primary key,
  short_code text unique not null,
  space_type text not null default 'product_tutorial'
    check (space_type in ('product_tutorial', 'recorded_class')),
  title text not null,
  description text not null default '',
  categories jsonb not null default '[]'::jsonb,
  cover_url text,
  cover_position text not null default '50% 50%',
  cover_zoom numeric not null default 1,
  cover_text_mode text not null default 'light'
    check (cover_text_mode in ('light', 'dark')),
  published boolean not null default false,
  overall_feedback_enabled boolean not null default false,
  post_test_mode text not null default 'tab'
    check (post_test_mode in ('tab', 'per_material')),
  materials jsonb not null default '[]'::jsonb,
  assets jsonb not null default '[]'::jsonb,
  post_test jsonb not null default '{"enabled":false,"passingScore":70,"maxAttempts":3,"questions":[]}'::jsonb,
  mentor_id text references public.mentor(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_lms_courses_short_code on public.lms_courses (short_code);
create index if not exists idx_lms_courses_space_type on public.lms_courses (space_type);
create index if not exists idx_lms_courses_published on public.lms_courses (published);

-- 3. Tabel Hasil & Review Peserta (Recorded Class Post-Test)
create table if not exists public.lms_class_results (
  id text primary key,
  course_id text not null references public.lms_courses(id) on delete cascade,
  participant_name text not null,
  participant_email text not null,
  score integer not null default 0,
  passed boolean not null default false,
  attempt integer not null default 1,
  feedback text,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_lms_class_results_course on public.lms_class_results (course_id);

-- 4. Tabel Events (Analytics Kunjungan Publik)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  course_id text not null references public.lms_courses(id) on delete cascade,
  device_type text not null default 'desktop',
  source text not null default 'direct',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_events_course_id on public.events (course_id);

-- 5. Tabel Public Content Revisions (Trigger Realtime Refresh Aman)
create table if not exists public.public_content_revisions (
  course_id text primary key references public.lms_courses(id) on delete cascade,
  revision_token text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.mentor enable row level security;
alter table public.lms_courses enable row level security;
alter table public.lms_class_results enable row level security;
alter table public.events enable row level security;
alter table public.public_content_revisions enable row level security;

-- Helper check: Admin terautentikasi (profiles.role in ('admin','mentor') atau auth.role() = 'authenticated')
-- Publik hanya bisa SELECT kursus yang published = true
drop policy if exists "lms_courses_public_select_published" on public.lms_courses;
create policy "lms_courses_public_select_published"
  on public.lms_courses for select
  using (published = true or auth.role() = 'authenticated');

drop policy if exists "lms_courses_admin_insert" on public.lms_courses;
create policy "lms_courses_admin_insert"
  on public.lms_courses for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "lms_courses_admin_update" on public.lms_courses;
create policy "lms_courses_admin_update"
  on public.lms_courses for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "lms_courses_admin_delete" on public.lms_courses;
create policy "lms_courses_admin_delete"
  on public.lms_courses for delete
  using (auth.role() = 'authenticated');

-- Mentor: Publik bisa SELECT, hanya admin terautentikasi yang bisa INSERT/UPDATE/DELETE
drop policy if exists "mentor_public_select" on public.mentor;
create policy "mentor_public_select"
  on public.mentor for select
  using (true);

drop policy if exists "mentor_admin_write" on public.mentor;
create policy "mentor_admin_write"
  on public.mentor for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Events: Publik bisa INSERT kunjungan, hanya admin terautentikasi yang bisa SELECT
drop policy if exists "events_public_insert" on public.events;
create policy "events_public_insert"
  on public.events for insert
  with check (true);

drop policy if exists "events_admin_select" on public.events;
create policy "events_admin_select"
  on public.events for select
  using (auth.role() = 'authenticated');

-- Class Results: Publik bisa INSERT hasil post-test, admin terautentikasi bisa SELECT/DELETE
drop policy if exists "class_results_public_insert" on public.lms_class_results;
create policy "class_results_public_insert"
  on public.lms_class_results for insert
  with check (true);

drop policy if exists "class_results_admin_select" on public.lms_class_results;
create policy "class_results_admin_select"
  on public.lms_class_results for select
  using (auth.role() = 'authenticated');

-- Public Content Revisions: Publik bisa SELECT untuk realtime sync, admin bisa INSERT/UPDATE
drop policy if exists "revisions_public_select" on public.public_content_revisions;
create policy "revisions_public_select"
  on public.public_content_revisions for select
  using (true);

drop policy if exists "revisions_admin_write" on public.public_content_revisions;
create policy "revisions_admin_write"
  on public.public_content_revisions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Aktifkan Realtime pada public_content_revisions
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'public_content_revisions'
  ) then
    alter publication supabase_realtime add table public.public_content_revisions;
  end if;
end $$;
