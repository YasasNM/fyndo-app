-- =====================================================================
-- FYNDO V3: facilities, QR check-ins + rewards, verified reviews, owner replies,
-- private feedback, reports, collections, group votes.
-- How to use: Supabase > SQL Editor > New query > paste this WHOLE file > Run.
-- Needs the base tables from schema.sql (profiles, spots, saves...). Includes the reviews setup, so it works even if you skipped that part. Safe to run again.
-- =====================================================================

-- =====================================================================
-- V2: REVIEWS, RATINGS, POPULAR (safe to run again)
-- =====================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null references public.spots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author text not null default 'Fyndo user',
  rating int not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 600),
  created_at timestamptz default now(),
  unique (spot_id, user_id)
);

-- The reviewer's display name always comes from their profile (first name only), never from the app.
create or replace function public.set_review_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author := coalesce(
    nullif(split_part((select name from public.profiles where id = new.user_id), ' ', 1), ''), 'Fyndo user');
  return new;
end $$;
drop trigger if exists set_review_author on public.reviews;
create trigger set_review_author before insert or update on public.reviews
  for each row execute function public.set_review_author();

alter table public.reviews enable row level security;
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select using (true);
drop policy if exists "reviews insert" on public.reviews;
create policy "reviews insert" on public.reviews for insert with check (user_id = auth.uid());
drop policy if exists "reviews update" on public.reviews;
create policy "reviews update" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "reviews delete" on public.reviews;
create policy "reviews delete" on public.reviews for delete using (user_id = auth.uid() or public.is_admin());

grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

-- Average rating per spot (public).
create or replace view public.spot_ratings with (security_invoker = true) as
  select spot_id, round(avg(rating)::numeric, 1)::float as avg, count(*)::int as count
  from public.reviews group by spot_id;
grant select on public.spot_ratings to anon, authenticated;

-- Most saved spots (counts only, no personal info).
create or replace function public.popular_spots(p_limit int default 8)
returns table (spot_id text, saves int)
language sql stable security definer set search_path = public as $$
  select spot_id, count(*)::int from public.saves group by spot_id order by 2 desc limit p_limit;
$$;
grant execute on function public.popular_spots(int) to anon, authenticated;

-- ---------- SPOTS: facilities + stamp card settings ----------
alter table public.spots add column if not exists features text[] default '{}';
alter table public.spots add column if not exists stamp_goal int default 6 check (stamp_goal between 2 and 20);
alter table public.spots add column if not exists stamp_reward text default '';

-- ---------- CHECK-IN SECRETS (never readable by the public) ----------
create table if not exists public.spot_secrets (
  spot_id text primary key references public.spots(id) on delete cascade,
  checkin_code text not null default substr(md5(random()::text || clock_timestamp()::text), 1, 10)
);
alter table public.spot_secrets enable row level security;  -- no policies: only the functions below can use it

