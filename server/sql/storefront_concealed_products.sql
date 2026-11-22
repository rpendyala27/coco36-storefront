-- Narrow read of products the public catalogue hides.
-- Applied on the shared Supabase project (COCO36 Admin). The storefront
-- calls this with the anon key from server/catalog.ts. It returns name,
-- status and deleted_at only — no prices, suppliers, tax or licence data.
--
-- RLS on products lets anon read status = 'active' AND deleted_at IS NULL.
-- This function is security definer so a product URL can 301 when the row
-- is archived, draft, deleted, or any other non-visible state. Do not widen
-- the column list.

create or replace function public.storefront_concealed_products()
returns table (name text, status text, deleted_at timestamptz)
language sql
stable
security definer
set search_path to public
as $$
  select p.name, p.status, p.deleted_at
    from public.products p
   where p.name is not null
     and (p.status is distinct from 'active' or p.deleted_at is not null);
$$;

revoke all on function public.storefront_concealed_products() from public;
grant execute on function public.storefront_concealed_products() to anon, authenticated, service_role;

comment on function public.storefront_concealed_products() is
  'Name and visibility of products hidden from the public catalogue (not active, or deleted). Storefront uses this only to 301 those product URLs to /shop. No prices, suppliers, or tax data.';
