-- =============================================================================
-- RUANG SOSMED 2.0 — FIX SINKRONISASI KONTEN ADMIN ➜ LEARNER
-- File: supabase/fix_content_sync.sql
--
-- Jalankan SEKALI di Supabase Dashboard ➜ SQL Editor ➜ Run.
-- Aman dijalankan berulang (idempotent).
-- =============================================================================

-- 1. Pastikan akun developer/admin memiliki role 'admin' di public.profiles
--    (syarat RLS `contents_crud_mentor_admin` agar admin boleh INSERT/UPDATE/DELETE konten)
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', 'arunika'), 'admin'
  from auth.users u
 where u.email = 'contact.dinurpradipta@gmail.com'
on conflict (id) do update set role = 'admin';

-- 2. Learner (login maupun belum) boleh MEMBACA konten yang sudah dipublish
drop policy if exists "contents_select_published_anon" on public.contents;
create policy "contents_select_published_anon"
  on public.contents for select to anon
  using (status = 'published');

-- 3. Bersihkan baris dummy lama di tabel contents (jika ada)
delete from public.contents
 where lower(title) in (
   'social media strategy: 10 principles to boost brand engagement',
   'social media analytics & campaign fundamentals',
   'content pillars & audience persona playbook',
   'content pillars & audience persona',
   'mastering instagram carousel & viral hook strategy',
   'audit akun instagram & bio optimization',
   'audit akun instagram & bio optimization capstone',
   'quiz algoritma reels & tiktok retention',
   'full-stack social media specialist roadmap',
   'sop crisis management & community moderation',
   'ruang sosmed 2.0 student resource & sop directory'
 );

-- 4. Pastikan kursus "Fundamental Social Media Specialist" terdaftar dan berstatus 'published'
insert into public.contents (
  id,
  type,
  title,
  description,
  points_reward,
  status,
  urgency,
  category_tags,
  settings_json
) values (
  'c0000001-0000-4000-8000-000000000001',
  'course',
  'Fundamental Social Media Specialist',
  'Materi pembelajaran Fundamental Social Media Specialist Ruang Sosmed 2.0.',
  100,
  'published',
  'not_urgent',
  array['Social Media Strategy', 'Course'],
  '{
    "pass_mark": 80,
    "pass_unit": "percent",
    "curriculum": [
      {
        "id": "csec-fund-1",
        "sectionTitle": "Section 1: Fundamental",
        "shortTitle": "Sec 1",
        "chapters": [
          {
            "id": "cch-fund-101",
            "title": "Pengenalan Social Media Specialist",
            "type": "Lesson",
            "duration": "15 Mins",
            "completed": false,
            "locked": false,
            "points": 10,
            "videoTitle": "Pengenalan Social Media Specialist",
            "videoDuration": "15:00",
            "videoUrl": "https://youtu.be/cMpdNfPTKT0",
            "videoMode": "embed",
            "isPro": false,
            "contentParagraphs": [
              "Selamat datang di kelas Fundamental Social Media Specialist Ruang Sosmed 2.0."
            ],
            "calloutTip": "Tips: Pelajari dasar pilar konten sebelum memproduksi konten harian.",
            "attachments": []
          }
        ]
      }
    ]
  }'::jsonb
)
on conflict (id) do update set
  status = 'published',
  title = excluded.title,
  settings_json = excluded.settings_json;

-- 5. Cek hasil: daftar konten published yang akan tampil di halaman Learner
select id, type, title, status, created_at
  from public.contents
 where status = 'published'
 order by created_at desc;
