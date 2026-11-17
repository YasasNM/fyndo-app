-- =====================================================================
-- FYNDO V8: security tightening. No new features; nothing is removed.
--   1. Private profiles: their reviews can no longer be listed by account id.
--   2. Links and photos on places must be http(s) addresses; colours must be hex.
--   3. Profile photos must come from Fyndo's own photo storage; names and phones are kept short.
--   4. Daily limits on things a spam bot would repeat (reviews, reports, follows, likes, lists, feedback, votes).
-- How to use: Supabase > SQL Editor > New query > paste this WHOLE file > Run. Safe to run again.
-- Needs schema.sql and schema_v3.sql to v7.sql first.
-- =====================================================================

-- ---------- 1. reviews: the public reads them only through reviews_public ----------
-- The raw table now answers only for your own reviews (and admins). Pages already read reviews_public
-- and spot_ratings, which are views with owner rights, so they keep working.
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select using (user_id = auth.uid() or public.is_admin());

-- Same view as v7, but a private person's account id is hidden from everyone except themselves.
drop view if exists public.reviews_public;
create view public.reviews_public as
  select r.id, r.spot_id,
         case when coalesce(p.is_private, false) and r.user_id is distinct from auth.uid() and not public.is_admin()
              then null else r.user_id end as user_id,
         r.author, r.rating, r.body, r.tags, r.would_return,
         r.owner_reply, r.owner_reply_at, r.created_at,
         exists (select 1 from public.checkins c where c.user_id = r.user_id and c.spot_id = r.spot_id) as visited,
         r.visit_type,
         case when p.is_private then null else p.username end as username,
         case when p.is_private then '' else p.avatar_url end as avatar_url,
         (select count(*) from public.review_likes l where l.review_id = r.id)::int as likes
  from public.reviews r left join public.profiles p on p.id = r.user_id;
grant select on public.reviews_public to anon, authenticated;

-- Ratings per place (same as v3; recreated so it never depends on the raw table being readable).
drop view if exists public.spot_ratings;
create view public.spot_ratings as
  select r.spot_id, round(avg(r.rating)::numeric, 1)::float as avg, count(*)::int as count,
         (count(*) filter (where exists (select 1 from public.checkins c where c.user_id = r.user_id and c.spot_id = r.spot_id)))::int as visited_count
  from public.reviews r group by r.spot_id;
grant select on public.spot_ratings to anon, authenticated;

-- ---------- 2. places: only real web links and hex colours ----------
create or replace function public.clean_spot_links() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(new.video_url, '') <> '' and new.video_url !~* '^https?://[^\s<>"]+$' then new.video_url := ''; end if;
  if coalesce(new.website, '') <> '' and new.website !~* '^https?://[^\s<>"]+$' then new.website := ''; end if;
  if coalesce(new.facebook_url, '') <> '' and new.facebook_url !~* '^https://([a-z0-9-]+\.)?facebook\.com/[^\s<>"]*$' then new.facebook_url := ''; end if;
  if coalesce(new.instagram_url, '') <> '' and new.instagram_url !~* '^https://(www\.)?instagram\.com/[^\s<>"]*$' then new.instagram_url := ''; end if;
  if new.photos is not null then
    new.photos := coalesce(array(select u from unnest(new.photos) as u where u ~* '^https://[^\s<>"]+$'), '{}');
  end if;
  if coalesce(new.color, '') !~ '^#[0-9A-Fa-f]{3,8}$' then new.color := '#FF8A1E'; end if;
  return new;
end $$;
drop trigger if exists clean_spot_links on public.spots;
create trigger clean_spot_links before insert or update on public.spots
  for each row execute function public.clean_spot_links();

-- ---------- 3. profiles: own-storage photos only, sensible lengths ----------
create or replace function public.guard_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  new.name := left(coalesce(new.name, ''), 80);
  new.phone := left(coalesce(new.phone, ''), 20);
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if coalesce(new.avatar_url, '') <> ''
       and new.avatar_url !~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/' || new.id::text || '/[A-Za-z0-9._-]+$') then
      raise exception 'Profile photos must be uploaded in Fyndo.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before insert or update on public.profiles
  for each row execute function public.guard_profile();

-- ---------- 4. daily limits (admins and the SQL editor are not limited) ----------
create or replace function public.limited() returns boolean
language sql stable set search_path = public as $$
  select current_user in ('anon', 'authenticated') and not public.is_admin();
$$;

create or replace function public.limit_reviews() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.limited() and (select count(*) from public.reviews where user_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'You have posted a lot of reviews today. Try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists limit_reviews on public.reviews;
create trigger limit_reviews before insert on public.reviews for each row execute function public.limit_reviews();

create or replace function public.limit_reports() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.limited() and (select count(*) from public.reports where reporter = auth.uid() and created_at > now() - interval '1 day') >= 15 then
    raise exception 'You have sent a lot of reports today. Thank you; try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists limit_reports on public.reports;
create trigger limit_reports before insert on public.reports for each row execute function public.limit_reports();

create or replace function public.limit_follows() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.limited() and (select count(*) from public.follows where follower_id = auth.uid() and created_at > now() - interval '1 day') >= 150 then
    raise exception 'You have followed a lot of people today. Try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists limit_follows on public.follows;
create trigger limit_follows before insert on public.follows for each row execute function public.limit_follows();

create or replace function public.limit_likes() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.limited() and (select count(*) from public.review_likes where user_id = auth.uid() and created_at > now() - interval '1 day') >= 400 then
    raise exception 'That is a lot of likes for one day. Try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists limit_likes on public.review_likes;
create trigger limit_likes before insert on public.review_likes for each row execute function public.limit_likes();

create or replace function public.limit_lists() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.limited() and (select count(*) from public.user_lists where user_id = auth.uid()) >= 100 then
    raise exception 'You can keep up to 100 lists. Delete one to make another.';
  end if;
  return new;
end $$;
drop trigger if exists limit_lists on public.user_lists;
create trigger limit_lists before insert on public.user_lists for each row execute function public.limit_lists();

create or replace function public.limit_feedback() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.limited() and (select count(*) from public.feedback where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have sent a lot of messages today. Try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists limit_feedback on public.feedback;
create trigger limit_feedback before insert on public.feedback for each row execute function public.limit_feedback();

create or replace function public.limit_claims() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.limited() and (select count(*) from public.owner_claims where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You have started a lot of claims today. Email fyndolk.official@gmail.com if you need help.';
  end if;
  return new;
end $$;
drop trigger if exists limit_claims on public.owner_claims;
create trigger limit_claims before insert on public.owner_claims for each row execute function public.limit_claims();

-- Group votes: 20 new votes a day per person, and at most 500 answers on one vote.
create or replace function public.limit_polls() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and (select count(*) from public.polls where created_by = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'You have started a lot of votes today. Try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists limit_polls on public.polls;
create trigger limit_polls before insert on public.polls for each row execute function public.limit_polls();

create or replace function public.limit_poll_votes() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.poll_votes where poll_id = new.poll_id) >= 500 then
    raise exception 'This vote is full.';
  end if;
  return new;
end $$;
drop trigger if exists limit_poll_votes on public.poll_votes;
create trigger limit_poll_votes before insert on public.poll_votes for each row execute function public.limit_poll_votes();

-- Speeds up the daily counts above.
create index if not exists reviews_user_time on public.reviews (user_id, created_at desc);
create index if not exists reports_reporter_time on public.reports (reporter, created_at desc);
create index if not exists follows_follower_time on public.follows (follower_id, created_at desc);
create index if not exists likes_user_time on public.review_likes (user_id, created_at desc);
