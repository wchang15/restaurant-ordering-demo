import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdminError, authorizeAdmin, parseStatusUpdate, validateStatusChange, nextOrderStatuses, orderStatuses } from '../src/lib/admin-policy';

const storeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const orderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const user = { id: 'staff', app_metadata: { admin_store_ids: [storeId] } };
const failsWith = (status: number) => (error: unknown) => error instanceof AdminError && error.status === status;

test('missing credentials fail before token verification', async () => {
  let called = false;
  await assert.rejects(authorizeAdmin(null, async () => { called = true; return user; }), failsWith(401));
  assert.equal(called, false);
});

for (const header of ['', 'Basic abc', 'Bearer ', 'Bearer a b']) {
  test(`rejects malformed authorization: ${JSON.stringify(header)}`, async () => {
    await assert.rejects(authorizeAdmin(header, async () => user), failsWith(401));
  });
}

test('invalid or revoked session is rejected', async () => {
  await assert.rejects(authorizeAdmin('Bearer expired', async () => null), failsWith(401));
});

test('valid account without assigned stores is forbidden', async () => {
  await assert.rejects(authorizeAdmin('Bearer valid', async () => ({ id: 'customer', app_metadata: {} })), failsWith(403));
});

test('editable user metadata cannot grant staff access', async () => {
  const customer = { id: 'customer', user_metadata: { admin_store_ids: [storeId], role: 'admin' } };
  await assert.rejects(authorizeAdmin('Bearer valid', async () => customer), failsWith(403));
});

for (const stores of [[], '*', ['*'], [storeId, null], [1]]) {
  test(`rejects invalid store permissions: ${JSON.stringify(stores)}`, async () => {
    await assert.rejects(authorizeAdmin('Bearer valid', async () => ({ id: 'staff', app_metadata: { admin_store_ids: stores } })), failsWith(403));
  });
}

test('verified account receives only server-assigned stores', async () => {
  assert.deepEqual(await authorizeAdmin('Bearer valid', async token => {
    assert.equal(token, 'valid');
    return { ...user, app_metadata: { admin_store_ids: [storeId, storeId] } };
  }), { userId: 'staff', storeIds: [storeId] });
});

for (const body of [null, [], {}, { orderId: 'bad', status: 'READY', expectedStatus: 'ACCEPTED' },
  { orderId, status: 'READY' }, { orderId, status: 'UNKNOWN', expectedStatus: 'NEW' }]) {
  test(`rejects invalid mutation payload: ${JSON.stringify(body)}`, () => {
    assert.throws(() => parseStatusUpdate(body), failsWith(400));
  });
}

test('parses a valid compare-and-set request', () => {
  const value = { orderId, status: 'ACCEPTED', expectedStatus: 'NEW' };
  assert.deepEqual(parseStatusUpdate(value), value);
});

for (const current of orderStatuses) {
  for (const next of orderStatuses) {
    test(`order transition ${current} -> ${next}`, () => {
      if (current === next || nextOrderStatuses[current].includes(next)) {
        assert.doesNotThrow(() => validateStatusChange(current, next, current, 'paid'));
      } else {
        assert.throws(() => validateStatusChange(current, next, current, 'paid'), failsWith(409));
      }
    });
  }
}

for (const payment of ['pending', 'failed', null, 'unknown']) {
  test(`cannot fulfill an order with payment state ${payment}`, () => {
    assert.throws(() => validateStatusChange('NEW', 'ACCEPTED', 'NEW', payment), failsWith(409));
  });
}

test('pay-at-counter orders can be accepted', () => {
  assert.doesNotThrow(() => validateStatusChange('NEW', 'ACCEPTED', 'NEW', 'pay_at_counter'));
});

test('stale operator screen cannot advance a different state', () => {
  assert.throws(() => validateStatusChange('ACCEPTED', 'READY', 'NEW', 'paid'), failsWith(409));
});

test('same-state retry is idempotent after a successful transition', () => {
  assert.doesNotThrow(() => validateStatusChange('ACCEPTED', 'ACCEPTED', 'NEW', 'paid'));
});
