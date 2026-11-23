-- =============================================================================
-- RUANG SOSMED 2.0 LMS — FRESH PROJECT SQL BUNDLE
-- BAGIAN 1/3 — Schema Inti, Integrasi LMS, Landing/Inbox, Folder & Security Hardening (001 - 011)
-- Target Project: wdmfxlrdyqxnycbebwpv
-- Jalankan file ini di Supabase SQL Editor secara berurutan (01 -> 02 -> 03).
-- =============================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 001_ruang_sosmed_schema.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — PRODUCTION SUPABASE SCHEMA, STORAGE & RLS MIGRATION
-- File: supabase/migrations/001_ruang_sosmed_schema.sql
-- =============================================================================

-- Enable required PostgreSQL extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =============================================================================
-- 1. ENUMERATED TYPES
-- =============================================================================

do $$ begin
  create type public.user_role as enum ('admin', 'mentor', 'learner');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_type as enum (
    'course',
    'page',
    'quiz',
    'assignment',
    'learning_path',
    'wiki',
    'folder'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_urgency as enum ('urgent', 'not_urgent');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.quiz_question_type as enum (
    'multiple_choice',
    'fill_blank',
    'hotspot',
    'open_ended',
    'categorization'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.enrollment_status as enum (
    'not_started',
    'in_progress',
    'passed',
    'failed',
    'overdue'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.grading_status as enum (
    'pending_review',
    'passed',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.issue_status as enum ('open', 'resolved');
exception
  when duplicate_object then null;
end $$;

-- =============================================================================
-- 2. CORE TABLES & RELATIONAL ARCHITECTURE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLE 1: profiles (References auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  avatar_url text,
  role public.user_role not null default 'learner',
  job_title text not null default 'Social Media Specialist',
  total_points integer not null default 0 check (total_points >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_total_points on public.profiles(total_points desc);

-- -----------------------------------------------------------------------------
-- TABLE 2: projects (Workspace Cohorts / Folders e.g., "Ruang Sosmed Core")
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color_hex text not null default '#4F39F6',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_created_by on public.projects(created_by);

-- -----------------------------------------------------------------------------
-- TABLE 3: contents (Unified catalog of Courses, Pages, Quizzes, Assignments, Paths, Wikis)
-- -----------------------------------------------------------------------------
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

create index if not exists idx_contents_project_id on public.contents(project_id);
create index if not exists idx_contents_type on public.contents(type);
create index if not exists idx_contents_status on public.contents(status);
create index if not exists idx_contents_author_id on public.contents(author_id);

-- -----------------------------------------------------------------------------
-- TABLE 4A: course_sections (Hierarchical Sections for Courses / Pages)
-- -----------------------------------------------------------------------------
create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  section_title text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_sections_content_order
  on public.course_sections(content_id, order_index asc);

-- -----------------------------------------------------------------------------
-- TABLE 4B: course_chapters (Hierarchical Chapters inside Sections for Courses / Pages)
-- -----------------------------------------------------------------------------
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_chapters_content_order
  on public.course_chapters(content_id, order_index asc);
create index if not exists idx_course_chapters_section_id
  on public.course_chapters(section_id);

-- -----------------------------------------------------------------------------
-- TABLE 5: learning_path_items (Links a learning_path content_id to child content_id items)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TABLE 6: quiz_questions (Modular Quiz Builder questions & JSONB option payloads)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TABLE 7: content_versions (Immutable version snapshots for rollback & audit)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TABLE 8: enrollments (Assignees & per-learner chapter completion state)
-- -----------------------------------------------------------------------------
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  status public.enrollment_status not null default 'not_started',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  completed_chapter_ids uuid[] not null default '{}',
  due_date timestamptz,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, learner_id)
);

create index if not exists idx_enrollments_learner_id on public.enrollments(learner_id);
create index if not exists idx_enrollments_content_id on public.enrollments(content_id);
create index if not exists idx_enrollments_status on public.enrollments(status);

-- -----------------------------------------------------------------------------
-- TABLE 9: submissions (Quiz & Assignment attempts for Trainer Grading Center)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TABLE 10A: discussions (Scoped to content_id and chapter_id with nested replies)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TABLE 10B: content_issues (Learner-reported content bugs/typos scoped to chapter)
-- -----------------------------------------------------------------------------
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
-- 3. TRIGGERS & TRANSACTIONAL RPC FUNCTIONS
-- =============================================================================

-- Automatically update `updated_at` timestamp on row modification
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

-- Automatically provision a `public.profiles` row when a new user signs up in `auth.users`
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, role, job_title, total_points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'learner'),
    coalesce(new.raw_user_meta_data->>'job_title', 'Social Media Specialist'),
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

-- Transactional RPC: Mark a chapter complete, recalculate enrollment progress %, and award points
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
  -- Verify caller is either the learner themselves or a mentor/admin
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

  -- Upsert enrollment record
  insert into public.enrollments (content_id, learner_id, status, progress_percent, completed_chapter_ids)
  values (p_content_id, p_learner_id, 'in_progress', 0, array[]::uuid[])
  on conflict (content_id, learner_id) do nothing;

  select *
    into v_enrollment
    from public.enrollments
   where content_id = p_content_id
     and learner_id = p_learner_id
   for update;

  -- Only award points if chapter was not already in completed_chapter_ids
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

-- Transactional RPC: Mentor grades a submission, updates enrollment status, and awards bonus points
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

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS & POLICIES
-- =============================================================================

-- Security-definer role check to prevent infinite recursion on profiles RLS
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

-- Enable RLS across all 11 tables
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

-- -----------------------------------------------------------------------------
-- RLS: profiles
-- Everyone authenticated can view profiles (needed for leaderboards & discussion avatars).
-- Users can update their own profile; Mentors/Admins have full CRUD.
-- -----------------------------------------------------------------------------
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_mentor_or_admin())
  with check (auth.uid() = id or public.is_mentor_or_admin());

create policy "profiles_insert_own_or_admin"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id or public.is_mentor_or_admin());

create policy "profiles_delete_admin_only"
  on public.profiles for delete
  to authenticated
  using (public.is_mentor_or_admin());

-- -----------------------------------------------------------------------------
-- RLS: projects
-- Mentors/Admins have full CRUD; Learners can read projects.
-- -----------------------------------------------------------------------------
create policy "projects_select_all"
  on public.projects for select
  to authenticated
  using (true);

create policy "projects_crud_mentor_admin"
  on public.projects for all
  to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

-- -----------------------------------------------------------------------------
-- RLS: contents
-- Mentors/Admins have full CRUD.
-- Learners can read published content OR content assigned to them via enrollments.
-- -----------------------------------------------------------------------------
create policy "contents_select_published_or_assigned_or_staff"
  on public.contents for select
  to authenticated
  using (
    public.is_mentor_or_admin()
    or status = 'published'
    or exists (
      select 1
        from public.enrollments e
       where e.content_id = contents.id
         and e.learner_id = auth.uid()
    )
  );

create policy "contents_crud_mentor_admin"
  on public.contents for all
  to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

-- -----------------------------------------------------------------------------
-- RLS: course_sections & course_chapters
-- Mentors/Admins have full CRUD; Learners can read sections/chapters of accessible contents.
-- -----------------------------------------------------------------------------
create policy "course_sections_select_accessible"
  on public.course_sections for select
  to authenticated
  using (
    public.is_mentor_or_admin()
    or exists (
      select 1
        from public.contents c
       where c.id = course_sections.content_id
         and (
           c.status = 'published'
           or exists (
             select 1 from public.enrollments e
              where e.content_id = c.id and e.learner_id = auth.uid()
           )
         )
    )
  );

create policy "course_sections_crud_mentor_admin"
  on public.course_sections for all
  to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

create policy "course_chapters_select_accessible"
  on public.course_chapters for select
  to authenticated
  using (
    public.is_mentor_or_admin()
    or exists (
      select 1
        from public.contents c
       where c.id = course_chapters.content_id
         and (
           c.status = 'published'
           or exists (
             select 1 from public.enrollments e
              where e.content_id = c.id and e.learner_id = auth.uid()
           )
         )
    )
  );

create policy "course_chapters_crud_mentor_admin"
  on public.course_chapters for all
  to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

-- -----------------------------------------------------------------------------
-- RLS: learning_path_items & quiz_questions
-- Mentors/Admins have full CRUD; Learners can read items for published/assigned contents.
-- -----------------------------------------------------------------------------
create policy "learning_path_items_select_all"
  on public.learning_path_items for select
  to authenticated
  using (true);

create policy "learning_path_items_crud_mentor_admin"
  on public.learning_path_items for all
  to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

create policy "quiz_questions_select_accessible"
  on public.quiz_questions for select
  to authenticated
  using (
    public.is_mentor_or_admin()
    or exists (
      select 1
        from public.contents c
       where c.id = quiz_questions.quiz_id
         and (
           c.status = 'published'
           or exists (
             select 1 from public.enrollments e
              where e.content_id = c.id and e.learner_id = auth.uid()
           )
         )
    )
  );

create policy "quiz_questions_crud_mentor_admin"
  on public.quiz_questions for all
  to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

-- -----------------------------------------------------------------------------
-- RLS: content_versions
-- Mentors/Admins have full CRUD on version snapshots.
-- -----------------------------------------------------------------------------
create policy "content_versions_crud_mentor_admin"
  on public.content_versions for all
  to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

-- -----------------------------------------------------------------------------
-- RLS: enrollments
-- Mentors/Admins have full CRUD.
-- Learners can read their own enrollments, self-enroll in published catalog items,
-- and update their own progress_percent & completed_chapter_ids.
-- -----------------------------------------------------------------------------
create policy "enrollments_select_own_or_staff"
  on public.enrollments for select
  to authenticated
  using (learner_id = auth.uid() or public.is_mentor_or_admin());

create policy "enrollments_insert_own_or_staff"
  on public.enrollments for insert
  to authenticated
  with check (learner_id = auth.uid() or public.is_mentor_or_admin());

create policy "enrollments_update_own_or_staff"
  on public.enrollments for update
  to authenticated
  using (learner_id = auth.uid() or public.is_mentor_or_admin())
  with check (learner_id = auth.uid() or public.is_mentor_or_admin());

create policy "enrollments_delete_staff_only"
  on public.enrollments for delete
  to authenticated
  using (public.is_mentor_or_admin());

-- -----------------------------------------------------------------------------
-- RLS: submissions
-- Learners can read their own submissions and insert new quiz/assignment attempts.
-- Mentors/Admins have full CRUD (to review, grade, and add mentor_feedback).
-- -----------------------------------------------------------------------------
create policy "submissions_select_own_or_staff"
  on public.submissions for select
  to authenticated
  using (learner_id = auth.uid() or public.is_mentor_or_admin());

create policy "submissions_insert_own_or_staff"
  on public.submissions for insert
  to authenticated
  with check (learner_id = auth.uid() or public.is_mentor_or_admin());

create policy "submissions_update_staff_only"
  on public.submissions for update
  to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

create policy "submissions_delete_staff_only"
  on public.submissions for delete
  to authenticated
  using (public.is_mentor_or_admin());

-- -----------------------------------------------------------------------------
-- RLS: discussions & content_issues
-- All authenticated users can read discussions & issues for accessible content.
-- Learners can insert their own discussions & content_issues.
-- Mentors/Admins have full CRUD (including resolving issues and moderating threads).
-- -----------------------------------------------------------------------------
create policy "discussions_select_authenticated"
  on public.discussions for select
  to authenticated
  using (true);

create policy "discussions_insert_own"
  on public.discussions for insert
  to authenticated
  with check (author_id = auth.uid() or public.is_mentor_or_admin());

create policy "discussions_update_own_or_staff"
  on public.discussions for update
  to authenticated
  using (author_id = auth.uid() or public.is_mentor_or_admin())
  with check (author_id = auth.uid() or public.is_mentor_or_admin());

create policy "discussions_delete_own_or_staff"
  on public.discussions for delete
  to authenticated
  using (author_id = auth.uid() or public.is_mentor_or_admin());

create policy "content_issues_select_own_or_staff"
  on public.content_issues for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_mentor_or_admin());

