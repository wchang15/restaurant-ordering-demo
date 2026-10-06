import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

if (process.env.ALLOW_REMOTE_AUTH_TESTS !== 'yes' || !process.env.TEST_APP_URL) {
  throw new Error('Set ALLOW_REMOTE_AUTH_TESTS=yes and TEST_APP_URL. This creates and removes one temporary Auth user.');
}

const origin = new URL(process.env.TEST_APP_URL).origin;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const server = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const browser = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const slug = process.env.TEST_STORE_SLUG || 'hanin';
let passed = 0;
let userId;
let token;

function check(name, assertion) {
  assertion();
  console.log(`PASS ${name}`);
  passed++;
}

async function request(path, expectedStatus, init = {}) {
  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, expectedStatus, `${path}: expected ${expectedStatus}, got ${response.status}`);
  return response;
}

async function assign(storeIds) {
  const { error } = await server.auth.admin.updateUserById(userId, {
    app_metadata: { admin_store_ids: storeIds, temporary_integration_test: true },
  });
  if (error) throw error;
}

try {
  for (const table of ['orders', 'order_items', 'kitchen_printers', 'order_dispatches']) {
    const result = await browser.from(table).select('id', { head: true });
    check(`anonymous ${table} read denied`, () => assert.equal(result.status, 401));
  }
  for (const path of ['/api/admin/orders', '/api/admin/session', '/api/admin/tables']) {
    await request(path, 401);
    check(`anonymous ${path} denied`, () => {});
  }
  await request('/api/admin/orders/status', 401, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  check('anonymous order mutation denied', () => {});

  const { data: store, error: storeError } = await server.from('stores').select('id').eq('slug', slug).single();
  if (storeError) throw storeError;
  const email = `portfolio-auth-test-${randomUUID()}@example.com`;
  const password = `${randomUUID()}${randomUUID()}`;
  const created = await server.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { temporary_integration_test: true },
  });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const signedIn = await browser.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  token = signedIn.data.session.access_token;
  await request('/api/admin/session', 403);
  check('authenticated account without stores denied', () => {});

  const forged = await browser.auth.updateUser({ data: { admin_store_ids: [store.id] } });
  if (forged.error) throw forged.error;
  await request('/api/admin/session', 403);
  check('editable user metadata cannot grant access', () => {});

  await assign([store.id]);
  const session = await (await request('/api/admin/session', 200)).json();
  check('assigned store session verified', () => assert.deepEqual(session.storeIds, [store.id]));
  const orders = await (await request('/api/admin/orders', 200)).json();
  check('assigned store orders available', () => assert.ok(Array.isArray(orders.orders)));
  const tables = await (await request(`/api/admin/tables?store=${encodeURIComponent(slug)}`, 200)).json();
  check('assigned store tables available', () => assert.ok(tables.tables.length > 0));
  const direct = await browser.from('orders').select('id', { head: true });
  check('authenticated direct database read denied', () => assert.equal(direct.status, 403));

  await assign([randomUUID()]);
  await request(`/api/admin/tables?store=${encodeURIComponent(slug)}`, 404);
  check('unassigned store tables denied', () => {});
  const scoped = await (await request('/api/admin/orders', 200)).json();
  check('different store scope returns no orders', () => assert.deepEqual(scoped.orders, []));
  if (orders.orders.length) {
    await request('/api/admin/orders/status', 404, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orders.orders[0].id, status: 'READY', expectedStatus: 'ACCEPTED' }),
    });
    check('unassigned store order mutation denied', () => {});
  }
  console.log(`${passed} live access checks passed; no restaurant records were changed.`);
} finally {
  if (userId) {
    const { error } = await server.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Remove temporary Auth user ${userId}: ${error.message}`);
    console.log('Temporary Auth user removed.');
  }
}
