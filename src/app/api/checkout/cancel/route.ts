import { NextRequest, NextResponse } from 'next/server';
import { checkoutOrigin } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  const store = request.nextUrl.searchParams.get('store') || 'hanin';
  const table = request.nextUrl.searchParams.get('table') || '';
  const locale = request.nextUrl.searchParams.get('locale') === 'ko' ? 'ko' : 'en';

  // Returning from Checkout is navigation, not proof of a failed payment.
  const cartUrl = new URL(`/${locale}/cart`, checkoutOrigin());
  cartUrl.searchParams.set('store', store);
  cartUrl.searchParams.set('table', table);
  cartUrl.searchParams.set('payment', 'cancelled');

  return NextResponse.redirect(cartUrl);
}
