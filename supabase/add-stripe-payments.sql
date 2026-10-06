alter table orders
  add column if not exists payment_provider text not null default 'counter',
  add column if not exists payment_status text not null default 'pay_at_counter',
  add column if not exists payment_session_id text,
  add column if not exists paid_at timestamptz;

alter table orders
  drop constraint if exists orders_payment_provider_check,
  add constraint orders_payment_provider_check
    check (payment_provider in ('counter','stripe'));

alter table orders
  drop constraint if exists orders_payment_status_check,
  add constraint orders_payment_status_check
    check (payment_status in ('pending','paid','pay_at_counter','failed'));