-- ---------- CHECK-INS (proof of visit, points, food diary) ----------
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  spot_id text not null references public.spots(id) on delete cascade,
  day date not null default ((now() at time zone 'Asia/Colombo')::date),
  points int not null default 10,
  note text not null default '' check (char_length(note) <= 300),
  spent int check (spent is null or spent between 0 and 1000000),
  created_at timestamptz default now(),
  unique (user_id, spot_id, day)
);
create index if not exists checkins_spot_time on public.checkins (spot_id, created_at);
alter table public.checkins enable row level security;
drop policy if exists "checkins read own" on public.checkins;
create policy "checkins read own" on public.checkins for select using (user_id = auth.uid() or public.is_admin());
-- No insert/update policy: check-ins are made only by the check_in function (needs the table's QR code).

create or replace function public.check_in(p_spot text, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  real_code text;
  today date := (now() at time zone 'Asia/Colombo')::date;
  n int;
  v int;
begin
  if uid is null then raise exception 'Please log in first.'; end if;
  select checkin_code into real_code from public.spot_secrets where spot_id = p_spot;
  if real_code is null or real_code <> coalesce(p_code, '') then
    raise exception 'That QR code is not valid. Ask the staff to show the current one.';
  end if;
  if exists (select 1 from public.checkins c where c.user_id = uid and c.spot_id = p_spot and c.day = today) then
    select count(*) into v from public.checkins c where c.user_id = uid and c.spot_id = p_spot;
    return jsonb_build_object('already', true, 'points', 0, 'visits', v);
  end if;
  select count(*) into n from public.checkins c where c.user_id = uid and c.day = today;
  if n >= 3 then raise exception 'You can check in at up to 3 places a day.'; end if;
  insert into public.checkins (user_id, spot_id, day, points) values (uid, p_spot, today, 10);
  select count(*) into v from public.checkins c where c.user_id = uid and c.spot_id = p_spot;
  return jsonb_build_object('already', false, 'points', 10, 'visits', v);
end $$;

create or replace function public.update_checkin(p_id uuid, p_note text, p_spent int) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.checkins set note = left(coalesce(p_note, ''), 300), spent = p_spent
   where id = p_id and user_id = auth.uid();
end $$;

-- Owner/admin: get (or renew) the table QR code for a spot.
create or replace function public.get_checkin_code(p_spot text, p_rotate boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not (public.is_admin() or exists (select 1 from public.spots where id = p_spot and owner_id = auth.uid())) then
    raise exception 'Not allowed.';
  end if;
  insert into public.spot_secrets (spot_id) values (p_spot) on conflict (spot_id) do nothing;
  if p_rotate then
    update public.spot_secrets set checkin_code = substr(md5(random()::text || clock_timestamp()::text), 1, 10) where spot_id = p_spot;
  end if;
  select checkin_code into c from public.spot_secrets where spot_id = p_spot;
  return c;
end $$;

-- Owner/admin: visit numbers only, never names.
create or replace function public.spot_checkin_stats(p_spot text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_admin() or exists (select 1 from public.spots where id = p_spot and owner_id = auth.uid())) then
    raise exception 'Not allowed.';
  end if;
  return (select jsonb_build_object(
    'total', count(*),
    'last30', count(*) filter (where created_at > now() - interval '30 days'),
    'visitors', count(distinct user_id),
    'repeat', (select count(*) from (select user_id from public.checkins where spot_id = p_spot group by user_id having count(*) > 1) x),
    'avg_spent', round(avg(spent))
  ) from public.checkins where spot_id = p_spot);
end $$;

-- ---------- REVIEWS: tags, "would go again", owner reply, visited badge ----------
alter table public.reviews add column if not exists tags text[] not null default '{}' check (cardinality(tags) <= 6);
alter table public.reviews add column if not exists would_return boolean;
alter table public.reviews add column if not exists visit_type text check (visit_type is null or visit_type in ('date', 'friends', 'family', 'solo', 'quick'));
alter table public.reviews add column if not exists owner_reply text check (owner_reply is null or char_length(owner_reply) <= 500);
alter table public.reviews add column if not exists owner_reply_at timestamptz;

-- Reviewers cannot write the owner's reply; only reply_review() can.
create or replace function public.protect_review() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.owner_reply := null; new.owner_reply_at := null;
    else
      new.owner_reply := old.owner_reply; new.owner_reply_at := old.owner_reply_at;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_review on public.reviews;
create trigger protect_review before insert or update on public.reviews
  for each row execute function public.protect_review();

create or replace function public.reply_review(p_review uuid, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare sid text; t text := nullif(left(trim(coalesce(p_text, '')), 500), '');
begin
  select spot_id into sid from public.reviews where id = p_review;
  if sid is null then raise exception 'Review not found.'; end if;
  if not (public.is_admin() or exists (select 1 from public.spots where id = sid and owner_id = auth.uid())) then
    raise exception 'Not allowed.';
  end if;
  update public.reviews set owner_reply = t, owner_reply_at = case when t is null then null else now() end where id = p_review;
end $$;

-- Public read of reviews with a "visited" flag (true if the reviewer checked in there).
create or replace view public.reviews_public as
  select r.id, r.spot_id, r.user_id, r.author, r.rating, r.body, r.tags, r.would_return,
         r.owner_reply, r.owner_reply_at, r.created_at,
         exists (select 1 from public.checkins c where c.user_id = r.user_id and c.spot_id = r.spot_id) as visited,
         r.visit_type
  from public.reviews r;
grant select on public.reviews_public to anon, authenticated;

drop view if exists public.spot_ratings;
create view public.spot_ratings as
  select r.spot_id, round(avg(r.rating)::numeric, 1)::float as avg, count(*)::int as count,
         (count(*) filter (where exists (select 1 from public.checkins c where c.user_id = r.user_id and c.spot_id = r.spot_id)))::int as visited_count
  from public.reviews r group by r.spot_id;
grant select on public.spot_ratings to anon, authenticated;

-- ---------- PRIVATE FEEDBACK to the owner ----------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null references public.spots(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 3 and 1000),
  created_at timestamptz default now()
);
alter table public.feedback enable row level security;
drop policy if exists "feedback insert" on public.feedback;
create policy "feedback insert" on public.feedback for insert with check (auth.uid() is not null and user_id = auth.uid());
drop policy if exists "feedback read" on public.feedback;
create policy "feedback read" on public.feedback for select using (
  public.is_admin() or exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid()));
grant insert on public.feedback to authenticated;
grant select on public.feedback to authenticated;

-- ---------- REPORTS (review / spot) for the Fyndo team ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('review', 'spot')),
  target text not null,
  reason text not null check (char_length(reason) between 3 and 500),
  reporter uuid references public.profiles(id) on delete set null,
  resolved boolean not null default false,
  created_at timestamptz default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert with check (auth.uid() is not null and reporter = auth.uid());
drop policy if exists "reports admin" on public.reports;
create policy "reports admin" on public.reports for all using (public.is_admin()) with check (public.is_admin());
grant insert on public.reports to authenticated;
grant select, update, delete on public.reports to authenticated;

-- ---------- COLLECTIONS (curated lists) ----------
create table if not exists public.collections (
  id text primary key,
  title text not null,
  blurb text not null default '',
  emoji text not null default '✨',
  spot_ids text[] not null default '{}',
  published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz default now()
);
alter table public.collections enable row level security;
drop policy if exists "collections read" on public.collections;
create policy "collections read" on public.collections for select using (published or public.is_admin());
drop policy if exists "collections admin" on public.collections;
create policy "collections admin" on public.collections for all using (public.is_admin()) with check (public.is_admin());
grant select on public.collections to anon, authenticated;
grant insert, update, delete on public.collections to authenticated;

-- ---------- GROUP VOTES (friends vote without an account) ----------
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  options jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  voter text not null check (char_length(voter) between 8 and 64),
  choice int not null check (choice between 0 and 5),
  primary key (poll_id, voter)
);
alter table public.polls enable row level security;       -- no policies: use the functions below
alter table public.poll_votes enable row level security;

