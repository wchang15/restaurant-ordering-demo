import { NextRequest, NextResponse } from 'next/server';
import { createOrderFromPayload } from '@/lib/order-service';
import { parseOrderPayload, CheckoutError } from '@/lib/order-pricing';

export async function POST(request: NextRequest) {
  try {
    const payload = parseOrderPayload(await request.json());

    const order = await createOrderFromPayload(payload, {
      paymentProvider: 'counter',
      paymentStatus: 'pay_at_counter',
      createDispatch: false,
    });

    return NextResponse.json({ ok: true, orderId: order.id, orderNumber: order.orderNumber, tableName: order.tableName });
  } catch (error) {
    if (!(error instanceof CheckoutError)) console.error('Unable to create order.');
    return NextResponse.json(
      { error: error instanceof CheckoutError ? error.message : error instanceof SyntaxError ? 'Invalid JSON.' : 'Unable to create order.' },
      { status: error instanceof CheckoutError ? error.status : error instanceof SyntaxError ? 400 : 500 }
    );
  }
}
