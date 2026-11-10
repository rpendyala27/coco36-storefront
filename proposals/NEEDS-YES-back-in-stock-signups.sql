-- NEEDS-YES. Do not apply this file. Rohan reviews it first.
--
-- Why this is a proposal in coco36-storefront, not a migration here:
-- This storefront has no supabase/ directory and no migrations. Order writes,
-- the service role, and the shared Supabase project are owned by the admin
-- app rpendyala27/coco36-next (see README and scripts/check-bundle-secrets.mjs).
-- That repo was not readable from this workspace (GitHub 404), so the SQL
-- could not be added on a coco36-next branch. Apply it there, as a new
-- migration, only after an explicit yes. Until then the storefront form
-- returns an error and does not pretend a sign-up was saved.
--
-- Access:
--   anon          INSERT of the public columns only. No SELECT, UPDATE, DELETE.
--   authenticated same. The storefront endpoint inserts with the anon key.
--   service_role  reads and sets sent_at (BYPASSRLS). No other role can read emails.
--
-- One row per product per email. A second insert hits the unique key and
-- changes nothing (ON CONFLICT DO NOTHING from the endpoint).

create table public.back_in_stock_signups (
  id uuid primary key default gen_random_uuid(),
  product_key text not null check (char_length(product_key) between 1 and 120),
  product_name text not null check (char_length(product_name) between 1 and 160),
  email text not null check (
    email = lower(email)
    and char_length(email) <= 254
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  phone text null check (phone is null or char_length(phone) between 8 and 20),
  audience text null check (audience is null or audience in ('home_baker', 'business')),
  pack_size text null check (pack_size is null or pack_size in ('small', '500g_1kg', 'bulk')),
  created_at timestamptz not null default now(),
  sent_at timestamptz null,
  sent_message_id text null,
  constraint back_in_stock_signups_one_per_email unique (product_key, email)
);

comment on table public.back_in_stock_signups is
  'One back-in-stock alert per product per email. Not a marketing list.';

alter table public.back_in_stock_signups enable row level security;
alter table public.back_in_stock_signups force row level security;

revoke all on table public.back_in_stock_signups from public, anon, authenticated;

grant insert (product_key, product_name, email, phone, audience, pack_size)
  on table public.back_in_stock_signups to anon, authenticated;

create policy back_in_stock_signups_insert
  on public.back_in_stock_signups
  for insert
  to anon, authenticated
  with check (
    sent_at is null
    and sent_message_id is null
    and char_length(product_key) > 0
    and char_length(email) > 0
  );

-- No SELECT, UPDATE, or DELETE policy. service_role bypasses RLS and is the
-- only role that may read rows or mark sent_at.

-- Rollback (do not run unless the owner asks to undo the table):
-- drop policy if exists back_in_stock_signups_insert on public.back_in_stock_signups;
-- revoke all on table public.back_in_stock_signups from public, anon, authenticated;
-- drop table if exists public.back_in_stock_signups;
