create extension if not exists pgcrypto;

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ko text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  qr_token text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name_en text not null,
  name_ko text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  name_en text not null,
  name_ko text not null,
  description_en text,
  description_ko text,
  price numeric(10,2) not null,
  image_url text,
  video_url text,
  sold_out boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists menu_option_groups (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  name_en text not null,
  name_ko text not null,
  required boolean not null default false,
  multi_select boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists menu_option_values (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references menu_option_groups(id) on delete cascade,
  name_en text not null,
  name_ko text not null,
  price_delta numeric(10,2) not null default 0,
  sort_order integer not null default 0
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete restrict,
  table_id uuid not null references restaurant_tables(id) on delete restrict,
  order_number bigint generated always as identity unique,
  customer_note text,
  status text not null default 'NEW' check (status in ('NEW','ACCEPTED','COOKING','READY','COMPLETED','CANCELLED')),
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  source text not null default 'qr_web',
  locale text not null default 'en' check (locale in ('en','ko')),
  payment_provider text not null default 'counter' check (payment_provider in ('counter','stripe')),
  payment_status text not null default 'pay_at_counter' check (payment_status in ('pending','paid','pay_at_counter','failed')),
  payment_session_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists kitchen_printers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  provider text not null default 'star_cloudprnt' check (provider in ('star_cloudprnt')),
  cloudprnt_token text not null unique,
  printer_mac text,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete restrict,
  item_name_snapshot_en text not null,
  item_name_snapshot_ko text not null,
  unit_price_snapshot numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  options_snapshot jsonb not null default '[]'::jsonb,
  line_total numeric(10,2) not null
);

create table if not exists order_dispatches (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  printer_id uuid references kitchen_printers(id) on delete set null,
  target_type text not null default 'kds' check (target_type in ('printer','pos','kds')),
  provider text not null default 'dummy',
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  payload jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_store on categories(store_id, sort_order);
create index if not exists idx_menu_items_store_category on menu_items(store_id, category_id, sort_order);
create index if not exists idx_orders_store_status_created on orders(store_id, status, created_at desc);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_tables_store on restaurant_tables(store_id);
create index if not exists idx_kitchen_printers_store on kitchen_printers(store_id, active);
create index if not exists idx_order_dispatches_printer_status on order_dispatches(printer_id, status, created_at);
create unique index if not exists idx_order_dispatches_order_printer_provider
  on order_dispatches(order_id, printer_id, provider);

alter publication supabase_realtime add table orders;
