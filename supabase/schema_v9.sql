-- =====================================================================
-- FYNDO V9: Today's deals.
--   Each place can carry one deal: a short title, a line of detail, the days and hours it runs,
--   and an optional end date. Owners edit it from the Business dashboard (Deals tab); admins can too.
--   The existing "spots update" policy already limits edits to the place's own owner while their plan is active.
-- How to use: Supabase > SQL Editor > New query > paste this WHOLE file > Run. Safe to run again.
-- Needs schema.sql and schema_v3.sql to v8.sql first.
-- =====================================================================

alter table public.spots add column if not exists deal jsonb not null default '{}';

-- Keep deals short and well formed, so nothing odd can be stored and shown on the home page.
alter table public.spots drop constraint if exists spots_deal_ok;
alter table public.spots add constraint spots_deal_ok check (
  jsonb_typeof(deal) = 'object'
  and char_length(coalesce(deal->>'title', '')) <= 60
  and char_length(coalesce(deal->>'detail', '')) <= 160
  and (deal->'days' is null or jsonb_typeof(deal->'days') = 'array')
  and (deal->>'from' is null or deal->>'from' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  and (deal->>'to' is null or deal->>'to' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  and (deal->>'until' is null or deal->>'until' = '' or deal->>'until' ~ '^\d{4}-\d{2}-\d{2}$')
);
