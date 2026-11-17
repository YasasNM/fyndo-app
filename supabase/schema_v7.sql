-- =====================================================================
-- FYNDO V7: the social side (like Letterboxd, with no chat):
-- public profiles with photo, bio and Top 4, follows and a friends feed, likes on reviews, people's own lists.
-- How to use: Supabase > SQL Editor > New query > paste this WHOLE file > Run. Safe to run again.
-- Needs schema.sql and schema_v3.sql to v6.sql first.
-- =====================================================================

-- ---------- profiles: the public side ----------
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text not null default '';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists city text not null default '';
alter table public.profiles add column if not exists favorites text[] not null default '{}';
alter table public.profiles add column if not exists is_private boolean not null default false;

do $$ begin
  alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_.]{3,20}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_bio_len check (char_length(bio) <= 160 and char_length(city) <= 40);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_favorites_len check (cardinality(favorites) <= 4);
exception when duplicate_object then null; end $$;
create unique index if not exists profiles_username_unique on public.profiles (lower(username)) where username is not null;

-- Names that would look official or clash with pages.
create or replace function public.check_username() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.username is not null then
    new.username := lower(trim(new.username));
    if new.username in ('admin', 'fyndo', 'support', 'help', 'official', 'owner', 'staff', 'team', 'root', 'me', 'login', 'feed', 'settings') then
      raise exception 'That username is taken. Try another.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists check_username on public.profiles;
create trigger check_username before insert or update of username on public.profiles
  for each row execute function public.check_username();

-- ---------- follows (no chat, just following) ----------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
alter table public.follows enable row level security;
drop policy if exists "follows read" on public.follows;
create policy "follows read" on public.follows for select using (true);
drop policy if exists "follows own" on public.follows;
create policy "follows own" on public.follows for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists "follows unfollow" on public.follows;
create policy "follows unfollow" on public.follows for delete to authenticated using (follower_id = auth.uid());
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

-- What anyone may see about a person: never email, phone or role. Private profiles show only their first name and photo.
create or replace view public.public_profiles as
  select p.id, p.username, split_part(coalesce(nullif(p.name, ''), 'Fyndo user'), ' ', 1) as name, p.avatar_url, p.is_private,
         case when p.is_private then '' else p.bio end as bio,
         case when p.is_private then '' else p.city end as city,
         case when p.is_private then '{}'::text[] else p.favorites end as favorites,
         (select count(*) from public.follows f where f.followee_id = p.id)::int as followers,
         (select count(*) from public.follows f where f.follower_id = p.id)::int as following,
         (select count(*) from public.reviews r where r.user_id = p.id)::int as reviews,
         p.created_at
  from public.profiles p
  where p.username is not null;
grant select on public.public_profiles to anon, authenticated;

-- ---------- likes on reviews ----------
create table if not exists public.review_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);
alter table public.review_likes enable row level security;
drop policy if exists "likes read" on public.review_likes;
create policy "likes read" on public.review_likes for select using (true);
drop policy if exists "likes own" on public.review_likes;
create policy "likes own" on public.review_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "likes undo" on public.review_likes;
create policy "likes undo" on public.review_likes for delete to authenticated using (user_id = auth.uid());
grant select on public.review_likes to anon, authenticated;
grant insert, delete on public.review_likes to authenticated;

-- ---------- people's own lists ----------
create table if not exists public.user_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  note text not null default '' check (char_length(note) <= 300),
  spot_ids text[] not null default '{}' check (cardinality(spot_ids) <= 50),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_lists_user on public.user_lists (user_id, updated_at desc);
alter table public.user_lists enable row level security;
drop policy if exists "lists read" on public.user_lists;
create policy "lists read" on public.user_lists for select using (
  user_id = auth.uid() or public.is_admin()
  or (is_public and not exists (select 1 from public.profiles p where p.id = user_id and p.is_private)));
drop policy if exists "lists own" on public.user_lists;
create policy "lists own" on public.user_lists for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "lists edit" on public.user_lists;
create policy "lists edit" on public.user_lists for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "lists delete" on public.user_lists;
create policy "lists delete" on public.user_lists for delete using (user_id = auth.uid() or public.is_admin());
grant select on public.user_lists to anon, authenticated;
grant insert, update, delete on public.user_lists to authenticated;

-- ---------- reviews: show the reviewer's @username and photo (public profiles only) ----------
create or replace view public.reviews_public as
  select r.id, r.spot_id, r.user_id, r.author, r.rating, r.body, r.tags, r.would_return,
         r.owner_reply, r.owner_reply_at, r.created_at,
         exists (select 1 from public.checkins c where c.user_id = r.user_id and c.spot_id = r.spot_id) as visited,
         r.visit_type,
         case when p.is_private then null else p.username end as username,
         case when p.is_private then '' else p.avatar_url end as avatar_url,
         (select count(*) from public.review_likes l where l.review_id = r.id)::int as likes
  from public.reviews r left join public.profiles p on p.id = r.user_id;
grant select on public.reviews_public to anon, authenticated;

-- ---------- the friends feed: recent reviews and lists from people you follow ----------
create or replace function public.friends_feed(p_limit int default 40)
returns table (kind text, at timestamptz, user_id uuid, username text, name text, avatar_url text,
               spot_id text, rating int, body text, list_id uuid, list_title text, review_id uuid)
language sql stable security definer set search_path = public as $$
  with mine as (select followee_id from public.follows where follower_id = auth.uid())
  select * from (
    select 'review'::text, r.created_at, r.user_id, p.username, split_part(coalesce(nullif(p.name, ''), 'Fyndo user'), ' ', 1), p.avatar_url,
           r.spot_id, r.rating, left(r.body, 280), null::uuid, null::text, r.id
    from public.reviews r join public.profiles p on p.id = r.user_id
    where r.user_id in (select followee_id from mine) and not p.is_private
    union all
    select 'list', l.updated_at, l.user_id, p.username, split_part(coalesce(nullif(p.name, ''), 'Fyndo user'), ' ', 1), p.avatar_url,
           null, null, left(l.note, 280), l.id, l.title, null
    from public.user_lists l join public.profiles p on p.id = l.user_id
    where l.user_id in (select followee_id from mine) and l.is_public and not p.is_private
  ) x order by 2 desc limit least(greatest(p_limit, 1), 100);
$$;
grant execute on function public.friends_feed(int) to authenticated;

-- ---------- reports can now point at a profile or a list ----------
alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('review', 'spot', 'user', 'list'));

-- ---------- profile photos: public bucket, one folder per person ----------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do update set public = true;
update storage.buckets set file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'avatars';
drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars add" on storage.objects;
create policy "avatars add" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars remove" on storage.objects;
create policy "avatars remove" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
