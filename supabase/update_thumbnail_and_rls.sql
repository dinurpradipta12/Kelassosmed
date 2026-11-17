-- =============================================================================
-- RUANG SOSMED 2.0 — PERMANENT THUMBNAIL UPDATE & RLS PERMISSIONS
-- File: supabase/update_thumbnail_and_rls.sql
--
-- Jalankan di Supabase Dashboard ➜ SQL Editor ➜ Run.
-- =============================================================================

-- 1. Berikan izin UPDATE pada tabel public.contents agar perubahan thumbnail
--    dari antarmuka admin/studio dapat langsung tersimpan ke Supabase tanpa ditolak RLS.
drop policy if exists "contents_update_all_roles" on public.contents;
create policy "contents_update_all_roles"
  on public.contents for update
  using (true)
  with check (true);

-- 2. Pastikan kolom thumbnail_url ada pada public.contents
alter table public.contents add column if not exists thumbnail_url text;

-- 3. Set cover default untuk kursus 'Fundamental Social Media Specialist'
--    (atau ganti '/thumbnail/thumbnail1.png' dengan nomor thumbnail pilihan Anda)
update public.contents
   set thumbnail_url = coalesce(nullif(thumbnail_url, ''), '/thumbnail/thumbnail1.png'),
       settings_json = jsonb_set(
         coalesce(settings_json, '{}'::jsonb),
         '{explorer_meta,thumbnailUrl}',
         '"/thumbnail/thumbnail1.png"'
       )
 where lower(title) like '%fundamental social media specialist%';

-- 4. Verifikasi baris kursus setelah di-update
select id, title, type, status, thumbnail_url, settings_json->'explorer_meta'->>'thumbnailUrl' as meta_thumbnail
  from public.contents
 where lower(title) like '%fundamental social media specialist%';
