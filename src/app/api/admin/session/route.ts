import { NextResponse } from 'next/server';
import { requireAdmin, adminErrorResponse } from '@/lib/admin-auth';

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request);
    return NextResponse.json(access, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return adminErrorResponse(error); }
}
