-- =====================================================================
-- FYNDO DATABASE SCHEMA (Supabase / Postgres)
-- How to use: Supabase dashboard > SQL Editor > New query >
-- paste this whole file > Run. Then run seed.sql the same way.
-- =====================================================================

-- ---------- PROFILES (one per user, created automatically on sign up) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text default '',
  phone text default '',
  role text not null default 'user' check (role in ('user', 'owner', 'admin')),
  created_at timestamptz default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'name', ''), coalesce(new.raw_user_meta_data->>'phone', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users cannot change their own role or email (only an admin can change role).
create or replace function public.protect_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  -- rules apply to app users; the Supabase SQL editor (postgres) can change anything
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------- SPOTS ----------
create table if not exists public.spots (
  id text primary key,
  name text not null,
  area text not null,
  category text not null,
  price_min int default 0,
  price_max int default 0,
  moods text[] default '{}',
  about text default '',
  video_url text default '',
  google_place_id text unique,          -- Google Maps place ID (the only Google data we store)
  menu jsonb default '[]',
  menu_updated_at date default current_date,
  open_time text default '10:00',
  close_time text default '22:00',
  lat double precision,
  lng double precision,
  phone text default '',
  whatsapp text default '',
  color text default '#FF8A1E',
  verified boolean default false,
  hidden_gem boolean default false,
  owner_id uuid references public.profiles(id) on delete set null,
  -- booking settings (owner controls these)
  booking_enabled boolean default false,
  booking_mode text default 'instant' check (booking_mode in ('instant', 'request')),
  tables_for_booking int default 4 check (tables_for_booking >= 0),
  max_party int default 6,
  slot_minutes int default 30,
  booking_start text default '18:00',
  booking_end text default '21:30',
  cancel_hours int default 2,
  created_at timestamptz default now()
);

-- For databases created before the Google feature:
alter table public.spots add column if not exists google_place_id text unique;

-- Owners can edit their page, but cannot change the owner, verified badge or ID.
create or replace function public.protect_spot() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.owner_id := old.owner_id;
    new.verified := old.verified;
    new.hidden_gem := old.hidden_gem;
    new.id := old.id;
  end if;
  return new;
end $$;
drop trigger if exists protect_spot on public.spots;
create trigger protect_spot before update on public.spots
  for each row execute function public.protect_spot();

-- ---------- SAVES & PLANS ----------
create table if not exists public.saves (
  user_id uuid references public.profiles(id) on delete cascade,
  spot_id text references public.spots(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, spot_id)
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  data jsonb not null,
  created_at timestamptz default now()
);

-- ---------- BOOKINGS ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref_code text not null default ('FY-' || (1000 + floor(random() * 9000))::int),
  spot_id text not null references public.spots(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  guest_name text not null,
  guest_phone text default '',
  guests int not null check (guests between 1 and 50),
  date date not null,
  time text not null,
  note text default '',
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'declined', 'cancelled', 'arrived', 'no_show')),
  source text not null default 'app' check (source in ('app', 'phone', 'walk-in')),
  created_at timestamptz default now()
);
create index if not exists bookings_spot_date on public.bookings (spot_id, date);

-- New app bookings: set status from the spot's mode, and stop over-booking.
create or replace function public.before_booking_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.spots; taken int; is_mgr boolean;
begin
  select * into s from public.spots where id = new.spot_id;
  if s is null then raise exception 'Spot not found'; end if;
  is_mgr := public.is_admin() or coalesce(s.owner_id = auth.uid(), false);

  if new.source = 'app' and not is_mgr then
    if not s.booking_enabled then raise exception 'This place is not taking bookings.'; end if;
    if new.user_id is distinct from auth.uid() then raise exception 'Not allowed.'; end if;
    if new.guests > s.max_party then raise exception 'Group too big for online booking. Please call.'; end if;
    if new.date < current_date then raise exception 'That date has passed.'; end if;
    new.status := case when s.booking_mode = 'instant' then 'confirmed' else 'requested' end;
  end if;

  select count(*) into taken from public.bookings
   where spot_id = new.spot_id and date = new.date and time = new.time
     and status in ('requested', 'confirmed', 'arrived');
  if new.source = 'app' and taken >= s.tables_for_booking then
    raise exception 'Sorry, that time is now full.';
  end if;
  return new;
