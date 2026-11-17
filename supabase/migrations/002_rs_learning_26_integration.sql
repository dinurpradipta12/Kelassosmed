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
