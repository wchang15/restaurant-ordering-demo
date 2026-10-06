import { NextResponse } from 'next/server';
import { requireAdmin, adminErrorResponse } from '@/lib/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request);
    const { data, error } = await createSupabaseServerClient().from('orders')
      .select('id, order_number, status, payment_status, customer_note, total, created_at, restaurant_tables(name), order_items(id, item_name_snapshot_en, item_name_snapshot_ko, quantity, line_total, options_snapshot)')
      .in('store_id', access.storeIds)
      .in('payment_status', ['paid', 'pay_at_counter'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ orders: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return adminErrorResponse(error); }
}