create policy "content_issues_insert_own"
  on public.content_issues for insert
  to authenticated
  with check (reporter_id = auth.uid() or public.is_mentor_or_admin());

create policy "content_issues_update_staff"
  on public.content_issues for update
  to authenticated
  using (public.is_mentor_or_admin())
  with check (public.is_mentor_or_admin());

create policy "content_issues_delete_staff"
  on public.content_issues for delete
  to authenticated
  using (public.is_mentor_or_admin());

-- =============================================================================
-- 5. SUPABASE STORAGE BUCKETS & STORAGE RLS POLICIES
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'ruang-sosmed-media',
    'ruang-sosmed-media',
    true,
    52428800, -- 50 MB for course videos, thumbnails, and quiz hotspot images
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
  ),
  (
    'ruang-sosmed-attachments',
    'ruang-sosmed-attachments',
    true,
    26214400, -- 25 MB for downloadable PDFs, Notion/ZIP templates, and learner assignment uploads
    array['application/pdf', 'application/zip', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  ),
  (
    'ruang-sosmed-avatars',
    'ruang-sosmed-avatars',
    true,
    5242880, -- 5 MB for profile avatars
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do nothing;

-- Storage Policy: Anyone authenticated can view media, attachments, and avatars
create policy "storage_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('ruang-sosmed-media', 'ruang-sosmed-attachments', 'ruang-sosmed-avatars'));

-- Storage Policy: Mentors/Admins can upload/update/delete course media & templates
create policy "storage_mentor_admin_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id in ('ruang-sosmed-media', 'ruang-sosmed-attachments', 'ruang-sosmed-avatars')
    and public.is_mentor_or_admin()
  )
  with check (
    bucket_id in ('ruang-sosmed-media', 'ruang-sosmed-attachments', 'ruang-sosmed-avatars')
    and public.is_mentor_or_admin()
  );

-- Storage Policy: Learners can upload their own avatar or assignment submission attachments
create policy "storage_learner_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('ruang-sosmed-attachments', 'ruang-sosmed-avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 002_rs_learning_26_integration.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- RUANG SOSMED 2.0 — MIGRATION 002: "rs-learning-26" ARCHITECTURE INTEGRATION
-- Source Repository: https://github.com/dinurpradipta12/rs-learning-26
-- Ports core tables, storage buckets, hardened RLS policies, RPCs, seed data,
-- and relational bridge views into Ruang Sosmed 2.0.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. COURSES & LESSONS CATALOG TABLES (FROM rs-learning-26)
-- ============================================================================
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
  linked_content_id text, -- Bridges to Ruang Sosmed 2.0 public.contents(id)
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
  linked_chapter_id text, -- Bridges to Ruang Sosmed 2.0 public.course_chapters(id)
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

-- ============================================================================
-- 2. SHARED ASSETS, FORUM THREADS/REPLIES, LEARNING HUB CONTENT & PROFILES
-- ============================================================================
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

-- ============================================================================
-- 3. STORAGE BUCKETS FROM rs-learning-26
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('lesson-assets', 'lesson-assets', true),
  ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
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

drop policy if exists "user_subscriptions_public_read" on public.user_subscriptions;
create policy "user_subscriptions_public_read" on public.user_subscriptions for select using (true);

drop policy if exists "forum_threads_public_all" on public.forum_threads;
create policy "forum_threads_public_all" on public.forum_threads for all using (true) with check (true);

drop policy if exists "forum_replies_public_all" on public.forum_replies;
create policy "forum_replies_public_all" on public.forum_replies for all using (true) with check (true);

-- ============================================================================
-- 5. CORE RPC FUNCTIONS PORTED FROM rs-learning-26
-- ============================================================================
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

-- ============================================================================
-- 6. SEED DATA FROM rs-learning-26
-- ============================================================================
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
    'item-course-sm101'
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
    'item-course-reels'
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
    'item-wiki-hooks'
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
    'chap-1-1'
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
    'chap-1-2'
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
    'chap-2-1'
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
    'chap-2-2'
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
    'chap-2-3'
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

-- ============================================================================
-- 7. RELATIONAL BRIDGE VIEW (rs-learning-26 <-> Ruang Sosmed 2.0)
-- ============================================================================
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 003_clean_reset_and_dev_admin.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — MIGRATION 003: CLEAN EMPTY STATE & LEARNER SYNC
-- File: supabase/migrations/003_clean_reset_and_dev_admin.sql
-- Jalankan SQL ini di Supabase SQL Editor untuk:
-- 1. Membuka akses baca public.profiles agar Admin Studio dapat membaca semua learner terdaftar
-- 2. Menyinkronkan kembali semua akun learner yang sudah mendaftar di auth.users ke public.profiles & public.user_profiles
-- 3. Mengaktifkan akun Dev Admin utama (role = 'admin')
-- =============================================================================

-- 1. Pastikan kolom role ada pada user_profiles
alter table if exists public.user_profiles
  add column if not exists role text not null default 'learner'
  check (role in ('admin', 'mentor', 'learner'));

-- 2. Buka RLS baca pada public.profiles & public.user_profiles agar Admin Directory selalu bisa membaca daftar learner
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "user_profiles_public_all" on public.user_profiles;
create policy "user_profiles_public_all"
  on public.user_profiles for all
  to anon, authenticated
  using (true)
  with check (true);

-- 3. Sinkronkan (Backfill) semua akun yang sudah terdaftar di auth.users ke public.profiles & public.user_profiles
insert into public.profiles (id, full_name, email, avatar_url, role, job_title, total_points)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
  u.email,
  u.raw_user_meta_data->>'avatar_url',
  case
    when lower(u.email) in ('dinurm.pradipta@gmail.com', 'contact.dinurpradipta@gmail.com', 'dinur@ruangsosmed.id', 'admin@ruangsosmed.id')
      then 'admin'::public.user_role
    when (u.raw_user_meta_data->>'role') in ('admin', 'mentor', 'learner')
      then (u.raw_user_meta_data->>'role')::public.user_role
    else 'learner'::public.user_role
  end,
  coalesce(nullif(u.raw_user_meta_data->>'job_title', ''), 'Social Media Specialist'),
  0
from auth.users u
where u.email is not null
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role;

insert into public.user_profiles (username, name, email, role, job_title, joined_at, updated_at)
select
  lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g')) || '_' || substr(u.id::text, 1, 4),
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
  u.email,
  case
    when lower(u.email) in ('dinurm.pradipta@gmail.com', 'contact.dinurpradipta@gmail.com', 'dinur@ruangsosmed.id', 'admin@ruangsosmed.id')
      then 'admin'
    else 'learner'
  end,
  coalesce(nullif(u.raw_user_meta_data->>'job_title', ''), 'Social Media Specialist'),
  current_date,
  timezone('utc', now())
from auth.users u
where u.email is not null
  and not exists (
    select 1 from public.user_profiles up where lower(up.email) = lower(u.email)
  )
on conflict (username) do nothing;

-- 4. Pastikan Akun Dev Admin Utama Terdaftar sebagai Admin
insert into public.user_profiles (
  username,
  name,
  email,
  role,
  job_title,
  joined_at,
  updated_at
)
values (
  'dinur',
  'Dinur M. Pradipta',
  'dinurm.pradipta@gmail.com',
  'admin',
  'Founder & Dev Admin',
  current_date,
  timezone('utc', now())
)
on conflict (username) do update set
  name = excluded.name,
  email = excluded.email,
  role = 'admin',
  job_title = excluded.job_title,
  updated_at = timezone('utc', now());


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 004_avatar_url_sync.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- 004_avatar_url_sync.sql
-- Sinkronisasi kolom avatar_url, full_name, dan user_id pada public.user_profiles
-- serta memastikan RLS public.profiles & public.user_profiles mendukung update avatar.
-- Jalankan di Supabase SQL Editor (aman dijalankan berulang / idempotent).
-- ============================================================================

-- 1. Pastikan kolom user_id, full_name, dan avatar_url ada pada public.user_profiles
alter table if exists public.user_profiles
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists full_name text,
  add column if not exists avatar_url text;

-- 2. Backfill user_id & full_name pada public.user_profiles dari auth.users
update public.user_profiles up
set
  user_id = u.id,
  full_name = coalesce(up.full_name, up.name)
from auth.users u
where lower(up.email) = lower(u.email)
  and (up.user_id is null or up.full_name is null);

-- 3. Sinkronkan avatar_url antara public.profiles dan public.user_profiles
update public.user_profiles up
set avatar_url = coalesce(up.avatar_url, up.avatar_path, p.avatar_url)
from public.profiles p
where lower(up.email) = lower(p.email)
  and up.avatar_url is null
  and (up.avatar_path is not null or p.avatar_url is not null);

-- 4. Pastikan index pada user_profiles(user_id) untuk query update cepat
create index if not exists idx_user_profiles_user_id
  on public.user_profiles (user_id);

-- 5. Pastikan RLS public.profiles mengizinkan user membaca & mengupdate profilnya sendiri
alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. Pastikan RLS public.user_profiles mengizinkan baca & update
alter table if exists public.user_profiles enable row level security;

drop policy if exists "user_profiles_public_all" on public.user_profiles;
create policy "user_profiles_public_all"
  on public.user_profiles for all
  using (true)
  with check (true);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 005_profile_header_banner.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- 005_profile_header_banner.sql
-- Menambahkan kolom header_url pada public.profiles dan public.user_profiles
-- untuk menyimpan pilihan header banner (preset ID atau custom image URL/data).
-- Jalankan di Supabase SQL Editor (aman dijalankan berulang / idempotent).
-- ============================================================================

-- 1. Tambahkan kolom header_url pada public.profiles & public.user_profiles
alter table if exists public.profiles
  add column if not exists header_url text default 'cosmic';

alter table if exists public.user_profiles
  add column if not exists header_url text default 'cosmic';

-- 2. Pastikan RLS mengizinkan user membaca & mengupdate header_url miliknya
alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

alter table if exists public.user_profiles enable row level security;

drop policy if exists "user_profiles_public_all" on public.user_profiles;
create policy "user_profiles_public_all"
  on public.user_profiles for all
  using (true)
  with check (true);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 006_lms_builder_tables.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 007_landing_and_mentor_inbox.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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
-- Enum value 'folder' sudah didaftarkan di public.content_type (bagian 001).

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 008_clear_dummy_reviews.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — KOSONGKAN ULASAN DUMMY & SINKRONISASI PERUBAHAN
-- File: supabase/migrations/008_clear_dummy_reviews.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

-- 1. Kosongkan seluruh data ulasan dummy / testing sebelum peluncuran resmi
DO $$
BEGIN
  IF to_regclass('public.lesson_reviews') IS NOT NULL THEN
    TRUNCATE TABLE public.lesson_reviews;
  END IF;
END $$;

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
--    hapus tanda komentar "--" pada blok di bawah ini:
-- DO $$
-- BEGIN
--   IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
--     TRUNCATE TABLE public.mentor_inbox_threads;
--   END IF;
--   IF to_regclass('public.mentor_reported_issues') IS NOT NULL THEN
--     TRUNCATE TABLE public.mentor_reported_issues;
--   END IF;
-- END $$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 009_folder_order_and_cleanup.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 010_sync_projects_folders_and_rls.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — SINKRONISASI PROJECT/COHORT, FOLDER, KURSUS & RLS ADMIN
-- File: supabase/migrations/010_sync_projects_folders_and_rls.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

-- 1. Enum `public.content_type` sudah mendukung nilai 'folder' dari bagian 001.

-- 2. Pastikan seluruh kolom metadata Folder & Cohort tersedia di `public.contents`
ALTER TABLE IF EXISTS public.contents
  ADD COLUMN IF NOT EXISTS folder_name text,
  ADD COLUMN IF NOT EXISTS folder_id text,
  ADD COLUMN IF NOT EXISTS access_code text,
  ADD COLUMN IF NOT EXISTS cohort text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_contents_folder_name ON public.contents(folder_name);
CREATE INDEX IF NOT EXISTS idx_contents_cohort ON public.contents(cohort);
CREATE INDEX IF NOT EXISTS idx_contents_title ON public.contents(title);

-- 3. Backfill kolom folder_name, access_code, dan cohort dari JSON settings_json
UPDATE public.contents
SET
  folder_name = COALESCE(NULLIF(folder_name, ''), NULLIF(settings_json->'explorer_meta'->>'folderName', '')),
  access_code = COALESCE(NULLIF(access_code, ''), NULLIF(settings_json->'explorer_meta'->>'accessCode', '')),
  cohort      = COALESCE(NULLIF(cohort, ''), NULLIF(settings_json->'explorer_meta'->>'cohort', ''))
WHERE settings_json ? 'explorer_meta';

-- 4. Buka kebijakan RLS agar sync lintas origin (localhost:3000 <-> ruangsosmedid.com)
--    dan login Developer (Arunika) tidak terblokir saat push/pull Project, Folder, & Kursus
ALTER TABLE IF EXISTS public.contents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contents_select_published_or_assigned_or_staff" ON public.contents;
DROP POLICY IF EXISTS "contents_crud_mentor_admin" ON public.contents;
DROP POLICY IF EXISTS "contents_public_select_all" ON public.contents;
DROP POLICY IF EXISTS "contents_public_write_all" ON public.contents;
DROP POLICY IF EXISTS "contents_sync_all" ON public.contents;
CREATE POLICY "contents_sync_all"
  ON public.contents FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.course_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_sections_select_accessible" ON public.course_sections;
DROP POLICY IF EXISTS "course_sections_crud_mentor_admin" ON public.course_sections;
DROP POLICY IF EXISTS "course_sections_sync_all" ON public.course_sections;
CREATE POLICY "course_sections_sync_all"
  ON public.course_sections FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.course_chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_chapters_select_accessible" ON public.course_chapters;
DROP POLICY IF EXISTS "course_chapters_crud_mentor_admin" ON public.course_chapters;
DROP POLICY IF EXISTS "course_chapters_sync_all" ON public.course_chapters;
CREATE POLICY "course_chapters_sync_all"
  ON public.course_chapters FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_select_all" ON public.projects;
DROP POLICY IF EXISTS "projects_crud_mentor_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_sync_all" ON public.projects;
CREATE POLICY "projects_sync_all"
  ON public.projects FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_sync_all" ON public.profiles;
CREATE POLICY "profiles_sync_all"
  ON public.profiles FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_public_all" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_sync_all" ON public.user_profiles;
CREATE POLICY "user_profiles_sync_all"
  ON public.user_profiles FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Seed row `__SYSTEM_COHORT_PROJECTS__` di `public.contents` jika belum ada
DO $$
DECLARE
  v_default_cohorts jsonb := '[
    {"id":"cohort-1","name":"Ruang Sosmed Class","color":"#EC4899","description":"Batch Utama Ruang Sosmed"},
    {"id":"cohort-2","name":"Creator Growth Lab","color":"#10B981","description":"Short-Form Video Track"},
    {"id":"cohort-mbsms","name":"Mini Bootcamp Social Media Specialist","color":"#0EA5E9","description":"Mini Bootcamp Social Media Specialist"}
  ]'::jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.contents WHERE title = '__SYSTEM_COHORT_PROJECTS__'
  ) THEN
    INSERT INTO public.contents (
      id,
      title,
      type,
      status,
      description,
      urgency,
      estimated_minutes,
      points_reward,
      settings_json
    ) VALUES (
      gen_random_uuid(),
      '__SYSTEM_COHORT_PROJECTS__',
      'page',
      'published',
      'System storage for Workspace Cohort Projects',
      'not_urgent',
      0,
      0,
      jsonb_build_object(
        'cohortProjects', v_default_cohorts,
        'updatedAt', now()
      )
    );
  END IF;
