import { NextRequest, NextResponse } from 'next/server';
import { createOrderFromPayload, updateOrderPaymentSession } from '@/lib/order-service';
import { createStripeCheckoutSession, checkoutOrigin, getStripeClient } from '@/lib/stripe';
import { parseOrderPayload, CheckoutError } from '@/lib/order-pricing';

export async function POST(request: NextRequest) {
  try {
    const payload = parseOrderPayload(await request.json());
    const origin = checkoutOrigin();
    getStripeClient();
    const order = await createOrderFromPayload(payload, {
      paymentProvider: 'stripe',
      paymentStatus: 'pending',
      createDispatch: false,
    });

    const successUrl = `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/api/checkout/cancel?order_id=${encodeURIComponent(
      order.id
    )}&store=${encodeURIComponent(
      payload.storeSlug
    )}&table=${encodeURIComponent(payload.tableToken)}&locale=${encodeURIComponent(payload.locale)}`;

    const session = await createStripeCheckoutSession({
      orderId: order.id,
      items: order.items,
      tax: order.tax,
      locale: payload.locale,
      storeSlug: payload.storeSlug,
      tableToken: payload.tableToken,
      successUrl,
      cancelUrl,
    });

    await updateOrderPaymentSession(order.id, session.id);

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL.');
    }

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    if (!(error instanceof CheckoutError) && !(error instanceof SyntaxError)) console.error('Unable to start checkout.');
    return NextResponse.json(
      { error: error instanceof CheckoutError ? error.message : error instanceof SyntaxError ? 'Invalid JSON.' : 'Unable to start card payment. Please try again.' },
      { status: error instanceof CheckoutError ? error.status : error instanceof SyntaxError ? 400 : 500 }
    );
  }
}
