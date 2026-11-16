-- =====================================================================
-- FYNDO V4: Fyndo's own place photos (free, stored in Supabase Storage).
-- How to use: Supabase > SQL Editor > New query > paste this WHOLE file > Run. Safe to run again.
-- Needs schema.sql (and schema_v3.sql) first.
-- =====================================================================

-- Photo links for each place (public URLs in the "spot-photos" bucket), first one is the cover.
alter table public.spots add column if not exists photos text[] not null default '{}';

-- Public bucket: anyone can view; max 2 MB per photo; images only.
insert into storage.buckets (id, name, public) values ('spot-photos', 'spot-photos', true)
  on conflict (id) do update set public = true;
update storage.buckets set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'spot-photos';

-- Files live in a folder named after the place: <spot id>/<file>.jpg
-- Only admins, or the owner of that place, can add or remove its photos.
drop policy if exists "spot photos read" on storage.objects;
create policy "spot photos read" on storage.objects for select
  using (bucket_id = 'spot-photos');

drop policy if exists "spot photos add" on storage.objects;
create policy "spot photos add" on storage.objects for insert to authenticated
  with check (bucket_id = 'spot-photos' and (
    public.is_admin()
    or exists (select 1 from public.spots s where s.id = (storage.foldername(name))[1] and s.owner_id = auth.uid())));

drop policy if exists "spot photos remove" on storage.objects;
create policy "spot photos remove" on storage.objects for delete to authenticated
  using (bucket_id = 'spot-photos' and (
    public.is_admin()
    or exists (select 1 from public.spots s where s.id = (storage.foldername(name))[1] and s.owner_id = auth.uid())));