END $$;

-- 6. Pastikan akun Developer & Super Admin (`arunika` & `dinur`) terdaftar sebagai `admin`
INSERT INTO public.user_profiles (
  username,
  name,
  email,
  role,
  job_title,
  joined_at,
  updated_at
)
VALUES
  (
    'arunika',
    'Arunika (Developer)',
    'contact.dinurpradipta@gmail.com',
    'admin',
    'Platform Developer & Super Admin',
    current_date,
    timezone('utc', now())
  ),
  (
    'dinur',
    'Dinur M. Pradipta',
    'dinurm.pradipta@gmail.com',
    'admin',
    'Founder & Dev Admin',
    current_date,
    timezone('utc', now())
  )
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = 'admin',
  job_title = EXCLUDED.job_title,
  updated_at = timezone('utc', now());

UPDATE public.profiles
SET role = 'admin'::public.user_role
WHERE lower(email) IN (
  'dinurm.pradipta@gmail.com',
  'contact.dinurpradipta@gmail.com',
  'dinur@ruangsosmed.id',
  'admin@ruangsosmed.id'
);

-- 7. Bersihkan draft potongan judul ketikan & seed lama yang tidak memiliki folder
DELETE FROM public.contents
WHERE title IN (
  'Mini Bootcamp S',
  'Mini Bootcamp Social Media Specialist B',
  'Mini Bootcamp Social Media Specialist Ba',
  'Mini Bootcamp Social Media Specialist Bat',
  'Mini Bootcamp Social Media Specialist Batc',
  'Mini Bootcamp Social Media Specialist Batch',
  'Content Pillars & Audience Persona',
  'Mastering Instagram Carousel & Viral Hook Strategy'
);

