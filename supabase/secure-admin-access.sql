-- Run after schema.sql, using the database owner in Supabase SQL Editor.
-- Customer data access is server-side; browsers must use authenticated admin APIs.
begin;
alter table public.stores enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_option_groups enable row level security;
alter table public.menu_option_values enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.kitchen_printers enable row level security;
alter table public.order_dispatches enable row level security;

revoke all on public.stores, public.restaurant_tables, public.categories,
  public.menu_items, public.menu_option_groups, public.menu_option_values,
  public.orders, public.order_items, public.kitchen_printers, public.order_dispatches
  from anon, authenticated;
grant all on public.stores, public.restaurant_tables, public.categories,
  public.menu_items, public.menu_option_groups, public.menu_option_values,
  public.orders, public.order_items, public.kitchen_printers, public.order_dispatches
  to service_role;
commit;

-- Assign store access ONLY through the server-side Supabase Admin API or dashboard:
-- app_metadata: { "admin_store_ids": ["<stores.id UUID>"] }
-- Never grant this permission through user_metadata or a public signup endpoint.
