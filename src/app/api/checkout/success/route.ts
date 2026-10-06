import { NextRequest, NextResponse } from 'next/server';
import { settleCheckout } from '@/lib/payment-service';
import { checkoutOrigin, retrieveStripeCheckoutSession } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  const origin = checkoutOrigin();
  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.redirect(new URL('/en/cart?payment=missing_session', origin));
  try {
    const session = await retrieveStripeCheckoutSession(sessionId);
    const metadata = session.metadata || {};
    const locale = metadata.locale === 'ko' ? 'ko' : 'en';
    const order = await settleCheckout(session);
    const paid = order.payment_status === 'paid';
    const url = new URL(`/${locale}/${paid ? 'order-complete' : 'cart'}`, origin);
    url.searchParams.set('store', metadata.store_slug || 'hanin');
    url.searchParams.set('table', metadata.table_token || '');
    url.searchParams.set('payment', paid ? 'paid' : 'incomplete');
    if (paid) url.searchParams.set('orderNumber', String(order.order_number));
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(new URL('/en/cart?payment=error', origin));
  }
}