end $$;
drop trigger if exists before_booking_insert on public.bookings;
create trigger before_booking_insert before insert on public.bookings
  for each row execute function public.before_booking_insert();

-- Customers can only cancel their booking. Owners can change status only.
create or replace function public.protect_booking() returns trigger
language plpgsql set search_path = public as $$
declare is_mgr boolean;
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  select public.is_admin() or exists (select 1 from public.spots where id = old.spot_id and owner_id = auth.uid())
    into is_mgr;
  if not is_mgr then
    if new.status <> 'cancelled' then raise exception 'You can only cancel a booking.'; end if;
    new := old; new.status := 'cancelled';
  else
    -- owners: only status can change
    new.spot_id := old.spot_id; new.user_id := old.user_id; new.ref_code := old.ref_code;
  end if;
  return new;
end $$;
drop trigger if exists protect_booking on public.bookings;
create trigger protect_booking before update on public.bookings
  for each row execute function public.protect_booking();

-- ---------- HELPER FUNCTIONS (called from the app) ----------
-- How many tables are taken per time slot (no personal info shown).
create or replace function public.slot_counts(p_spot text, p_date date)
returns table ("time" text, taken int)
language sql stable security definer set search_path = public as $$
  select b.time, count(*)::int from public.bookings b
   where b.spot_id = p_spot and b.date = p_date and b.status in ('requested', 'confirmed', 'arrived')
   group by b.time;
$$;

create or replace function public.spot_stats(p_spot text)
returns table (saves int, bookings int, arrived int, "noShows" int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_admin() or exists (select 1 from public.spots where id = p_spot and owner_id = auth.uid())) then
    raise exception 'Not allowed.';
  end if;
  return query select
    (select count(*)::int from public.saves where spot_id = p_spot),
    (select count(*)::int from public.bookings where spot_id = p_spot),
    (select count(*)::int from public.bookings where spot_id = p_spot and status = 'arrived'),
    (select count(*)::int from public.bookings where spot_id = p_spot and status = 'no_show');
end $$;

-- Admin: link a spot to an owner by email (makes them an owner).
create or replace function public.assign_owner(p_spot text, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  select id into uid from public.profiles where email = lower(p_email);
  if uid is null then raise exception 'No user with that email. Ask them to sign up first.'; end if;
  update public.profiles set role = 'owner' where id = uid and role = 'user';
  update public.spots set owner_id = uid where id = p_spot;
end $$;

-- ---------- ROW LEVEL SECURITY (who can see / change what) ----------
alter table public.profiles enable row level security;
alter table public.spots enable row level security;
alter table public.saves enable row level security;
alter table public.plans enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists "spots read" on public.spots;
create policy "spots read" on public.spots for select using (true);
drop policy if exists "spots admin insert" on public.spots;
create policy "spots admin insert" on public.spots for insert with check (public.is_admin());
drop policy if exists "spots update" on public.spots;
create policy "spots update" on public.spots for update using (public.is_admin() or owner_id = auth.uid());
drop policy if exists "spots admin delete" on public.spots;
create policy "spots admin delete" on public.spots for delete using (public.is_admin());

drop policy if exists "saves own" on public.saves;
create policy "saves own" on public.saves for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "plans own" on public.plans;
create policy "plans own" on public.plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "bookings read" on public.bookings;
create policy "bookings read" on public.bookings for select using (
  user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid()));
drop policy if exists "bookings insert" on public.bookings;
create policy "bookings insert" on public.bookings for insert with check (
  (auth.uid() is not null and user_id = auth.uid())
  or public.is_admin()
  or exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid()));
drop policy if exists "bookings update" on public.bookings;
create policy "bookings update" on public.bookings for update using (
  user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid()));

grant execute on function public.slot_counts(text, date) to anon, authenticated;
grant execute on function public.spot_stats(text) to authenticated;
grant execute on function public.assign_owner(text, text) to authenticated;
