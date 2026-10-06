-- Synthetic catalog only. Run in a dedicated empty demo project after schema.sql.
begin;
insert into stores (id, name_en, name_ko, slug)
values ('00000000-0000-4000-8000-000000000001', 'Demo Kitchen', 'Demo Kitchen', 'hanin')
on conflict (id) do nothing;
insert into restaurant_tables (id, store_id, name, qr_token)
values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'T1', 'qr_hanin_t1')
on conflict (id) do nothing;
insert into categories (id, store_id, name_en, name_ko, sort_order)
values ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Demo dishes', 'Demo dishes', 1)
on conflict (id) do nothing;
insert into menu_items (id, store_id, category_id, name_en, name_ko, price, sort_order)
values
('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'Dumplings', 'Dumplings', 7.99, 1),
('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'Rice bowl', 'Rice bowl', 12.99, 2)
on conflict (id) do nothing;
insert into menu_option_groups (id, menu_item_id, name_en, name_ko, required, multi_select)
values ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000005', 'Size', 'Size', true, false)
on conflict (id) do nothing;
insert into menu_option_values (id, option_group_id, name_en, name_ko, price_delta)
values
('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000006', 'Regular', 'Regular', 0),
('00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000006', 'Large', 'Large', 2)
on conflict (id) do nothing;
commit;
