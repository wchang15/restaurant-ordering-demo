const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

async function main() {
  const env = process.env;
  if (env.ALLOW_REMOTE_CHECKOUT_TESTS !== 'yes' || !/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY || '')) throw new Error('Explicit test-only opt-in required.');
  if (!env.TEST_ORDER_ID || !env.TEST_APP_URL || !env.STRIPE_WEBHOOK_SECRET) throw new Error('Set TEST_ORDER_ID, TEST_APP_URL and STRIPE_WEBHOOK_SECRET.');
  const origin = new URL(env.TEST_APP_URL).origin;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const checks = [];
  const pass = (name) => { checks.push(name); console.log(`PASS ${name}`); };
  const load = async () => {
    const { data, error } = await db.from('orders').select('id,total,payment_session_id,payment_status,status,paid_at,customer_note').eq('id', env.TEST_ORDER_ID).single();
    if (error) throw error;
    return data;
  };
  const before = await load();
  assert.match(before.customer_note || '', /^Synthetic paid checkout verification/);
  pass('explicitly labeled synthetic order selected');
  const session = await stripe.checkout.sessions.retrieve(before.payment_session_id, { expand: ['payment_intent.latest_charge'] });
  assert.equal(session.livemode, false);
  assert.equal(session.status, 'complete');
  assert.equal(session.payment_status, 'paid');
  pass('test Checkout session completed and paid');
  assert.equal(session.client_reference_id, before.id);
  assert.equal(session.metadata.order_id, before.id);
  assert.equal(session.currency, 'usd');
  assert.equal(session.amount_total, Math.round(Number(before.total) * 100));
  pass('session identity, USD amount and server order match');
  assert.equal(session.payment_intent.status, 'succeeded');
  assert.equal(session.payment_intent.latest_charge.payment_method_details.card.last4, '4242');
  pass('official 4242 test card succeeded');
  assert.equal(before.payment_status, 'paid');
  assert.ok(before.paid_at);
  pass('database records paid status and timestamp');

  // Find the genuine provider event, rather than manufacturing a paid fixture.
  let event;
  for await (const candidate of stripe.events.list({ type: 'checkout.session.completed', created: { gte: session.created }, limit: 100 })) {
    if (candidate.data.object.id === session.id) { event = candidate; break; }
  }
  assert.ok(event, 'Completed event not found in Stripe event retention window.');
  assert.equal(event.livemode, false);
  assert.equal(event.pending_webhooks, 0);
  pass('Stripe completed event has no pending webhook deliveries');
  const body = JSON.stringify(event);
  for (let i = 0; i < 2; i++) {
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: env.STRIPE_WEBHOOK_SECRET });
    const response = await fetch(origin + '/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signature }, body });
    assert.equal(response.status, 200, 'Duplicate webhook was not acknowledged.');
  }
  pass('two authenticated completed-event replays acknowledged');
  assert.deepEqual(await load(), before);
  pass('replays preserve paid_at, amount and kitchen state');
  console.log(JSON.stringify({ passed: checks.length, amount: Number(before.total), currency: session.currency, livePayments: 0, boundary: 'Verifies an already-paid synthetic order. Does not initiate payment or establish payment without a return-page visit. Inspect the Stripe event destination separately.' }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