-- 8. Hapus duplikat baris sistem (`__SYSTEM_*__`) dan materi dengan judul yang sama (sisakan yang terbaru)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(title)), type
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM public.contents
)
DELETE FROM public.contents
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 9. Pastikan seluruh materi Mini Bootcamp Social Media Specialist terhubung ke folder & project-nya
UPDATE public.contents
SET
  folder_name = 'Mini Bootcamp Social Media Specialist',
  cohort = 'Mini Bootcamp Social Media Specialist',
  settings_json = jsonb_set(
    jsonb_set(
      COALESCE(settings_json, '{}'::jsonb),
      '{explorer_meta,folderName}',
      '"Mini Bootcamp Social Media Specialist"'::jsonb,
      true
    ),
    '{explorer_meta,cohort}',
    '"Mini Bootcamp Social Media Specialist"'::jsonb,
    true
  )
WHERE title IN (
  'Mini Bootcamp Social Media Specialist Batch 1',
  'Mini Bootcamp Social Media Specialist Batch 2',
  'Mini Bootcamp Social Media Specialist Batch 3'
);

-- 10. Buka kebijakan RLS pada `enrollments` dan `submissions` agar Modal Profil User
--     selalu dapat membaca & memperbarui progress belajar serta skor kuis siswa
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enrollments_select_own_or_staff" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_own_or_staff" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update_own_or_staff" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete_staff_only" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_sync_all" ON public.enrollments;
CREATE POLICY "enrollments_sync_all"
  ON public.enrollments FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "submissions_select_own_or_staff" ON public.submissions;
DROP POLICY IF EXISTS "submissions_insert_own_or_staff" ON public.submissions;
DROP POLICY IF EXISTS "submissions_update_staff_only" ON public.submissions;
DROP POLICY IF EXISTS "submissions_sync_all" ON public.submissions;
CREATE POLICY "submissions_sync_all"
  ON public.submissions FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 11. Seed baris sistem `__SYSTEM_USER_PASSWORDS__` untuk penyimpanan reset password Admin lintas perangkat
INSERT INTO public.contents (
  id,
  title,
  type,
  status,
  description,
  urgency,
  estimated_minutes,
  points_reward,
  settings_json
)
SELECT
  gen_random_uuid(),
  '__SYSTEM_USER_PASSWORDS__',
  'page',
  'published',
  'System storage for admin-assisted password resets',
  'not_urgent',
  0,
  0,
  jsonb_build_object('passwords', '{}'::jsonb, 'updatedAt', now())
WHERE NOT EXISTS (
  SELECT 1 FROM public.contents WHERE title = '__SYSTEM_USER_PASSWORDS__'
);

-- 12. RPC Admin Direct Password Reset ke `auth.users` (Supabase Auth)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_identifier text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_clean_id text := lower(trim(COALESCE(p_identifier, '')));
  v_target_uid uuid;