create or replace function public.create_poll(p_title text, p_options jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if auth.uid() is null then raise exception 'Please log in to create a vote.'; end if;
  if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 2 and 6 then
    raise exception 'A vote needs 2 to 6 options.';
  end if;
  if length(p_options::text) > 4000 then raise exception 'Options are too long.'; end if;
  insert into public.polls (title, options, created_by) values (left(trim(p_title), 80), p_options, auth.uid()) returning id into pid;
  return pid;
end $$;

create or replace function public.get_poll(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'title', p.title, 'options', p.options, 'created_at', p.created_at,
    'counts', coalesce((
      select jsonb_agg(coalesce(c.n, 0) order by g.i)
      from generate_series(0, jsonb_array_length(p.options) - 1) as g(i)
      left join (select choice, count(*)::int as n from public.poll_votes where poll_id = p.id group by choice) c on c.choice = g.i
    ), '[]'::jsonb))
  from public.polls p where p.id = p_id;
$$;

create or replace function public.vote_poll(p_id uuid, p_voter text, p_choice int) returns void
language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select jsonb_array_length(options) into cnt from public.polls where id = p_id;
  if cnt is null then raise exception 'This vote was not found.'; end if;
  if p_choice < 0 or p_choice >= cnt then raise exception 'Invalid choice.'; end if;
  insert into public.poll_votes (poll_id, voter, choice) values (p_id, p_voter, p_choice)
  on conflict (poll_id, voter) do update set choice = excluded.choice;
end $$;

-- ---------- TRENDING: saves + recent check-ins ----------
create or replace function public.popular_spots(p_limit int default 8)
returns table (spot_id text, saves int)
language sql stable security definer set search_path = public as $$
  select s.spot_id, sum(s.score)::int as saves from (
    select spot_id, 1 as score from public.saves
    union all
    select spot_id, 3 as score from public.checkins where created_at > now() - interval '14 days'
  ) s group by s.spot_id order by 2 desc limit p_limit;
$$;

-- ---------- PERMISSIONS ----------
grant execute on function public.check_in(text, text) to authenticated;
grant execute on function public.update_checkin(uuid, text, int) to authenticated;
grant execute on function public.get_checkin_code(text, boolean) to authenticated;
grant execute on function public.spot_checkin_stats(text) to authenticated;
grant execute on function public.reply_review(uuid, text) to authenticated;
grant execute on function public.create_poll(text, jsonb) to authenticated;
grant execute on function public.get_poll(uuid) to anon, authenticated;
grant execute on function public.vote_poll(uuid, text, int) to anon, authenticated;
grant execute on function public.popular_spots(int) to anon, authenticated;
grant select on public.checkins to authenticated;
