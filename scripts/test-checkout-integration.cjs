const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (process.env.ALLOW_REMOTE_CHECKOUT_TESTS !== 'yes' || !/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY || '')) throw new Error('Explicit test-only opt-in required.');
  const { TEST_APP_URL, TEST_STORE_SLUG: storeSlug, TEST_TABLE_TOKEN: tableToken, TEST_MENU_ITEM_NAME: menuName } = process.env;
  if (!TEST_APP_URL || !storeSlug || !tableToken || !menuName) throw new Error('Set TEST_APP_URL, TEST_STORE_SLUG, TEST_TABLE_TOKEN and TEST_MENU_ITEM_NAME.');
  const origin = new URL(TEST_APP_URL).origin;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const checks = [];
  const check = (name) => { checks.push(name); console.log(`PASS ${name}`); };
  const send = (path, body, headers = {}) => fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  assert.equal((await send('/api/checkout', {})).status, 400); check('malformed checkout rejected');
  assert.equal((await send('/api/stripe/webhook', {})).status, 400); check('unsigned webhook rejected');
  const { data: store, error: storeError } = await db.from('stores').select('id').eq('slug', storeSlug).single();
  if (storeError) throw storeError;
  const { data: item, error: itemError } = await db.from('menu_items').select('id,price,name_en').eq('store_id', store.id).eq('active', true).eq('sold_out', false).eq('name_en', menuName).single();
  if (itemError) throw itemError;
  const note = `Synthetic checkout regression ${randomUUID()}`;
  const payload = { storeSlug, tableToken, locale: 'en', customerNote: note, appOrigin: 'https://untrusted.example', items: [{ menuItemId: item.id, name: { en: 'CLIENT FORGED NAME', ko: 'CLIENT FORGED NAME' }, quantity: 1, unitPrice: Number(item.price), lineTotal: Number(item.price), options: [] }] };
  const tampered = structuredClone(payload); tampered.items[0].unitPrice = 0.01; tampered.items[0].lineTotal = 0.01;
  const rejected = await send('/api/checkout', tampered);
  assert.equal(rejected.status, 409, (await rejected.json()).error); check('one-cent price rejected by deployed server');
  const { count } = await db.from('orders').select('id', { count: 'exact', head: true }).eq('customer_note', note);
  assert.equal(count, 0); check('rejected quote creates no order');
  const response = await send('/api/checkout', payload); const result = await response.json();
  assert.equal(response.status, 200, result.error || 'Checkout failed'); check('valid test checkout created');
  const load = async () => {
    const { data, error } = await db.from('orders').select('id,total,payment_session_id,payment_status,status,paid_at,order_items(item_name_snapshot_en,line_total)').eq('customer_note', note).single();
    if (error) throw error; return data;
  };
  const order = await load();
  const session = await stripe.checkout.sessions.retrieve(order.payment_session_id);
  assert.equal(session.livemode, false); assert.equal(session.amount_total, Math.round(Number(order.total) * 100)); check('Stripe test amount equals server snapshot');
  assert.equal(order.order_items[0].item_name_snapshot_en, item.name_en); check('client name is not persisted');
  assert.ok(session.success_url.startsWith(origin + '/')); check('untrusted client origin ignored');
  const cancelQuery = new URLSearchParams({ order_id: order.id, locale: 'en', store: storeSlug, table: tableToken });
  await fetch(`${origin}/api/checkout/cancel?${cancelQuery}`, { redirect: 'manual' });
  assert.equal((await load()).payment_status, 'pending'); check('cancel navigation cannot fail an order');
  await stripe.checkout.sessions.expire(session.id);
  let settled;
  for (let i = 0; i < 30; i++) {
    settled = await load(); if (settled.payment_status === 'failed') break;
    await sleep(2000);
  }
  assert.equal(settled.payment_status, 'failed'); assert.equal(settled.status, 'CANCELLED'); check('actual Stripe expiry webhook updates the order without a redirect');
  const events = await stripe.events.list({ type: 'checkout.session.expired', limit: 20 });
  const event = events.data.find((entry) => entry.data.object.id === session.id);
  assert.ok(event);
  const body = JSON.stringify(event);
  for (let i = 0; i < 2; i++) {
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const duplicate = await fetch(origin + '/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signature }, body });
    assert.equal(duplicate.status, 200);
  }
  assert.equal((await load()).payment_status, 'failed'); check('authenticated duplicate webhook delivery is idempotent');
  console.log(JSON.stringify({ passed: checks.length, amount: order.total, livePayments: 0, boundary: 'No card payment made. Expiry delivery verified; paid settlement covered by offline tests.' }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