BEGIN
  IF v_clean_id = '' OR length(trim(COALESCE(p_new_password, ''))) < 4 THEN
    RETURN false;
  END IF;

  SELECT u.id
  INTO v_target_uid
  FROM auth.users u
  WHERE lower(u.email) = v_clean_id
     OR lower(COALESCE(u.raw_user_meta_data->>'username', '')) = v_clean_id
     OR lower(COALESCE(u.raw_user_meta_data->>'full_name', '')) = v_clean_id
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_target_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = crypt(trim(p_new_password), gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE id = v_target_uid;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_user_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(text, text) TO anon, authenticated;

-- 13. Seed baris sistem `__SYSTEM_ADMIN_NOTIFICATIONS__` untuk notifikasi floating Admin
INSERT INTO public.contents (
  id,
  title,
  type,
  status,
  description,
  urgency,
  estimated_minutes,
  points_reward,
  settings_json
)
SELECT
  gen_random_uuid(),
  '__SYSTEM_ADMIN_NOTIFICATIONS__',
  'page',
  'published',
  'System storage for Admin activity notifications',
  'not_urgent',
  0,
  0,
  jsonb_build_object('notifications', '[]'::jsonb, 'updatedAt', now())
WHERE NOT EXISTS (
  SELECT 1 FROM public.contents WHERE title = '__SYSTEM_ADMIN_NOTIFICATIONS__'
);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- SOURCE MIGRATION: 011_security_hardening.sql
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- RUANG SOSMED 2.0 LMS — FULL-STACK SECURITY HARDENING MIGRATION
-- File: supabase/migrations/011_security_hardening.sql
-- Idempotent: aman dijalankan berulang kali di Supabase SQL Editor
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. HAPUS BARIS SISTEM YANG MEMBOCORKAN DATA SENSITIF / PASSWORD PLAINTEXT
-- -----------------------------------------------------------------------------
DELETE FROM public.contents
WHERE title IN (
  '__SYSTEM_USER_PASSWORDS__',
  '__SYSTEM_USER_PROFILE_ADMIN__',
  '__SYSTEM_USER_PROFILE_LEARNER__'
);

-- -----------------------------------------------------------------------------
-- 2. PASTIKAN KOLOM & ROLE FOUNDER ADMIN SINKRON DENGAN SUPABASE AUTH
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS total_points integer NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS header_url text;

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Backfill founder & admin accounts dari auth.users ke public.profiles agar auth.uid() terverifikasi
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  avatar_url,
  role,
  job_title,
  subscription_tier,
  total_points
)
SELECT
  u.id,
  COALESCE(NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
  u.email,
  u.raw_user_meta_data->>'avatar_url',
  'admin'::public.user_role,
  COALESCE(NULLIF(trim(u.raw_user_meta_data->>'job_title'), ''), 'Platform Admin'),
  'pro',
  0
FROM auth.users u
WHERE lower(u.email) IN (
  'contact.dinurpradipta@gmail.com',
  'dinurm.pradipta@gmail.com',
  'dinur@ruangsosmed.id',
  'admin@ruangsosmed.id'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin'::public.user_role,
  subscription_tier = 'pro';

UPDATE public.user_profiles up
SET
  role = 'admin',
  updated_at = timezone('utc', now())
WHERE lower(up.email) IN (
  'contact.dinurpradipta@gmail.com',
  'dinurm.pradipta@gmail.com',
  'dinur@ruangsosmed.id',
  'admin@ruangsosmed.id'
)
OR lower(up.username) IN ('arunika', 'dinur');

-- Hubungkan user_profiles.user_id dengan profiles.id berdasarkan email bila masih null
UPDATE public.user_profiles up
SET user_id = p.id
FROM public.profiles p
WHERE up.user_id IS NULL
  AND lower(trim(up.email)) = lower(trim(p.email));

-- -----------------------------------------------------------------------------
-- 3. HELPER ROLE CHECKERS (SECURITY DEFINER, ANTI RECURSION RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_mentor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin'::public.user_role, 'mentor'::public.user_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_mentor_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_admin_or_mentor();
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin_or_mentor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_mentor() TO authenticated;

REVOKE ALL ON FUNCTION public.is_mentor_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_mentor_or_admin() TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. TABEL ANTREAN VERIFIKASI PEMBAYARAN LEARNER PRO (`pro_upgrade_requests`)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pro_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text NOT NULL,
  package_id text NOT NULL,
  package_name text NOT NULL,
  price_label text NOT NULL,
  payment_method text NOT NULL DEFAULT 'QRIS / Transfer Manual',
  buyer_contact text NOT NULL DEFAULT '',
  proof_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_upgrade_requests_user ON public.pro_upgrade_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pro_upgrade_requests_status ON public.pro_upgrade_requests(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_pro_upgrade_requests_updated_at ON public.pro_upgrade_requests;
CREATE TRIGGER trg_pro_upgrade_requests_updated_at
  BEFORE UPDATE ON public.pro_upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. DROP SEMUA POLICY LAMA YANG TERBUKA (`USING (true)` / `sync_all`) & PERKETAT RLS
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_table text;
  v_pol record;
  v_tables text[] := ARRAY[
    'profiles',
    'user_profiles',
    'user_subscriptions',
    'pro_upgrade_requests',
    'contents',
    'course_sections',
    'course_chapters',
    'projects',
    'enrollments',
    'submissions',
    'landing_pages',
    'learner_pro_settings',
    'mentor_inbox_threads',
    'mentor_reported_issues',
    'lms_courses',
    'lms_class_results',
    'public_content_revisions',
    'lesson_notes',
    'lesson_progress'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
      FOR v_pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_table
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_pol.policyname, v_table);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 5A. profiles (STRICT: user hanya lihat/edit profil sendiri; Admin/Mentor lihat semua)
CREATE POLICY "profiles_select_own_or_staff"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_mentor());

CREATE POLICY "profiles_insert_own_or_admin"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_delete_admin_only"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5B. user_profiles (STRICT: no anon read; user hanya akses miliknya)
CREATE POLICY "user_profiles_select_own_or_staff"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin_or_mentor()
  );

CREATE POLICY "user_profiles_insert_own_or_admin"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin()
  );

CREATE POLICY "user_profiles_update_own_or_admin"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin()
  );

CREATE POLICY "user_profiles_delete_admin_only"
  ON public.user_profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5C. user_subscriptions
CREATE POLICY "user_subscriptions_select_own_or_staff"
  ON public.user_subscriptions FOR SELECT TO authenticated
  USING (
    public.is_admin_or_mentor()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE lower(up.username) = lower(user_subscriptions.username)
        AND (
          up.user_id = auth.uid()
          OR lower(up.email) = lower(COALESCE(auth.jwt()->>'email', ''))
        )
    )
  );

CREATE POLICY "user_subscriptions_write_admin_only"
  ON public.user_subscriptions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5D. pro_upgrade_requests
CREATE POLICY "pro_requests_select_own_or_admin"
  ON public.pro_upgrade_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "pro_requests_insert_own_pending"
  ON public.pro_upgrade_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "pro_requests_update_admin_only"
  ON public.pro_upgrade_requests FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "pro_requests_delete_admin_only"
  ON public.pro_upgrade_requests FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5E. contents (sembunyikan __SYSTEM_ADMIN_NOTIFICATIONS__ & __SYSTEM_USER_*__ dari non-staff, izinkan konfigurasi non-PII)
CREATE POLICY "contents_select_public_catalog"
  ON public.contents FOR SELECT TO anon, authenticated
  USING (
    (status = 'published'::public.content_status AND title NOT LIKE '__SYSTEM_%')
    OR title = '__SYSTEM_MAINTENANCE_CONFIG__'
  );

CREATE POLICY "contents_select_authenticated_and_staff"
  ON public.contents FOR SELECT TO authenticated
  USING (
    public.is_admin_or_mentor()
    OR title IN (
      '__SYSTEM_COHORT_PROJECTS__',
      '__SYSTEM_EXPLORER_FOLDERS__',
      '__SYSTEM_REWARDS_CATALOG__',
      '__SYSTEM_CERTIFICATE_CONFIG__',
      '__SYSTEM_LEARNER_PRO_CONFIG__'
    )
    OR EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.content_id = contents.id
        AND e.learner_id = auth.uid()
    )
  );

CREATE POLICY "contents_write_staff_only"
  ON public.contents FOR ALL TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

