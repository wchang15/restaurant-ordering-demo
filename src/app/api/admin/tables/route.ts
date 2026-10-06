import { NextResponse } from 'next/server';
import { requireAdmin, adminErrorResponse } from '@/lib/admin-auth';
import { AdminError } from '@/lib/admin-policy';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request);
    const client = createSupabaseServerClient();
    const slug = new URL(request.url).searchParams.get('store') || 'hanin';
    const { data: store, error: storeError } = await client.from('stores').select('id')
      .eq('slug', slug).in('id', access.storeIds).maybeSingle();
    if (storeError) throw storeError;
    if (!store) throw new AdminError(404, 'Store not found.');
    const { data, error } = await client.from('restaurant_tables').select('id, name, qr_token')
      .eq('store_id', store.id).eq('active', true).order('name', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ tables: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return adminErrorResponse(error); }
}
