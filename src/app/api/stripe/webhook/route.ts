import { NextRequest, NextResponse } from 'next/server';
import { retrieveStripeCheckoutSession, verifyStripeEvent } from '@/lib/stripe';
import { settleCheckout } from '@/lib/payment-service';

export const runtime = 'nodejs';
const handledEvents = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired']);

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  const rawBody = await request.text();
  if (rawBody.length > 65536) return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  let event;
  try { event = verifyStripeEvent(rawBody, signature, secret); }
  catch { return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 }); }
  if (event.livemode) return NextResponse.json({ error: 'Live events are disabled.' }, { status: 400 });
  if (!handledEvents.has(event.type)) return NextResponse.json({ received: true });
  try {
    // Retrieve current Stripe state so out-of-order notifications cannot regress it.
    const object = event.data.object;
    if (!('id' in object) || typeof object.id !== 'string') return NextResponse.json({ error: 'Invalid session event.' }, { status: 400 });
    const session = await retrieveStripeCheckoutSession(object.id);
    if (!session.metadata?.order_id) return NextResponse.json({ received: true });
    await settleCheckout(session, event.type === 'checkout.session.async_payment_failed');
    return NextResponse.json({ received: true });
  } catch {
    console.error('Stripe reconciliation failed; event will be retried.', event.id);
    return NextResponse.json({ error: 'Payment reconciliation must be retried.' }, { status: 503 });
  }
}
