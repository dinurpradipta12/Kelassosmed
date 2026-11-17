-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MASTER SUPABASE SQL SETUP (ALL-IN-ONE COPY & PASTE)
-- Mencakup:
--   1. Core LMS Schema (profiles + Learner PRO tier, projects, contents,
--      course_sections, course_chapters, learning_path_items, quiz_questions,
--      content_versions, enrollments, submissions, discussions, content_issues)
--   2. Integrasi "rs-learning-26" (courses, lessons, lesson_assets,
--      lesson_reviews, lesson_progress, lesson_notes, shared_assets,
--      user_profiles, user_subscriptions, forum_threads, forum_replies)
--   3. Triggers, Transactional RPC Functions & Relational Views
--   4. Row Level Security (RLS) Policies & Supabase Storage Buckets
--   5. Seed Data Awal (Ruang Sosmed 2.0)
-- =============================================================================

-- Enable required PostgreSQL extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =============================================================================
-- BAGIAN 1: ENUMERATED TYPES
-- =============================================================================

do $$ begin
  create type public.user_role as enum ('admin', 'mentor', 'learner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_type as enum (
    'course', 'page', 'quiz', 'assignment', 'learning_path', 'wiki'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_urgency as enum ('urgent', 'not_urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quiz_question_type as enum (
    'multiple_choice', 'fill_blank', 'hotspot', 'open_ended', 'categorization'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.enrollment_status as enum (
    'not_started', 'in_progress', 'passed', 'failed', 'overdue'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.grading_status as enum (
    'pending_review', 'passed', 'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_status as enum ('open', 'resolved');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- BAGIAN 2: TABEL UTAMA RUANG SOSMED 2.0 (ADMIN STUDIO & LEARNER PORTAL)
-- =============================================================================

-- 1. profiles (terhubung ke auth.users + status Learner PRO)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  avatar_url text,
  role public.user_role not null default 'learner',
  job_title text not null default 'Social Media Specialist',
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro')),
  total_points integer not null default 0 check (total_points >= 0),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists subscription_tier text not null default 'free'
  check (subscription_tier in ('free', 'pro'));

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_total_points on public.profiles(total_points desc);

-- 2. projects (Cohort / Folder Workspace)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color_hex text not null default '#4F39F6',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_created_by on public.projects(created_by);

-- 3. contents (Katalog Course, Page, Quiz, Assignment, Learning Path, Wiki)
create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  type public.content_type not null default 'course',
  title text not null,
  description text not null default '',
  thumbnail_url text,
  category_tags text[] not null default '{}',
  urgency public.content_urgency not null default 'not_urgent',
  estimated_minutes integer not null default 60 check (estimated_minutes >= 0),
  points_reward integer not null default 100 check (points_reward >= 0),
  is_pro_only boolean not null default false,
  status public.content_status not null default 'draft',
  settings_json jsonb not null default '{
    "pass_mark": 80,
    "pass_unit": "percent",
    "shuffle_questions": true,
    "expanded_question": true,
    "skip_and_attempt_later": true,
    "adaptive_question_bank": false,
    "max_attempts": 3,
    "timer_seconds": 3600,
    "show_correct_answers": true
  }'::jsonb,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contents
  add column if not exists is_pro_only boolean not null default false;

create index if not exists idx_contents_project_id on public.contents(project_id);
create index if not exists idx_contents_type on public.contents(type);
create index if not exists idx_contents_status on public.contents(status);
create index if not exists idx_contents_author_id on public.contents(author_id);

-- 4A. course_sections
create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  section_title text not null,
  order_index integer not null default 0,
  is_pro_only boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_sections_content_order
  on public.course_sections(content_id, order_index asc);

-- 4B. course_chapters
create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  section_id uuid references public.course_sections(id) on delete cascade,
  section_title text not null,
  chapter_title text not null,
  order_index integer not null default 0,
  body_blocks jsonb not null default '[]'::jsonb,
  video_url text,
  estimated_minutes integer not null default 15,
  points integer not null default 10 check (points >= 0),
  is_pro_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_chapters_content_order
  on public.course_chapters(content_id, order_index asc);
create index if not exists idx_course_chapters_section_id
  on public.course_chapters(section_id);

-- 5. learning_path_items
create table if not exists public.learning_path_items (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null references public.contents(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete cascade,
  stage_name text not null default 'Stage 1: Social Media Foundations',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (learning_path_id, content_id)
);

create index if not exists idx_learning_path_items_path_order
  on public.learning_path_items(learning_path_id, order_index asc);

-- 6. quiz_questions
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.contents(id) on delete cascade,
  question_type public.quiz_question_type not null default 'multiple_choice',
  prompt_text text not null,
  media_url text,
  timer_seconds integer not null default 45 check (timer_seconds >= 0),
  points integer not null default 10 check (points >= 0),
  options_json jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_questions_quiz_order
  on public.quiz_questions(quiz_id, order_index asc);

-- 7. content_versions
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  version_number text not null default 'v1.0',
  snapshot_json jsonb not null default '{}'::jsonb,
  edited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_content_versions_content_created
  on public.content_versions(content_id, created_at desc);

-- 8. enrollments (Assignees & Progress Siswa)
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  status public.enrollment_status not null default 'not_started',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  completed_chapter_ids uuid[] not null default '{}',
  is_favorite boolean not null default false,
  due_date timestamptz,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, learner_id)
);

create index if not exists idx_enrollments_learner_id on public.enrollments(learner_id);
create index if not exists idx_enrollments_content_id on public.enrollments(content_id);
create index if not exists idx_enrollments_status on public.enrollments(status);

-- 9. submissions (Quiz & Assignment Attempts untuk Grading Center)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  answers_json jsonb not null default '[]'::jsonb,
  score_percent integer not null default 0 check (score_percent between 0 and 100),
  grading_status public.grading_status not null default 'pending_review',
  mentor_feedback text,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  graded_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_submissions_content_id on public.submissions(content_id);
create index if not exists idx_submissions_learner_id on public.submissions(learner_id);
create index if not exists idx_submissions_grading_status on public.submissions(grading_status);

-- 10A. discussions (Diskusi Bab Q&A Learner <-> Mentor)
create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  chapter_id uuid references public.course_chapters(id) on delete set null,
  parent_id uuid references public.discussions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body text not null,
  views_count integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_discussions_content_chapter
  on public.discussions(content_id, chapter_id, created_at desc);
create index if not exists idx_discussions_parent_id
  on public.discussions(parent_id);

-- 10B. content_issues (Laporan Kendala Materi dari Learner)
create table if not exists public.content_issues (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  chapter_id uuid references public.course_chapters(id) on delete set null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  status public.issue_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_content_issues_content_status
  on public.content_issues(content_id, status);

-- =============================================================================
-- BAGIAN 3: TABEL INTEGRASI "rs-learning-26" (LEARNING HUB, NOTES, REVIEWS & SUBS)
-- =============================================================================

create table if not exists public.courses (
  key text primary key,
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  level text not null default 'All Level',
  thumbnail_url text not null default '',
  lesson_count int not null default 0,
  sort_order int not null default 1,
  status text not null default 'open' check (status in ('open', 'coming_soon')),
  linked_content_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  lesson_key text primary key,
  course_key text not null default 'lms' references public.courses(key) on delete cascade,
  sort_order integer not null,
  title text not null,
  duration text not null,
  meta text not null,
  description text not null,
  video_url text not null,
  thumbnail_url text,
  coming_soon boolean not null default false,
  available_at text,
  unlock_event_id text,
  linked_chapter_id text,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists lessons_course_key_idx on public.lessons(course_key, sort_order);

create table if not exists public.lesson_assets (
  asset_key text primary key,
  lesson_key text not null references public.lessons(lesson_key) on delete cascade,
  sort_order integer not null default 1,
  title text not null,
  type text not null,
  note text not null default '',
  storage_path text,
  external_url text,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists lesson_assets_lesson_key_idx on public.lesson_assets(lesson_key, sort_order);

create table if not exists public.lesson_reviews (
  id uuid primary key default gen_random_uuid(),
  lesson_key text not null references public.lessons(lesson_key) on delete cascade,
  reviewer_name text not null,
  reviewer_username text,
  rating integer not null check (rating between 1 and 5),
  feedback text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists lesson_reviews_lesson_key_idx on public.lesson_reviews(lesson_key, created_at desc);

create table if not exists public.lesson_progress (
  session_username text not null,
  lesson_key text not null references public.lessons(lesson_key) on delete cascade,
  completed_at timestamptz not null default timezone('utc', now()),
  primary key (session_username, lesson_key)
);

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  lesson_key text not null references public.lessons(lesson_key) on delete cascade,
  course_key text not null default 'lms',
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (username, lesson_key)
);

create table if not exists public.shared_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'lainnya',
  url text not null,
  type text not null default 'link',
  coin_cost integer not null default 0,
  feature_claimable boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_hub_content (
  content_key text primary key,
  content_group text not null,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_profiles (
  username text primary key,
  name text not null,
  email text not null,
  job_title text not null default 'Social Media Specialist',
  birth_date date,
  show_birthday boolean default true,
  joined_at date not null default current_date,
  avatar_path text,
  perks jsonb not null default '{}'::jsonb,
  referral_perks jsonb not null default '{}'::jsonb,
  referral_perks_expires_at timestamptz,
  checkin_streak integer not null default 0,
  last_checkin date,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_subscriptions (
  username text primary key references public.user_profiles(username) on delete cascade,
  plan_tier text not null default 'PRO' check (plan_tier in ('Free', 'PRO')),
  status text not null default 'aktif',
  started_at date not null default current_date,
  due_at date not null default (current_date + 30),
  payment_method text not null default 'manual transfer',
  renewal_status text not null default 'siap diperpanjang',
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.forum_threads (
  id text primary key,
  author_username text not null,
  author_display_name text not null,
  category text not null default 'General',
  title text not null,
  body text not null,
  image_url text,
  view_count integer not null default 0,
  edited boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_replies (
  id text primary key,
  thread_id text not null references public.forum_threads(id) on delete cascade,
  author_username text not null,
  author_display_name text not null,
  body text not null,
  image_url text,
  upvotes integer not null default 0,
  parent_reply_id text,
  answered boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists forum_threads_created_at_idx on public.forum_threads(created_at desc);
create index if not exists forum_replies_thread_id_idx on public.forum_replies(thread_id, created_at asc);

create table if not exists public.user_video_unlocks (
  username text not null,
  lesson_key text not null references public.lessons(lesson_key) on delete cascade,
  unlock_method text not null default 'coin' check (unlock_method in ('coin', 'legacy')),
  unlocked_at timestamptz not null default now(),
  primary key (username, lesson_key)
);

create table if not exists public.user_asset_unlocks (
  username text not null,
  asset_id uuid not null references public.shared_assets(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (username, asset_id)
);

-- =============================================================================
-- BAGIAN 4: HELPER FUNCTIONS, TRIGGERS & RPC FUNCTIONS
-- =============================================================================

-- Cek apakah user yang login adalah Admin atau Mentor
create or replace function public.is_mentor_or_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and role in ('admin', 'mentor')
  );
$$;

-- Trigger update kolom updated_at otomatis
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contents_updated_at on public.contents;
create trigger trg_contents_updated_at
  before update on public.contents
  for each row execute function public.set_updated_at();

drop trigger if exists trg_course_chapters_updated_at on public.course_chapters;
create trigger trg_course_chapters_updated_at
  before update on public.course_chapters
  for each row execute function public.set_updated_at();

drop trigger if exists trg_enrollments_updated_at on public.enrollments;
create trigger trg_enrollments_updated_at
  before update on public.enrollments
  for each row execute function public.set_updated_at();

-- Trigger auto-create profile saat user baru mendaftar di Supabase Auth
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, email, avatar_url, role, job_title, subscription_tier, total_points
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'learner'),
    coalesce(new.raw_user_meta_data->>'job_title', 'Social Media Specialist'),
    coalesce(new.raw_user_meta_data->>'subscription_tier', 'free'),
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- RPC 1: Tandai Bab Selesai, Hitung Ulang Progress %, dan Tambah Poin Learner
create or replace function public.complete_chapter_and_award_points(
  p_content_id uuid,
  p_chapter_id uuid,
  p_learner_id uuid
)
returns public.enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enrollment public.enrollments;
  v_total_chapters integer;
  v_completed_count integer;
  v_chapter_points integer;
  v_new_progress integer;
begin
  if auth.uid() is not null
     and auth.uid() <> p_learner_id
     and not public.is_mentor_or_admin() then
    raise exception 'Unauthorized chapter completion update';
  end if;

  select coalesce(points, 10)
    into v_chapter_points
    from public.course_chapters
   where id = p_chapter_id;

  select count(*)
    into v_total_chapters
    from public.course_chapters
   where content_id = p_content_id;

  if v_total_chapters = 0 then
    v_total_chapters := 1;
  end if;

  insert into public.enrollments (content_id, learner_id, status, progress_percent, completed_chapter_ids)
  values (p_content_id, p_learner_id, 'in_progress', 0, array[]::uuid[])
  on conflict (content_id, learner_id) do nothing;

  select *
    into v_enrollment
    from public.enrollments
   where content_id = p_content_id
     and learner_id = p_learner_id
   for update;

  if not (p_chapter_id = any(v_enrollment.completed_chapter_ids)) then
    v_enrollment.completed_chapter_ids := array_append(v_enrollment.completed_chapter_ids, p_chapter_id);
    v_completed_count := coalesce(array_length(v_enrollment.completed_chapter_ids, 1), 0);
    v_new_progress := least(100, round((v_completed_count::numeric / v_total_chapters::numeric) * 100)::integer);

    update public.enrollments
       set completed_chapter_ids = v_enrollment.completed_chapter_ids,
           progress_percent = v_new_progress,
           status = case when v_new_progress >= 100 then 'passed'::public.enrollment_status else 'in_progress'::public.enrollment_status end,
           updated_at = now()
     where id = v_enrollment.id
     returning * into v_enrollment;

    update public.profiles
       set total_points = total_points + coalesce(v_chapter_points, 10)
     where id = p_learner_id;
  end if;

  return v_enrollment;
end;
$$;

-- RPC 2: Penilaian Tugas/Kuis oleh Mentor + Unlock Sertifikat & Poin
create or replace function public.grade_submission_and_update_enrollment(
  p_submission_id uuid,
  p_grading_status public.grading_status,
  p_score_percent integer,
  p_mentor_feedback text
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.submissions;
  v_points_reward integer;
begin
  if not public.is_mentor_or_admin() then
    raise exception 'Only mentors or admins can grade submissions';
  end if;

  update public.submissions
     set grading_status = p_grading_status,
         score_percent = greatest(0, least(100, p_score_percent)),
         mentor_feedback = p_mentor_feedback,
         graded_at = now(),
         graded_by = auth.uid()
   where id = p_submission_id
   returning * into v_sub;

  if not found then
    raise exception 'Submission % not found', p_submission_id;
  end if;

  if p_grading_status = 'passed' then
    select coalesce(points_reward, 100)
      into v_points_reward
      from public.contents
     where id = v_sub.content_id;

    update public.enrollments
       set status = 'passed',
           progress_percent = 100,
           updated_at = now()
     where content_id = v_sub.content_id
       and learner_id = v_sub.learner_id;

    update public.profiles
       set total_points = total_points + v_points_reward
     where id = v_sub.learner_id;
  elsif p_grading_status = 'failed' then
    update public.enrollments
       set status = 'failed',
           updated_at = now()
     where content_id = v_sub.content_id
       and learner_id = v_sub.learner_id;
  end if;

  return v_sub;
end;
$$;

-- RPC 3: Upsert Langganan Learner PRO (dari rs-learning-26)
create or replace function public.upsert_user_subscription(
  p_username text,
  p_status text,
  p_started_at date,
  p_due_at date,
  p_payment_method text,
  p_renewal_status text
)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  subscription_row public.user_subscriptions;
begin
  insert into public.user_subscriptions (
    username, status, started_at, due_at, payment_method, renewal_status, updated_at
  )
  values (
    lower(trim(p_username)),
    coalesce(nullif(trim(p_status), ''), 'aktif'),
    coalesce(p_started_at, current_date),
    coalesce(p_due_at, current_date + 30),
    coalesce(nullif(trim(p_payment_method), ''), 'manual transfer'),
    coalesce(nullif(trim(p_renewal_status), ''), 'siap diperpanjang'),
    timezone('utc', now())
  )
  on conflict (username) do update set
    status = excluded.status,
    started_at = excluded.started_at,
    due_at = excluded.due_at,
    payment_method = excluded.payment_method,
    renewal_status = excluded.renewal_status,
    updated_at = timezone('utc', now())
  returning * into subscription_row;

  return subscription_row;
end;
$$;

grant execute on function public.upsert_user_subscription(text, text, date, date, text, text) to anon, authenticated;

-- =============================================================================
-- BAGIAN 5: ROW LEVEL SECURITY (RLS) POLICIES (IDEMPOTENT)
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.contents enable row level security;
alter table public.course_sections enable row level security;
alter table public.course_chapters enable row level security;
alter table public.learning_path_items enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.content_versions enable row level security;
alter table public.enrollments enable row level security;
alter table public.submissions enable row level security;
alter table public.discussions enable row level security;
alter table public.content_issues enable row level security;

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_assets enable row level security;
alter table public.lesson_reviews enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.shared_assets enable row level security;
alter table public.learning_hub_content enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;
alter table public.user_video_unlocks enable row level security;
alter table public.user_asset_unlocks enable row level security;

-- Policies untuk profiles
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update to authenticated
  using (auth.uid() = id or public.is_mentor_or_admin())
  with check (auth.uid() = id or public.is_mentor_or_admin());

drop policy if exists "profiles_insert_own_or_admin" on public.profiles;
create policy "profiles_insert_own_or_admin"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id or public.is_mentor_or_admin());

drop policy if exists "profiles_delete_admin_only" on public.profiles;
create policy "profiles_delete_admin_only"
  on public.profiles for delete to authenticated
  using (public.is_mentor_or_admin());

-- Policies untuk projects
drop policy if exists "projects_select_all" on public.projects;
create policy "projects_select_all"
  on public.projects for select to authenticated using (true);

drop policy if exists "projects_crud_mentor_admin" on public.projects;
create policy "projects_crud_mentor_admin"
  on public.projects for all to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

-- Policies untuk contents
drop policy if exists "contents_select_published_or_assigned_or_staff" on public.contents;
create policy "contents_select_published_or_assigned_or_staff"
  on public.contents for select to authenticated
  using (
    public.is_mentor_or_admin()
    or status = 'published'
    or exists (
      select 1 from public.enrollments e
       where e.content_id = contents.id and e.learner_id = auth.uid()
    )
  );

drop policy if exists "contents_crud_mentor_admin" on public.contents;
create policy "contents_crud_mentor_admin"
  on public.contents for all to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

-- Policies untuk course_sections & course_chapters
drop policy if exists "course_sections_select_accessible" on public.course_sections;
create policy "course_sections_select_accessible"
  on public.course_sections for select to authenticated
  using (
    public.is_mentor_or_admin()
    or exists (
      select 1 from public.contents c
       where c.id = course_sections.content_id
         and (c.status = 'published' or exists (
           select 1 from public.enrollments e where e.content_id = c.id and e.learner_id = auth.uid()
         ))
    )
  );

drop policy if exists "course_sections_crud_mentor_admin" on public.course_sections;
create policy "course_sections_crud_mentor_admin"
  on public.course_sections for all to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

drop policy if exists "course_chapters_select_accessible" on public.course_chapters;
create policy "course_chapters_select_accessible"
  on public.course_chapters for select to authenticated
  using (
    public.is_mentor_or_admin()
    or exists (
      select 1 from public.contents c
       where c.id = course_chapters.content_id
         and (c.status = 'published' or exists (
           select 1 from public.enrollments e where e.content_id = c.id and e.learner_id = auth.uid()
         ))
    )
  );

drop policy if exists "course_chapters_crud_mentor_admin" on public.course_chapters;
create policy "course_chapters_crud_mentor_admin"
  on public.course_chapters for all to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

-- Policies untuk learning_path_items & quiz_questions & content_versions
drop policy if exists "learning_path_items_select_all" on public.learning_path_items;
create policy "learning_path_items_select_all"
  on public.learning_path_items for select to authenticated using (true);

drop policy if exists "learning_path_items_crud_mentor_admin" on public.learning_path_items;
create policy "learning_path_items_crud_mentor_admin"
  on public.learning_path_items for all to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

drop policy if exists "quiz_questions_select_accessible" on public.quiz_questions;
create policy "quiz_questions_select_accessible"
  on public.quiz_questions for select to authenticated
  using (
    public.is_mentor_or_admin()
    or exists (
      select 1 from public.contents c
       where c.id = quiz_questions.quiz_id
         and (c.status = 'published' or exists (
           select 1 from public.enrollments e where e.content_id = c.id and e.learner_id = auth.uid()
         ))
    )
  );

drop policy if exists "quiz_questions_crud_mentor_admin" on public.quiz_questions;
create policy "quiz_questions_crud_mentor_admin"
  on public.quiz_questions for all to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

drop policy if exists "content_versions_crud_mentor_admin" on public.content_versions;
create policy "content_versions_crud_mentor_admin"
  on public.content_versions for all to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

-- Policies untuk enrollments & submissions
drop policy if exists "enrollments_select_own_or_staff" on public.enrollments;
create policy "enrollments_select_own_or_staff"
  on public.enrollments for select to authenticated
  using (learner_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "enrollments_insert_own_or_staff" on public.enrollments;
create policy "enrollments_insert_own_or_staff"
  on public.enrollments for insert to authenticated
  with check (learner_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "enrollments_update_own_or_staff" on public.enrollments;
create policy "enrollments_update_own_or_staff"
  on public.enrollments for update to authenticated
  using (learner_id = auth.uid() or public.is_mentor_or_admin())
  with check (learner_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "enrollments_delete_staff_only" on public.enrollments;
create policy "enrollments_delete_staff_only"
  on public.enrollments for delete to authenticated
  using (public.is_mentor_or_admin());

drop policy if exists "submissions_select_own_or_staff" on public.submissions;
create policy "submissions_select_own_or_staff"
  on public.submissions for select to authenticated
  using (learner_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "submissions_insert_own_or_staff" on public.submissions;
create policy "submissions_insert_own_or_staff"
  on public.submissions for insert to authenticated
  with check (learner_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "submissions_update_staff_only" on public.submissions;
create policy "submissions_update_staff_only"
  on public.submissions for update to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

drop policy if exists "submissions_delete_staff_only" on public.submissions;
create policy "submissions_delete_staff_only"
  on public.submissions for delete to authenticated
  using (public.is_mentor_or_admin());

-- Policies untuk discussions & content_issues
drop policy if exists "discussions_select_authenticated" on public.discussions;
create policy "discussions_select_authenticated"
  on public.discussions for select to authenticated using (true);

drop policy if exists "discussions_insert_own" on public.discussions;
create policy "discussions_insert_own"
  on public.discussions for insert to authenticated
  with check (author_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "discussions_update_own_or_staff" on public.discussions;
create policy "discussions_update_own_or_staff"
  on public.discussions for update to authenticated
  using (author_id = auth.uid() or public.is_mentor_or_admin())
  with check (author_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "discussions_delete_own_or_staff" on public.discussions;
create policy "discussions_delete_own_or_staff"
  on public.discussions for delete to authenticated
  using (author_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "content_issues_select_own_or_staff" on public.content_issues;
create policy "content_issues_select_own_or_staff"
  on public.content_issues for select to authenticated
  using (reporter_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "content_issues_insert_own" on public.content_issues;
create policy "content_issues_insert_own"
  on public.content_issues for insert to authenticated
  with check (reporter_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "content_issues_update_staff" on public.content_issues;
create policy "content_issues_update_staff"
  on public.content_issues for update to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

drop policy if exists "content_issues_delete_staff" on public.content_issues;
create policy "content_issues_delete_staff"
  on public.content_issues for delete to authenticated
  using (public.is_mentor_or_admin());

-- Policies untuk tabel integrasi rs-learning-26
drop policy if exists "courses_public_read" on public.courses;
create policy "courses_public_read" on public.courses for select using (true);

drop policy if exists "lessons_public_read" on public.lessons;
create policy "lessons_public_read" on public.lessons for select using (true);

drop policy if exists "lesson_assets_public_read" on public.lesson_assets;
create policy "lesson_assets_public_read" on public.lesson_assets for select using (true);

drop policy if exists "lesson_reviews_public_read" on public.lesson_reviews;
create policy "lesson_reviews_public_read" on public.lesson_reviews for select using (true);

drop policy if exists "lesson_reviews_public_write" on public.lesson_reviews;
create policy "lesson_reviews_public_write" on public.lesson_reviews for insert with check (true);

drop policy if exists "lesson_progress_public_all" on public.lesson_progress;
create policy "lesson_progress_public_all" on public.lesson_progress for all using (true) with check (true);

drop policy if exists "lesson_notes_public_all" on public.lesson_notes;
create policy "lesson_notes_public_all" on public.lesson_notes for all using (true) with check (true);

drop policy if exists "shared_assets_public_read" on public.shared_assets;
create policy "shared_assets_public_read" on public.shared_assets for select using (true);

drop policy if exists "learning_hub_content_public_read" on public.learning_hub_content;
create policy "learning_hub_content_public_read" on public.learning_hub_content for select using (true);

drop policy if exists "user_profiles_public_all" on public.user_profiles;
create policy "user_profiles_public_all" on public.user_profiles for all using (true) with check (true);

drop policy if exists "user_subscriptions_public_all" on public.user_subscriptions;
create policy "user_subscriptions_public_all" on public.user_subscriptions for all using (true) with check (true);

drop policy if exists "forum_threads_public_all" on public.forum_threads;
create policy "forum_threads_public_all" on public.forum_threads for all using (true) with check (true);

drop policy if exists "forum_replies_public_all" on public.forum_replies;
create policy "forum_replies_public_all" on public.forum_replies for all using (true) with check (true);

-- =============================================================================
-- BAGIAN 6: SUPABASE STORAGE BUCKETS & STORAGE RLS
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'ruang-sosmed-media',
    'ruang-sosmed-media',
    true,
    52428800,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
  ),
  (
    'ruang-sosmed-attachments',
    'ruang-sosmed-attachments',
    true,
    26214400,
    array['application/pdf', 'application/zip', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  ),
  (
    'ruang-sosmed-avatars',
    'ruang-sosmed-avatars',
    true,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  ('lesson-assets', 'lesson-assets', true, 52428800, null),
  ('profile-avatars', 'profile-avatars', true, 5242880, null)
on conflict (id) do nothing;

drop policy if exists "storage_select_authenticated" on storage.objects;
create policy "storage_select_authenticated"
  on storage.objects for select to authenticated
  using (bucket_id in ('ruang-sosmed-media', 'ruang-sosmed-attachments', 'ruang-sosmed-avatars', 'lesson-assets', 'profile-avatars'));

drop policy if exists "storage_mentor_admin_all" on storage.objects;
create policy "storage_mentor_admin_all"
  on storage.objects for all to authenticated
  using (
    bucket_id in ('ruang-sosmed-media', 'ruang-sosmed-attachments', 'ruang-sosmed-avatars', 'lesson-assets', 'profile-avatars')
    and public.is_mentor_or_admin()
  )
  with check (
    bucket_id in ('ruang-sosmed-media', 'ruang-sosmed-attachments', 'ruang-sosmed-avatars', 'lesson-assets', 'profile-avatars')
    and public.is_mentor_or_admin()
  );

drop policy if exists "storage_learner_insert_own" on storage.objects;
create policy "storage_learner_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('ruang-sosmed-attachments', 'ruang-sosmed-avatars', 'profile-avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- BAGIAN 7: SEED DATA AWAL & BRIDGE VIEW ("rs-learning-26" <-> "Ruang Sosmed 2.0")
-- =============================================================================

insert into public.courses (key, title, subtitle, description, level, thumbnail_url, lesson_count, sort_order, status, linked_content_id)
values
  (
    'lms',
    'Fundamental Social Media Specialist',
    'Batch Aktif',
    'Pelajari dasar strategi konten, cara kerja algoritma, penyusunan content pillar, produksi Reels, hingga membaca insight mingguan secara terstruktur.',
    'Beginner – Intermediate',
    '',
    5,
    1,
    'open',
    'exp-1'
  ),
  (
    'advance-sm',
    'Advance Social Media Strategy',
    'Next Level',
    'Pendalaman strategi pertumbuhan akun, eksperimen kreatif, funnel konten, analisis kompetitor, dan optimasi konversi organik untuk brand maupun kreator.',
    'Intermediate – Advanced',
    '',
    6,
    2,
    'open',
    'lc-4'
  ),
  (
    'content-system',
    'Content System & Workflow',
    'Production System',
    'Bangun sistem produksi konten dari riset ide, bank hook, penjadwalan, delegasi tim, hingga template SOP agar publikasi konsisten tanpa burnout.',
    'All Level',
    '',
    5,
    3,
    'open',
    'exp-6'
  )
on conflict (key) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  level = excluded.level,
  lesson_count = excluded.lesson_count,
  sort_order = excluded.sort_order,
  status = excluded.status,
  linked_content_id = excluded.linked_content_id;

insert into public.lessons (lesson_key, course_key, sort_order, title, duration, meta, description, video_url, linked_chapter_id)
values
  (
    'content-planning',
    'lms',
    1,
    '01: learn the basics',
    '18 menit',
    'video class',
    'membahas cara menyusun ide konten, menentukan angle, dan membangun ritme posting yang konsisten.',
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    'cch-1'
  ),
  (
    'asset-reels',
    'lms',
    2,
    '02: content asset workflow',
    '12 file',
    'download asset',
    'menjelaskan struktur asset kelas yang dipakai untuk reels, termasuk cover, subtitle, dan format file.',
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    'cch-2'
  ),
  (
    'weekly-review',
    'lms',
    3,
    '03: weekly performance review',
    '9 menit',
    'case study',
    'menunjukkan cara membaca insight mingguan, menemukan pola performa, dan menentukan next action.',
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    'cch-3'
  ),
  (
    'practice-recap',
    'lms',
    4,
    '04: practice and recap',
    '11 menit',
    'exercise',
    'latihan penerapan materi sebelumnya lalu merangkum poin penting agar mudah diulang kembali.',
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    'cch-4'
  ),
  (
    'platform-shift',
    'lms',
    5,
    '05: platform trend shift',
    '14 menit',
    'trend update',
    'membahas perubahan pola konsumsi konten di platform dan implikasinya ke strategi berikutnya.',
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    'cch-6'
  )
on conflict (lesson_key) do update set
  course_key = excluded.course_key,
  sort_order = excluded.sort_order,
  title = excluded.title,
  duration = excluded.duration,
  meta = excluded.meta,
  description = excluded.description,
  video_url = excluded.video_url,
  linked_chapter_id = excluded.linked_chapter_id,
  updated_at = timezone('utc', now());

insert into public.lesson_assets (asset_key, lesson_key, sort_order, title, type, note, storage_path, external_url)
values
  ('asset-content-brief', 'content-planning', 1, 'content brief template', 'pdf', 'outline singkat untuk planning', null, null),
  ('asset-hook-bank', 'content-planning', 2, 'hook bank sheet', 'sheet', 'list hook yang siap dipakai', null, null),
  ('asset-reel-pack', 'asset-reels', 1, 'reel cover pack', 'zip', 'cover visual siap edit', null, null),
  ('asset-subtitle-preset', 'asset-reels', 2, 'subtitle preset', 'srt', 'format subtitle dasar', null, null),
  ('asset-insight-sheet', 'weekly-review', 1, 'insight tracking sheet', 'sheet', 'rekap performa mingguan', null, null),
  ('asset-practice-checklist', 'practice-recap', 1, 'practice checklist', 'pdf', 'panduan latihan mandiri', null, null),
  ('asset-trend-notes', 'platform-shift', 1, 'trend notes', 'pdf', 'catatan update tren platform', null, null)
on conflict (asset_key) do update set
  lesson_key = excluded.lesson_key,
  sort_order = excluded.sort_order,
  title = excluded.title,
  type = excluded.type,
  note = excluded.note,
  updated_at = timezone('utc', now());

insert into public.lesson_reviews (lesson_key, reviewer_name, reviewer_username, rating, feedback)
select *
from (
  values
    ('content-planning', 'Nisa Amelia', 'nisa', 5, 'Materinya jelas, contoh yang dipakai gampang diikuti untuk menyusun content pillar.'),
    ('content-planning', 'Dimas Prakoso', 'dimas', 5, 'Alur videonya enak dan template content brief langsung kepakai di tim sosmed kami.'),
    ('asset-reels', 'Siti Sarah', 'siti', 5, 'Preset subtitle dan reel cover pack sangat menghemat waktu editing harian.')
) as seed (lesson_key, reviewer_name, reviewer_username, rating, feedback)
where not exists (select 1 from public.lesson_reviews limit 1);

insert into public.user_profiles (username, name, email, job_title)
values
  ('raka', 'Raka Pratama', 'raka.pratama@ruangsosmed.id', 'Social Media Specialist'),
  ('nadia', 'Nadia Putri', 'nadia.putri@ruangsosmed.id', 'Performance Marketer'),
  ('bima', 'Bima Sakti', 'bima.sakti@ruangsosmed.id', 'Content Creator'),
  ('siti', 'Siti Sarah', 'siti.sarah@ruangsosmed.id', 'Copywriter & Strategist'),
  ('dimas', 'Dimas Anggara', 'dimas.anggara@ruangsosmed.id', 'Meta Ads Specialist')
on conflict (username) do update set
  name = excluded.name,
  email = excluded.email,
  job_title = excluded.job_title;

insert into public.user_subscriptions (username, plan_tier, status)
values
  ('raka', 'Free', 'nonaktif'),
  ('nadia', 'PRO', 'aktif'),
  ('bima', 'PRO', 'aktif'),
  ('siti', 'Free', 'nonaktif'),
  ('dimas', 'PRO', 'aktif')
on conflict (username) do update set
  plan_tier = excluded.plan_tier,
  status = excluded.status;

create or replace view public.v_rs_learning_26_lessons_with_assets as
select
  l.lesson_key,
  l.course_key,
  c.title as course_title,
  c.level as course_level,
  c.linked_content_id,
  l.sort_order,
  l.title as lesson_title,
  l.duration,
  l.meta,
  l.description,
  l.video_url,
  l.linked_chapter_id,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'assetKey', a.asset_key,
        'title', a.title,
        'type', a.type,
        'note', a.note,
        'storagePath', a.storage_path,
        'externalUrl', a.external_url,
        'sortOrder', a.sort_order
      ) order by a.sort_order
    ) filter (where a.asset_key is not null),
    '[]'::jsonb
  ) as assets
from public.lessons l
join public.courses c on c.key = l.course_key
left join public.lesson_assets a on a.lesson_key = l.lesson_key
group by
  l.lesson_key,
  l.course_key,
  c.title,
  c.level,
  c.linked_content_id,
  l.sort_order,
  l.title,
  l.duration,
  l.meta,
  l.description,
  l.video_url,
  l.linked_chapter_id;
