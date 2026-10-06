import { NextResponse } from 'next/server';
import { authorizeAdmin, AdminError } from '@/lib/admin-policy';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export function requireAdmin(request: Request) {
  return authorizeAdmin(request.headers.get('authorization'), async (token) => {
    const { data, error } = await createSupabaseServerClient().auth.getUser(token);
    return error ? null : data.user;
  });
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  console.error('Admin request failed', error);
  return NextResponse.json({ error: 'Request failed. Please try again.' }, { status: 500 });
}
