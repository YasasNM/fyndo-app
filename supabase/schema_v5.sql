-- =====================================================================
-- FYNDO V5: real-photo credits, place websites, and restaurant owners
--           claiming their page (verification + yearly fee + admin approval).
-- How to use: Supabase > SQL Editor > New query > paste this WHOLE file > Run. Safe to run again.
-- Needs schema.sql, schema_v3.sql and schema_v4.sql first.
-- =====================================================================

-- ---------- places: where each photo came from, website, paid-until date ----------
-- photo_info: { "<photo url>": { "source": "website|commons|osm|owner", "credit": "...", "link": "...", "license": "..." } }
alter table public.spots add column if not exists photo_info jsonb not null default '{}';
alter table public.spots add column if not exists website text not null default '';
-- Owners who claimed through the app can edit until this date (renew yearly). Empty = no limit (owners an admin set up by hand).
alter table public.spots add column if not exists owner_paid_until timestamptz;

-- Owners cannot change the owner, badges, ID or their own paid-until date.
create or replace function public.protect_spot() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.owner_id := old.owner_id;
    new.verified := old.verified;
    new.hidden_gem := old.hidden_gem;
    new.id := old.id;
    new.owner_paid_until := old.owner_paid_until;
  end if;
  return new;
end $$;

-- An owner can edit their page while their yearly plan is active.
drop policy if exists "spots update" on public.spots;
create policy "spots update" on public.spots for update using (
  public.is_admin() or (owner_id = auth.uid() and coalesce(owner_paid_until, 'infinity'::timestamptz) >= now()));

-- ---------- owner claims ----------
create table if not exists public.owner_claims (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('FYC-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6))),
  spot_id text not null references public.spots(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  job_role text not null default 'Owner' check (job_role in ('Owner', 'Manager', 'Marketing / staff with permission')),
  phone text not null check (char_length(phone) between 7 and 20),
  business_email text not null default '' check (char_length(business_email) <= 120),
  reg_no text not null default '' check (char_length(reg_no) <= 60),
  note text not null default '' check (char_length(note) <= 600),
  proof_path text not null default '',
  receipt_path text not null default '',
  fee_lkr int not null default 5000,
  status text not null default 'submitted' check (status in ('submitted', 'paid', 'approved', 'rejected', 'cancelled')),
  paid_at timestamptz,
  payment_ref text not null default '',
  admin_note text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
-- One open claim per person per place.
create unique index if not exists owner_claims_one_open on public.owner_claims (spot_id, user_id) where status in ('submitted', 'paid');

-- People can add their receipt or cancel; everything else is decided by an admin.
create or replace function public.protect_claim() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid(); new.status := 'submitted'; new.fee_lkr := 5000;
    new.paid_at := null; new.payment_ref := ''; new.admin_note := ''; new.reviewed_at := null; new.receipt_path := coalesce(new.receipt_path, '');
    if exists (select 1 from public.spots where id = new.spot_id and owner_id is not null and owner_id <> auth.uid()
               and coalesce(owner_paid_until, 'infinity'::timestamptz) >= now()) then
      raise exception 'This place already has a verified owner. Email fyndolk.official@gmail.com if that is wrong.';
    end if;
    return new;
  end if;
  -- update by the person who made the claim
  if old.status not in ('submitted', 'paid') then raise exception 'This claim is closed.'; end if;
  if new.status not in (old.status, 'cancelled') then raise exception 'Not allowed.'; end if;
  new.id := old.id; new.ref := old.ref; new.spot_id := old.spot_id; new.user_id := old.user_id; new.fee_lkr := old.fee_lkr;
  new.paid_at := old.paid_at; new.payment_ref := old.payment_ref; new.admin_note := old.admin_note; new.reviewed_at := old.reviewed_at;
  new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists protect_claim on public.owner_claims;
create trigger protect_claim before insert or update on public.owner_claims
  for each row execute function public.protect_claim();

alter table public.owner_claims enable row level security;
drop policy if exists "claims read" on public.owner_claims;
create policy "claims read" on public.owner_claims for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "claims insert" on public.owner_claims;
create policy "claims insert" on public.owner_claims for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "claims update" on public.owner_claims;
create policy "claims update" on public.owner_claims for update using (user_id = auth.uid() or public.is_admin());
grant select, insert, update on public.owner_claims to authenticated;

-- Admin: payment arrived in the bank.
create or replace function public.mark_claim_paid(p_id uuid, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.owner_claims set status = 'paid', paid_at = now(), payment_ref = left(coalesce(p_ref, ''), 80)
   where id = p_id and status = 'submitted';
  if not found then raise exception 'Only a new claim can be marked as paid.'; end if;
end $$;

-- Admin: approve a paid claim. The person becomes the owner for 12 months (added on top of any time left).
create or replace function public.approve_claim(p_id uuid, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare c public.owner_claims;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  select * into c from public.owner_claims where id = p_id for update;
  if c is null then raise exception 'Claim not found.'; end if;
  if c.status <> 'paid' then raise exception 'Mark the payment as received first.'; end if;
  update public.owner_claims set status = 'approved', reviewed_at = now(), admin_note = left(coalesce(p_note, ''), 300) where id = p_id;
  update public.spots set owner_id = c.user_id,
    owner_paid_until = greatest(now(), coalesce(case when owner_id = c.user_id then owner_paid_until end, now())) + interval '12 months'
   where id = c.spot_id;
  update public.profiles set role = 'owner' where id = c.user_id and role = 'user';
  -- other open claims for the same place are closed
  update public.owner_claims set status = 'rejected', reviewed_at = now(), admin_note = 'Another owner was verified for this place.'
   where spot_id = c.spot_id and id <> p_id and status in ('submitted', 'paid');
end $$;

create or replace function public.reject_claim(p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.owner_claims set status = 'rejected', reviewed_at = now(), admin_note = left(coalesce(p_note, ''), 300)
   where id = p_id and status in ('submitted', 'paid');
  if not found then raise exception 'This claim is already closed.'; end if;
end $$;

grant execute on function public.mark_claim_paid(uuid, text) to authenticated;
grant execute on function public.approve_claim(uuid, text) to authenticated;
grant execute on function public.reject_claim(uuid, text) to authenticated;

-- ---------- private files: proof of ownership and payment receipts ----------
-- Files live under <user id>/<file>. Only that person and admins can see them. Max 5 MB; images or PDF.
insert into storage.buckets (id, name, public) values ('owner-proofs', 'owner-proofs', false)
  on conflict (id) do update set public = false;
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  where id = 'owner-proofs';

drop policy if exists "owner proofs add" on storage.objects;
create policy "owner proofs add" on storage.objects for insert to authenticated
  with check (bucket_id = 'owner-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "owner proofs read" on storage.objects;
create policy "owner proofs read" on storage.objects for select to authenticated
  using (bucket_id = 'owner-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
