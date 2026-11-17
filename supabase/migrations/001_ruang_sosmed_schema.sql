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
    'wiki'
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
