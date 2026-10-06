import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus } from '@/lib/order-service';
import { requireAdmin, adminErrorResponse } from '@/lib/admin-auth';
import { parseStatusUpdate } from '@/lib/admin-policy';

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin(request);
    const body = parseStatusUpdate(await request.json());
    await updateOrderStatus(body.orderId, body.status, body.expectedStatus, access.storeIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
