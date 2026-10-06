import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { parseOrderPayload, priceOrder, CheckoutError } from '../src/lib/order-pricing';
import { checkoutParameters, verifyStripeEvent, getStripeClient, checkoutOrigin } from '../src/lib/stripe';
import { reconcilePayment, PaymentOrder, PaymentSession, PaymentRepository } from '../src/lib/payment-policy';
import type { MenuItem } from '../src/types/menu';

const name = { en: 'Dumplings', ko: 'Dumplings' };
const menu: MenuItem = { id: 'dish', categoryId: 'starters', name, description: name, price: 7.99, soldOut: false, options: [] };
const request = () => ({ storeSlug: 'demo', tableToken: 'table1', locale: 'en', items: [{ menuItemId: 'dish', name: { en: 'FORGED', ko: 'FORGED' }, quantity: 1, unitPrice: 7.99, lineTotal: 7.99, options: [] }] });

test('catalog prices and names are authoritative, including the Stripe payload', () => {
  const payload = parseOrderPayload(request());
  const priced = priceOrder(payload, [menu]);
  assert.deepEqual([priced.subtotal, priced.tax, priced.total], [7.99, 0.8, 8.79]);
  assert.deepEqual(priced.items[0].name, name);
  const checkout = checkoutParameters({ ...priced, orderId: 'order', locale: 'en', storeSlug: 'demo', tableToken: 'table1', successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel' });
  assert.equal(checkout.line_items?.[0].price_data?.unit_amount, 799);
  assert.equal(checkout.line_items?.[0].price_data?.product_data?.name, 'Dumplings');
  assert.equal(checkout.line_items?.[1].price_data?.unit_amount, 80);
});
for (const field of ['unitPrice', 'lineTotal'] as const) {
  test(`rejects a one-cent ${field} before persistence`, () => {
    const data = request(); data.items[0][field] = 0.01;
    assert.throws(() => priceOrder(parseOrderPayload(data), [menu]), (error: unknown) => error instanceof CheckoutError && error.status === 409);
  });
}
for (const quantity of [0, -1, 0.5, 101, Infinity, NaN, '1', null]) test(`rejects quantity ${quantity}`, () => {
  const data = request(); Object.assign(data.items[0], { quantity });
  assert.throws(() => parseOrderPayload(data), CheckoutError);
});
for (const amount of [-1, Infinity, NaN, 0.001, '7.99', null]) test(`rejects malformed amount ${amount}`, () => {
  const data = request(); Object.assign(data.items[0], { unitPrice: amount });
  assert.throws(() => parseOrderPayload(data), CheckoutError);
});
for (const data of [null, [], {}, { ...request(), items: [] }, { ...request(), items: Array(51).fill(request().items[0]) }, { ...request(), locale: '../admin' }, { ...request(), customerNote: 'x'.repeat(1001) }]) test('rejects malformed or oversized order', () => assert.throws(() => parseOrderPayload(data), CheckoutError));
test('foreign-store, inactive and sold-out items cannot be ordered', () => {
  const payload = parseOrderPayload(request());
  assert.throws(() => priceOrder(payload, []), CheckoutError);
  assert.throws(() => priceOrder(payload, [{ ...menu, soldOut: true }]), CheckoutError);
});
const optionMenu: MenuItem = { ...menu, options: [{ id: 'size', name, required: true, multiSelect: false, values: [{ id: 'large', name: { en: 'Large', ko: 'Large' }, priceDelta: 2 }, { id: 'small', name, priceDelta: 0 }] }] };
test('option IDs resolve to server names and price deltas', () => {
  const data = request(); Object.assign(data.items[0], { unitPrice: 9.99, lineTotal: 9.99, options: [{ groupId: 'size', valueId: 'large', priceDelta: -100, group: name, value: name }] });
  const priced = priceOrder(parseOrderPayload(data), [optionMenu]);
  assert.equal(priced.items[0].options[0].priceDelta, 2);
  assert.equal(priced.items[0].options[0].value.en, 'Large');
});
for (const options of [[], [{ groupId: 'other', valueId: 'large' }], [{ groupId: 'size', valueId: 'unknown' }], [{ groupId: 'size', valueId: 'large' }, { groupId: 'size', valueId: 'large' }], [{ groupId: 'size', valueId: 'large' }, { groupId: 'size', valueId: 'small' }], [{ group: name, value: name, priceDelta: 0 }]]) test('rejects missing, foreign, duplicate, excessive or legacy options', () => {
  const data = request(); Object.assign(data.items[0], { options });
  assert.throws(() => priceOrder(parseOrderPayload(data), [optionMenu]), CheckoutError);
});
test('three 10-cent items total 33 cents with rounded demo tax', () => {
  const data = request(); Object.assign(data.items[0], { quantity: 3, unitPrice: 0.1, lineTotal: 0.1 * 3 });
  assert.equal(priceOrder(parseOrderPayload(data), [{ ...menu, price: 0.1 }]).total, 0.33);
});

const session = (): PaymentSession => ({ id: 'cs_test_demo', client_reference_id: 'order', metadata: { order_id: 'order' }, payment_status: 'paid', status: 'complete', amount_total: 879, currency: 'usd', livemode: false, mode: 'payment' });
function fixture() {
  let order: PaymentOrder = { id: 'order', total: 8.79, payment_provider: 'stripe', payment_status: 'pending', payment_session_id: 'cs_test_demo', order_number: 1, status: 'NEW' };
  let writes = 0;
  const repo: PaymentRepository = {
    load: async () => ({ ...order }),
    compareAndSet: async (previous, next) => {
      if (previous.payment_status !== order.payment_status) return false;
      order = { ...order, payment_status: next }; writes++; return true;
    },
  };
  return { repo, get order() { return order; }, get writes() { return writes; } };
}
test('duplicate and simultaneous success notifications settle once', async () => {
  const f = fixture(); await Promise.all([reconcilePayment(session(), f.repo), reconcilePayment(session(), f.repo)]);
  await reconcilePayment(session(), f.repo); assert.equal(f.order.payment_status, 'paid'); assert.equal(f.writes, 1);
});
for (const change of [{ amount_total: 1 }, { currency: 'cad' }, { livemode: true }, { mode: 'subscription' }, { client_reference_id: 'other' }, { id: 'another-session' }, { metadata: {} }]) test(`rejects mismatched payment ${JSON.stringify(change)}`, async () => {
  const f = fixture(); await assert.rejects(reconcilePayment({ ...session(), ...change }, f.repo)); assert.equal(f.writes, 0);
});
test('unpaid completed checkout is not fulfilled', async () => {
  const f = fixture(); await reconcilePayment({ ...session(), payment_status: 'unpaid' }, f.repo); assert.equal(f.writes, 0);
});
test('late expiry cannot downgrade a paid order', async () => {
  const f = fixture(); await reconcilePayment(session(), f.repo);
  await reconcilePayment({ ...session(), payment_status: 'unpaid', status: 'expired' }, f.repo);
  assert.equal(f.order.payment_status, 'paid'); assert.equal(f.writes, 1);
});
test('expiry retries once; verified settlement can recover an earlier failure', async () => {
  const f = fixture(); const expired = { ...session(), payment_status: 'unpaid', status: 'expired' };
  await reconcilePayment(expired, f.repo); await reconcilePayment(expired, f.repo); assert.equal(f.writes, 1);
  await reconcilePayment(session(), f.repo); assert.equal(f.order.payment_status, 'paid');
});
test('database outage propagates for a non-2xx webhook retry', async () => {
  const f = fixture(); f.repo.compareAndSet = async () => { throw new Error('database offline'); };
  await assert.rejects(reconcilePayment(session(), f.repo), /database offline/);
});
test('CAS miss without settlement requests retry', async () => {
  const f = fixture(); f.repo.compareAndSet = async () => false;
  await assert.rejects(reconcilePayment(session(), f.repo), /retry/);
});
const secret = 'whsec_unit_test_only';
const body = JSON.stringify({ id: 'evt_demo', type: 'checkout.session.completed', data: { object: session() } });
test('Stripe SDK validates the exact raw body signature', () => {
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  assert.equal(verifyStripeEvent(body, header, secret).id, 'evt_demo');
  assert.throws(() => verifyStripeEvent(body + ' ', header, secret));
  assert.throws(() => verifyStripeEvent(body, header, 'whsec_wrong'));
  assert.throws(() => verifyStripeEvent(body, '', secret));
});
test('expired Stripe signatures are rejected', () => {
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp: Math.floor(Date.now() / 1000) - 600 });
  assert.throws(() => verifyStripeEvent(body, header, secret));
});
test('demo refuses live keys and invalid redirect origins', () => {
  const oldKey = process.env.STRIPE_SECRET_KEY; const oldOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const oldOverride = process.env.CHECKOUT_APP_ORIGIN;
  try {
    delete process.env.CHECKOUT_APP_ORIGIN;
    process.env.STRIPE_SECRET_KEY = 'sk_live_not_a_real_key'; assert.throws(getStripeClient);
    process.env.NEXT_PUBLIC_APP_URL = 'https://user:password@example.com'; assert.throws(checkoutOrigin);
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'; assert.equal(checkoutOrigin(), 'https://example.com');
    process.env.CHECKOUT_APP_ORIGIN = 'https://checkout.example.com'; assert.equal(checkoutOrigin(), 'https://checkout.example.com');
  } finally {
    if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = oldKey;
    if (oldOrigin === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = oldOrigin;
    if (oldOverride === undefined) delete process.env.CHECKOUT_APP_ORIGIN; else process.env.CHECKOUT_APP_ORIGIN = oldOverride;
  }
});
