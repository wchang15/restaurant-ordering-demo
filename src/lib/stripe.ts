import Stripe from 'stripe';
import type { CartItem } from '../types/order';
import type { Locale } from '../types/menu';
import { cents } from './order-pricing';

export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  // This public demonstration must never create live charges.
  if (!key || !/^(sk|rk)_test_/.test(key)) throw new Error('Configure a Stripe test-mode secret key.');
  return new Stripe(key, { maxNetworkRetries: 2 });
}

export function checkoutOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid NEXT_PUBLIC_APP_URL.');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Checkout requires a configured HTTPS origin.');
  return url.origin;
}

export function checkoutParameters({ orderId, items, tax, locale, storeSlug, tableToken, successUrl, cancelUrl }: {
  orderId: string; items: CartItem[]; tax: number; locale: Locale;
  storeSlug: string; tableToken: string; successUrl: string; cancelUrl: string;
}): Stripe.Checkout.SessionCreateParams {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
    quantity: item.quantity,
    price_data: { currency: 'usd', unit_amount: cents(item.unitPrice), product_data: { name: item.name[locale] || item.name.en } },
  }));
  if (tax > 0) lineItems.push({ quantity: 1, price_data: { currency: 'usd', unit_amount: cents(tax), product_data: { name: 'Tax (demo 10%)' } } });
  return {
    mode: 'payment', allowed_payment_method_types: ['card'], client_reference_id: orderId,
    success_url: successUrl, cancel_url: cancelUrl, line_items: lineItems,
    metadata: { order_id: orderId, store_slug: storeSlug, table_token: tableToken, locale },
    payment_intent_data: { metadata: { order_id: orderId } },
  };
}

export async function createStripeCheckoutSession(input: Parameters<typeof checkoutParameters>[0]) {
  return getStripeClient().checkout.sessions.create(checkoutParameters(input), { idempotencyKey: `order:${input.orderId}` });
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  return getStripeClient().checkout.sessions.retrieve(sessionId);
}

export function verifyStripeEvent(body: string, signature: string, secret: string) {
  return Stripe.webhooks.constructEvent(body, signature, secret);
}
