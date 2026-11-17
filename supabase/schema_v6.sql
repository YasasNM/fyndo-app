-- =====================================================================
-- FYNDO V6: official links and embeds, the photo pipeline, visitor photos.
-- How to use: Supabase > SQL Editor > New query > paste this WHOLE file > Run. Safe to run again.
-- Needs schema.sql, schema_v3.sql, schema_v4.sql and schema_v5.sql first.
-- =====================================================================

-- ---------- official links (found by the pipeline or typed by the owner/admin) ----------
alter table public.spots add column if not exists facebook_url text not null default '';
alter table public.spots add column if not exists instagram_url text not null default '';
-- Up to 6 links to the place's own public Instagram posts, shown as official Instagram embeds.
alter table public.spots add column if not exists instagram_posts text[] not null default '{}';
-- When the weekly pipeline last looked at this place (so it doesn't repeat work).
alter table public.spots add column if not exists links_checked_at timestamptz;
alter table public.spots add column if not exists photos_checked_at timestamptz;

-- ---------- suggestions the pipeline found for an admin to check (menus, price ranges) ----------
create table if not exists public.spot_suggestions (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null references public.spots(id) on delete cascade,
  kind text not null check (kind in ('menu', 'price')),
  data jsonb not null,
  source_url text not null default '',
  status text not null default 'new' check (status in ('new', 'applied', 'dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists spot_suggestions_new on public.spot_suggestions (status, created_at desc);
alter table public.spot_suggestions enable row level security;
drop policy if exists "suggestions admin" on public.spot_suggestions;
create policy "suggestions admin" on public.spot_suggestions for all using (public.is_admin()) with check (public.is_admin());
grant select, update, delete on public.spot_suggestions to authenticated;
-- The pipeline writes with the service role key, which RLS does not apply to.

-- ---------- photos sent by visitors, checked by an admin before they go live ----------
create table if not exists public.photo_submissions (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null references public.spots(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  path text not null,
  caption text not null default '' check (char_length(caption) <= 140),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists photo_submissions_pending on public.photo_submissions (status, created_at desc);

-- Visitors can send and see their own; only admins change the status.
create or replace function public.protect_photo_submission() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid(); new.status := 'pending'; new.reviewed_at := null;
    if (select count(*) from public.photo_submissions where user_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then
      raise exception 'You have sent a lot of photos today. Please try again tomorrow.';
    end if;
    return new;
  end if;
  raise exception 'Not allowed.';
end $$;
drop trigger if exists protect_photo_submission on public.photo_submissions;
create trigger protect_photo_submission before insert or update on public.photo_submissions
  for each row execute function public.protect_photo_submission();

alter table public.photo_submissions enable row level security;
drop policy if exists "submissions read" on public.photo_submissions;
create policy "submissions read" on public.photo_submissions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "submissions insert" on public.photo_submissions;
create policy "submissions insert" on public.photo_submissions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "submissions admin" on public.photo_submissions;
create policy "submissions admin" on public.photo_submissions for update using (public.is_admin());
drop policy if exists "submissions admin delete" on public.photo_submissions;
create policy "submissions admin delete" on public.photo_submissions for delete using (public.is_admin());
grant select, insert, update, delete on public.photo_submissions to authenticated;

-- Private bucket: files live under <user id>/<file>. Only the sender and admins can open them.
insert into storage.buckets (id, name, public) values ('user-photos', 'user-photos', false)
  on conflict (id) do update set public = false;
update storage.buckets set file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'user-photos';

drop policy if exists "user photos add" on storage.objects;
create policy "user photos add" on storage.objects for insert to authenticated
  with check (bucket_id = 'user-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "user photos read" on storage.objects;
create policy "user photos read" on storage.objects for select to authenticated
  using (bucket_id = 'user-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "user photos remove" on storage.objects;
create policy "user photos remove" on storage.objects for delete to authenticated
  using (bucket_id = 'user-photos' and public.is_admin());
