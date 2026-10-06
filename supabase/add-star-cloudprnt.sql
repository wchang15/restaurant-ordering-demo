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

alter table order_dispatches
  add column if not exists printer_id uuid references kitchen_printers(id) on delete set null;

create index if not exists idx_kitchen_printers_store on kitchen_printers(store_id, active);
create index if not exists idx_order_dispatches_printer_status on order_dispatches(printer_id, status, created_at);
create unique index if not exists idx_order_dispatches_order_printer_provider
  on order_dispatches(order_id, printer_id, provider);

-- Example printer registration. Replace the token with a long random value,
-- then enter this URL in the Star printer CloudPRNT server setting:
-- https://YOUR_DOMAIN.com/api/cloudprnt/YOUR_RANDOM_TOKEN
--
-- insert into kitchen_printers (store_id, name, cloudprnt_token)
-- select id, 'Kitchen Printer', 'replace-with-long-random-token'
-- from stores
-- where slug = 'hanin';