-- 5F. course_sections & course_chapters
CREATE POLICY "course_sections_select_accessible"
  ON public.course_sections FOR SELECT TO authenticated
  USING (
    public.is_admin_or_mentor()
    OR EXISTS (
      SELECT 1
      FROM public.contents c
      WHERE c.id = course_sections.content_id
        AND (
          c.status = 'published'::public.content_status
          OR EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.content_id = c.id AND e.learner_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "course_sections_write_staff_only"
  ON public.course_sections FOR ALL TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

CREATE POLICY "course_chapters_select_accessible"
  ON public.course_chapters FOR SELECT TO authenticated
  USING (
    public.is_admin_or_mentor()
    OR EXISTS (
      SELECT 1
      FROM public.contents c
      WHERE c.id = course_chapters.content_id
        AND (
          c.status = 'published'::public.content_status
          OR EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.content_id = c.id AND e.learner_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "course_chapters_write_staff_only"
  ON public.course_chapters FOR ALL TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

-- 5G. projects
CREATE POLICY "projects_select_authenticated"
  ON public.projects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "projects_write_staff_only"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

-- 5H. enrollments & submissions
CREATE POLICY "enrollments_select_own_or_staff"
  ON public.enrollments FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR public.is_admin_or_mentor());

CREATE POLICY "enrollments_insert_own_or_staff"
  ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid() OR public.is_admin_or_mentor());

CREATE POLICY "enrollments_update_own_or_staff"
  ON public.enrollments FOR UPDATE TO authenticated
  USING (learner_id = auth.uid() OR public.is_admin_or_mentor())
  WITH CHECK (learner_id = auth.uid() OR public.is_admin_or_mentor());

CREATE POLICY "enrollments_delete_staff_only"
  ON public.enrollments FOR DELETE TO authenticated
  USING (public.is_admin_or_mentor());

CREATE POLICY "submissions_select_own_or_staff"
  ON public.submissions FOR SELECT TO authenticated
  USING (learner_id = auth.uid() OR public.is_admin_or_mentor());

CREATE POLICY "submissions_insert_own_or_staff"
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (learner_id = auth.uid() OR public.is_admin_or_mentor());

CREATE POLICY "submissions_update_staff_only"
  ON public.submissions FOR UPDATE TO authenticated
  USING (public.is_admin_or_mentor())
  WITH CHECK (public.is_admin_or_mentor());

CREATE POLICY "submissions_delete_staff_only"
  ON public.submissions FOR DELETE TO authenticated
  USING (public.is_admin_or_mentor());

-- 5I. landing_pages & learner_pro_settings (hanya Admin/Mentor bisa edit; publik hanya baca yang published)
DO $$
BEGIN
  IF to_regclass('public.landing_pages') IS NOT NULL THEN
    CREATE POLICY "landing_pages_select_published_or_staff"
      ON public.landing_pages FOR SELECT TO anon, authenticated
      USING (lower(status) = 'published' OR public.is_admin_or_mentor());

    CREATE POLICY "landing_pages_write_staff_only"
      ON public.landing_pages FOR ALL TO authenticated
      USING (public.is_admin_or_mentor())
      WITH CHECK (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.learner_pro_settings') IS NOT NULL THEN
    CREATE POLICY "learner_pro_settings_select_authenticated"
      ON public.learner_pro_settings FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "learner_pro_settings_write_admin_only"
      ON public.learner_pro_settings FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF to_regclass('public.mentor_inbox_threads') IS NOT NULL THEN
    CREATE POLICY "mentor_inbox_threads_select_auth"
      ON public.mentor_inbox_threads FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "mentor_inbox_threads_insert_auth"
      ON public.mentor_inbox_threads FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "mentor_inbox_threads_update_auth"
      ON public.mentor_inbox_threads FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "mentor_inbox_threads_delete_staff"
      ON public.mentor_inbox_threads FOR DELETE TO authenticated
      USING (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.mentor_reported_issues') IS NOT NULL THEN
    CREATE POLICY "mentor_reported_issues_select_auth"
      ON public.mentor_reported_issues FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "mentor_reported_issues_insert_auth"
      ON public.mentor_reported_issues FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "mentor_reported_issues_update_staff"
      ON public.mentor_reported_issues FOR UPDATE TO authenticated
      USING (public.is_admin_or_mentor())
      WITH CHECK (public.is_admin_or_mentor());

    CREATE POLICY "mentor_reported_issues_delete_staff"
      ON public.mentor_reported_issues FOR DELETE TO authenticated
      USING (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.lms_courses') IS NOT NULL THEN
    CREATE POLICY "lms_courses_select_published_or_staff"
      ON public.lms_courses FOR SELECT TO anon, authenticated
      USING (published = true OR public.is_admin_or_mentor());

    CREATE POLICY "lms_courses_write_staff"
      ON public.lms_courses FOR ALL TO authenticated
      USING (public.is_admin_or_mentor())
      WITH CHECK (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.lms_class_results') IS NOT NULL THEN
    CREATE POLICY "lms_class_results_select_staff_only"
      ON public.lms_class_results FOR SELECT TO authenticated
      USING (public.is_admin_or_mentor());

    CREATE POLICY "lms_class_results_insert_auth"
      ON public.lms_class_results FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "lms_class_results_write_staff"
      ON public.lms_class_results FOR UPDATE TO authenticated
      USING (public.is_admin_or_mentor())
      WITH CHECK (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.public_content_revisions') IS NOT NULL THEN
    CREATE POLICY "revisions_select_public"
      ON public.public_content_revisions FOR SELECT TO anon, authenticated
      USING (true);

    CREATE POLICY "revisions_write_staff"
      ON public.public_content_revisions FOR ALL TO authenticated
      USING (public.is_admin_or_mentor())
      WITH CHECK (public.is_admin_or_mentor());
  END IF;

  IF to_regclass('public.lesson_notes') IS NOT NULL THEN
    CREATE POLICY "lesson_notes_own_or_staff"
      ON public.lesson_notes FOR ALL TO authenticated
      USING (
        public.is_admin_or_mentor()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE lower(up.username) = lower(lesson_notes.username)
            AND (up.user_id = auth.uid() OR lower(up.email) = lower(COALESCE(auth.jwt()->>'email', '')))
        )
      )
      WITH CHECK (
        public.is_admin_or_mentor()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE lower(up.username) = lower(lesson_notes.username)
            AND (up.user_id = auth.uid() OR lower(up.email) = lower(COALESCE(auth.jwt()->>'email', '')))
        )
      );
  END IF;

  IF to_regclass('public.lesson_progress') IS NOT NULL THEN
    CREATE POLICY "lesson_progress_own_or_staff"
      ON public.lesson_progress FOR ALL TO authenticated
      USING (
        public.is_admin_or_mentor()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE lower(up.username) = lower(lesson_progress.session_username)
            AND (up.user_id = auth.uid() OR lower(up.email) = lower(COALESCE(auth.jwt()->>'email', '')))
        )
      )
      WITH CHECK (
        public.is_admin_or_mentor()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE lower(up.username) = lower(lesson_progress.session_username)
            AND (up.user_id = auth.uid() OR lower(up.email) = lower(COALESCE(auth.jwt()->>'email', '')))
        )
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. TRIGGER PROTEKSI KOLOM SENSITIF & NORMALISASI SIGNUP
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profiles_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass boolean := (
    current_setting('app.bypass_profile_protection', true) = 'on'
    OR current_user IN ('postgres', 'supabase_admin')
    OR auth.role() = 'service_role'
    OR public.is_admin()
  );
BEGIN
  IF v_bypass THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'learner'::public.user_role;
    NEW.subscription_tier := 'free';
    NEW.total_points := 0;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
       OR NEW.total_points IS DISTINCT FROM OLD.total_points THEN
      RAISE EXCEPTION 'Forbidden: only verified admin can modify role, subscription_tier, or total_points';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profiles_sensitive_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_sensitive_fields();

CREATE OR REPLACE FUNCTION public.protect_user_profiles_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bypass boolean := (
    current_setting('app.bypass_profile_protection', true) = 'on'
    OR current_user IN ('postgres', 'supabase_admin')
    OR auth.role() = 'service_role'
    OR public.is_admin()
  );
BEGIN
  IF v_bypass THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'learner';
    NEW.perks := COALESCE(NEW.perks, '{}'::jsonb) - 'is_pro' - 'tier';
    NEW.referral_perks := '{}'::jsonb;
    NEW.referral_perks_expires_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR (COALESCE(NEW.perks, '{}'::jsonb)->>'is_pro') IS DISTINCT FROM (COALESCE(OLD.perks, '{}'::jsonb)->>'is_pro')
       OR (COALESCE(NEW.perks, '{}'::jsonb)->>'tier') IS DISTINCT FROM (COALESCE(OLD.perks, '{}'::jsonb)->>'tier')
       OR NEW.referral_perks IS DISTINCT FROM OLD.referral_perks
       OR NEW.referral_perks_expires_at IS DISTINCT FROM OLD.referral_perks_expires_at
       OR (to_jsonb(NEW)->>'points') IS DISTINCT FROM (to_jsonb(OLD)->>'points') THEN
      RAISE EXCEPTION 'Forbidden: only verified admin can modify protected user_profile fields';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_profiles_sensitive_fields ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profiles_sensitive_fields
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_profiles_sensitive_fields();

-- Paksa semua pendaftar baru memiliki role='learner', subscription_tier='free', total_points=0
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  INSERT INTO public.profiles (
    id, full_name, email, avatar_url, role, job_title, subscription_tier, total_points
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    'learner'::public.user_role,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'job_title'), ''), 'Social Media Specialist'),
    'free',
    0
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 7. NOTIFIKASI ADMIN INTERNAL (HANYA VIA TRIGGER / RPC AMAN, NO DIRECT WRITE)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._append_admin_notification(p_notif jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_id uuid;
  v_existing jsonb;
  v_next jsonb;
BEGIN
  SELECT id, COALESCE(settings_json->'notifications', '[]'::jsonb)
  INTO v_row_id, v_existing
  FROM public.contents
  WHERE title = '__SYSTEM_ADMIN_NOTIFICATIONS__'
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF jsonb_typeof(v_existing) <> 'array' THEN
    v_existing := '[]'::jsonb;
  END IF;

  WITH combined AS (
    SELECT elem, 0 AS prio, 0 AS ord FROM (SELECT p_notif AS elem) n
    UNION ALL
    SELECT elem, 1 AS prio, ord::integer FROM jsonb_array_elements(v_existing) WITH ORDINALITY AS t(elem, ord)
    WHERE elem->>'id' IS DISTINCT FROM p_notif->>'id'
  ),
  limited AS (
    SELECT elem FROM combined ORDER BY prio ASC, ord ASC LIMIT 80
  )
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_next FROM limited;

  IF v_row_id IS NULL THEN
    INSERT INTO public.contents (
      id, title, type, status, description, urgency, estimated_minutes, points_reward, settings_json
    ) VALUES (
      gen_random_uuid(),
      '__SYSTEM_ADMIN_NOTIFICATIONS__',
      'page',
      'published',
      'System storage for Admin activity notifications',
      'not_urgent',
      0,
      0,
      jsonb_build_object('notifications', v_next, 'updatedAt', now())
    );
  ELSE
    UPDATE public.contents
    SET
      settings_json = jsonb_build_object('notifications', v_next, 'updatedAt', now()),
      updated_at = now()
    WHERE id = v_row_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._append_admin_notification(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_admin_on_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text := COALESCE(NULLIF(trim(NEW.full_name), ''), split_part(COALESCE(NEW.email, 'Learner'), '@', 1));
BEGIN
  IF NEW.role = 'learner'::public.user_role THEN
    PERFORM public._append_admin_notification(
      jsonb_build_object(
        'id', 'notif-signup-' || NEW.id::text,
        'eventType', 'user_registered',
        'title', 'Say, Hi! 🎉 Member Baru Bergabung',
        'message', format('Say, Hi! %s telah bergabung ke Ruang Sosmed 2.0. Yuk sambut member baru dan bantu mereka memulai perjalanan belajarnya!', v_display_name),
        'userName', v_display_name,
        'userEmail', NEW.email,
        'read', false,
        'createdAt', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_new_profile ON public.profiles;
CREATE TRIGGER trg_notify_admin_on_new_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_new_profile();

-- -----------------------------------------------------------------------------
-- 8. HARDENED RPCs (EXPLICIT CALLER VERIFICATION + PROTECTION BYPASS)
-- -----------------------------------------------------------------------------

-- 8A. Submit PRO upgrade request (Learner hanya bisa membuat status 'pending')
CREATE OR REPLACE FUNCTION public.submit_pro_upgrade_request(
  p_user_name text,
  p_package_id text,
  p_package_name text,
  p_price_label text,
  p_payment_method text DEFAULT 'QRIS / Transfer Manual',
  p_buyer_contact text DEFAULT '',
  p_proof_url text DEFAULT NULL
)
RETURNS public.pro_upgrade_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_req public.pro_upgrade_requests;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: login required';
  END IF;

  SELECT email, COALESCE(NULLIF(trim(p_user_name), ''), full_name, split_part(email, '@', 1))
  INTO v_email, v_name
  FROM public.profiles
  WHERE id = v_uid;

  v_email := COALESCE(v_email, auth.jwt()->>'email', '');
  v_name := COALESCE(NULLIF(trim(v_name), ''), NULLIF(trim(p_user_name), ''), split_part(v_email, '@', 1), 'Learner');

  IF v_email = '' THEN
    RAISE EXCEPTION 'Profile email not found';
  END IF;

  INSERT INTO public.pro_upgrade_requests (
    user_id, user_email, user_name, package_id, package_name, price_label,
    payment_method, buyer_contact, proof_url, status
  ) VALUES (
    v_uid,
    v_email,
    v_name,
    COALESCE(NULLIF(trim(p_package_id), ''), 'pro-monthly'),
    COALESCE(NULLIF(trim(p_package_name), ''), 'Learner PRO Monthly'),
    COALESCE(NULLIF(trim(p_price_label), ''), 'Rp 149.000'),
    COALESCE(NULLIF(trim(p_payment_method), ''), 'QRIS / Transfer Manual'),
    COALESCE(trim(p_buyer_contact), ''),
    NULLIF(trim(COALESCE(p_proof_url, '')), ''),
    'pending'
  )
  RETURNING * INTO v_req;

  PERFORM public._append_admin_notification(
    jsonb_build_object(
      'id', 'notif-pro-req-' || v_req.id::text,
      'eventType', 'pro_subscribed',
      'title', 'Konfirmasi Pembayaran PRO Baru',
      'message', format(
        'Yuhuu ... %s telah mengajukan pembayaran paket %s (%s). Verifikasi pembayaran di Daftar Akun sebelum mengaktifkan akses PRO.',
        v_name,
        v_req.package_name,
        v_req.price_label
      ),
      'userName', v_name,
      'userEmail', v_email,
      'packageName', v_req.package_name,
      'priceLabel', v_req.price_label,
      'requestId', v_req.id,
      'read', false,
      'createdAt', now()
    )
  );

  RETURN v_req;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_pro_upgrade_request(text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_pro_upgrade_request(text, text, text, text, text, text, text) TO authenticated;

-- 8B. Admin password reset (hanya Admin terautentikasi, min 6 karakter)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_identifier text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_clean_id text := lower(trim(COALESCE(p_identifier, '')));
  v_target_uid uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_id = '' OR length(trim(COALESCE(p_new_password, ''))) < 6 THEN
    RETURN false;
  END IF;

  SELECT u.id
  INTO v_target_uid
  FROM auth.users u
  WHERE lower(u.email) = v_clean_id
     OR lower(COALESCE(u.raw_user_meta_data->>'username', '')) = v_clean_id
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_target_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = crypt(trim(p_new_password), gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE id = v_target_uid;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_user_password(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(text, text) TO authenticated;

-- 8C. Admin approve / grant / revoke Learner PRO
CREATE OR REPLACE FUNCTION public.admin_set_learner_pro(
  p_target_email text,
  p_target_name text,
  p_is_pro boolean,
  p_package_name text DEFAULT 'Learner PRO Monthly',
  p_request_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_name text := COALESCE(NULLIF(trim(p_target_name), ''), split_part(v_clean_email, '@', 1), 'Learner');
  v_pkg text := COALESCE(NULLIF(trim(p_package_name), ''), 'Learner PRO Monthly');
  v_username text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET subscription_tier = CASE WHEN p_is_pro THEN 'pro' ELSE 'free' END
  WHERE lower(email) = v_clean_email;

  UPDATE public.user_profiles
  SET
    perks = jsonb_set(COALESCE(perks, '{}'::jsonb), '{is_pro}', to_jsonb(p_is_pro), true),
    updated_at = timezone('utc', now())
  WHERE lower(email) = v_clean_email
  RETURNING username INTO v_username;

  IF v_username IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (
      username, plan_tier, status, started_at, due_at, payment_method, renewal_status, updated_at
    ) VALUES (
      v_username,
      CASE WHEN p_is_pro THEN 'PRO' ELSE 'Free' END,
      CASE WHEN p_is_pro THEN 'aktif' ELSE 'nonaktif' END,
      current_date,
      current_date + 30,
      'admin verified',
      CASE WHEN p_is_pro THEN 'siap diperpanjang' ELSE 'nonaktif' END,
      timezone('utc', now())
    )
    ON CONFLICT (username) DO UPDATE SET
      plan_tier = EXCLUDED.plan_tier,
      status = EXCLUDED.status,
      started_at = EXCLUDED.started_at,
      due_at = EXCLUDED.due_at,
      payment_method = EXCLUDED.payment_method,
      renewal_status = EXCLUDED.renewal_status,
      updated_at = timezone('utc', now());
  END IF;

  IF p_request_id IS NOT NULL THEN
    UPDATE public.pro_upgrade_requests
    SET
      status = CASE WHEN p_is_pro THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = p_request_id;
  END IF;

  IF p_is_pro THEN
    PERFORM public._append_admin_notification(
      jsonb_build_object(
        'id', 'notif-pro-active-' || encode(convert_to(v_clean_email || '-' || extract(epoch from now())::text, 'UTF8'), 'hex'),
        'eventType', 'pro_subscribed',
        'title', 'Yuhuu! ⚡ Langganan PRO Aktif',
        'message', format('Yuhuu! %s telah berlangganan dan mengambil paket %s. Akses fitur eksklusifnya sudah aktif dan siap digunakan!', v_clean_name, v_pkg),
        'userName', v_clean_name,
        'userEmail', v_clean_email,
        'packageName', v_pkg,
        'read', false,
        'createdAt', now()
      )
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_learner_pro(text, text, boolean, text, uuid) TO authenticated;

-- 8C-2. Learner menukar poin dengan hadiah secara atomik via RPC
CREATE OR REPLACE FUNCTION public.redeem_learner_points(
  p_points_cost integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR COALESCE(p_points_cost, 0) <= 0 THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET total_points = total_points - p_points_cost
  WHERE id = v_uid
    AND total_points >= p_points_cost;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_learner_points(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_learner_points(integer) TO authenticated;

-- 8D. Admin ubah role anggota (`admin` / `mentor` / `learner`)
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_target_email text,
  p_new_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text := lower(trim(COALESCE(p_target_email, '')));
  v_clean_role text := lower(trim(COALESCE(p_new_role, '')));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  IF v_clean_email = '' OR v_clean_role NOT IN ('admin', 'mentor', 'learner') THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET role = v_clean_role::public.user_role
  WHERE lower(email) = v_clean_email;

  UPDATE public.user_profiles
  SET
    role = v_clean_role,
    updated_at = timezone('utc', now())
  WHERE lower(email) = v_clean_email;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(text, text) TO authenticated;

-- 8E. Staff ubah poin learner (menggantikan update langsung ke tabel profiles)
CREATE OR REPLACE FUNCTION public.admin_adjust_learner_points(
  p_target_id uuid,
  p_new_points integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_mentor() THEN
    RAISE EXCEPTION 'Forbidden: Staff access required';
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.profiles
  SET total_points = GREATEST(0, COALESCE(p_new_points, 0))
  WHERE id = p_target_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_learner_points(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_learner_points(uuid, integer) TO authenticated;

-- 8F. Hardening RPC lama (`upsert_user_subscription`, `complete_chapter_and_award_points`, `grade_submission_and_update_enrollment`)
CREATE OR REPLACE FUNCTION public.upsert_user_subscription(
  p_username text,
  p_status text,
  p_started_at date,
  p_due_at date,
  p_payment_method text,
  p_renewal_status text
)
RETURNS public.user_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_row public.user_subscriptions;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  INSERT INTO public.user_subscriptions (
    username, status, started_at, due_at, payment_method, renewal_status, updated_at
  )
  VALUES (
    lower(trim(p_username)),
    coalesce(nullif(trim(p_status), ''), 'aktif'),
    coalesce(p_started_at, current_date),
    coalesce(p_due_at, current_date + 30),
    coalesce(nullif(trim(p_payment_method), ''), 'admin verified'),
    coalesce(nullif(trim(p_renewal_status), ''), 'siap diperpanjang'),
    timezone('utc', now())
  )
  ON CONFLICT (username) DO UPDATE SET
    status = excluded.status,
    started_at = excluded.started_at,
    due_at = excluded.due_at,
    payment_method = excluded.payment_method,
    renewal_status = excluded.renewal_status,
    updated_at = timezone('utc', now())
  RETURNING * INTO subscription_row;

  RETURN subscription_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_user_subscription(text, text, date, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_subscription(text, text, date, date, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_chapter_and_award_points(
  p_content_id uuid,
  p_chapter_id uuid,
  p_learner_id uuid
)
RETURNS public.enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment public.enrollments;
  v_total_chapters integer;
  v_completed_count integer;
  v_chapter_points integer;
  v_new_progress integer;
BEGIN
  IF auth.uid() IS NULL
     OR (auth.uid() <> p_learner_id AND NOT public.is_admin_or_mentor()) THEN
    RAISE EXCEPTION 'Unauthorized chapter completion update';
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  SELECT COALESCE(points, 10)
    INTO v_chapter_points
    FROM public.course_chapters
   WHERE id = p_chapter_id;

  SELECT COUNT(*)
    INTO v_total_chapters
    FROM public.course_chapters
   WHERE content_id = p_content_id;

  IF v_total_chapters = 0 THEN
    v_total_chapters := 1;
  END IF;

  INSERT INTO public.enrollments (content_id, learner_id, status, progress_percent, completed_chapter_ids)
  VALUES (p_content_id, p_learner_id, 'in_progress', 0, ARRAY[]::uuid[])
  ON CONFLICT (content_id, learner_id) DO NOTHING;

  SELECT *
    INTO v_enrollment
    FROM public.enrollments
   WHERE content_id = p_content_id
     AND learner_id = p_learner_id
   FOR UPDATE;

  IF NOT (p_chapter_id = ANY(v_enrollment.completed_chapter_ids)) THEN
    v_enrollment.completed_chapter_ids := array_append(v_enrollment.completed_chapter_ids, p_chapter_id);
    v_completed_count := COALESCE(array_length(v_enrollment.completed_chapter_ids, 1), 0);
    v_new_progress := least(100, round((v_completed_count::numeric / v_total_chapters::numeric) * 100)::integer);

    UPDATE public.enrollments
       SET completed_chapter_ids = v_enrollment.completed_chapter_ids,
           progress_percent = v_new_progress,
           status = CASE WHEN v_new_progress >= 100 THEN 'passed'::public.enrollment_status ELSE 'in_progress'::public.enrollment_status END,
           updated_at = now()
     WHERE id = v_enrollment.id
     RETURNING * INTO v_enrollment;

    UPDATE public.profiles
       SET total_points = total_points + COALESCE(v_chapter_points, 10)
     WHERE id = p_learner_id;
  END IF;

  RETURN v_enrollment;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_chapter_and_award_points(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_chapter_and_award_points(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.grade_submission_and_update_enrollment(
  p_submission_id uuid,
  p_grading_status public.grading_status,
  p_score_percent integer,
  p_mentor_feedback text
)
RETURNS public.submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.submissions;
  v_points_reward integer;
BEGIN
  IF NOT public.is_admin_or_mentor() THEN
    RAISE EXCEPTION 'Only mentors or admins can grade submissions';
  END IF;

  PERFORM set_config('app.bypass_profile_protection', 'on', true);

  UPDATE public.submissions
     SET grading_status = p_grading_status,
         score_percent = greatest(0, least(100, p_score_percent)),
         mentor_feedback = p_mentor_feedback,
         graded_at = now(),
         graded_by = auth.uid()
   WHERE id = p_submission_id
   RETURNING * INTO v_sub;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission % not found', p_submission_id;
  END IF;

  IF p_grading_status = 'passed' THEN
    SELECT COALESCE(points_reward, 100)
      INTO v_points_reward
      FROM public.contents
     WHERE id = v_sub.content_id;

    UPDATE public.enrollments
       SET status = 'passed',
           progress_percent = 100,
           updated_at = now()
     WHERE content_id = v_sub.content_id
       AND learner_id = v_sub.learner_id;

    UPDATE public.profiles
       SET total_points = total_points + v_points_reward
     WHERE id = v_sub.learner_id;
  ELSIF p_grading_status = 'failed' THEN
    UPDATE public.enrollments
       SET status = 'failed',
           updated_at = now()
     WHERE content_id = v_sub.content_id
       AND learner_id = v_sub.learner_id;
  END IF;

  RETURN v_sub;
END;
$$;

REVOKE ALL ON FUNCTION public.grade_submission_and_update_enrollment(uuid, public.grading_status, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grade_submission_and_update_enrollment(uuid, public.grading_status, integer, text) TO authenticated;
