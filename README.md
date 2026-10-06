# Restaurant Ordering Demo

[![Checks](https://github.com/wchang15/restaurant-ordering-demo/actions/workflows/ci.yml/badge.svg)](https://github.com/wchang15/restaurant-ordering-demo/actions/workflows/ci.yml)

[Case study](https://www.woochangchang.com/restaurant-platform.html) · [Customer test demo](https://www.wc-qr.com/en/menu?store=hanin&table=qr_hanin_t1) · [Tablet companion](https://github.com/wchang15/menu)

A TypeScript/Next.js restaurant workflow with PostgreSQL-backed menu pricing,
Stripe test checkout, store-scoped staff access, and CloudPRNT dispatch.
Internal-test software, not a live restaurant or production-readiness claim.

## Code Review Guide

| Question | Implementation | Regression evidence |
| --- | --- | --- |
| Can a browser change the price? | [Pricing](src/lib/order-pricing.ts), [order snapshots](src/lib/order-service.ts) | [One-cent tampering, unavailable items, option membership, integer-cent rounding](tests/checkout.test.ts) |
| Does payment depend on a return page? | [Webhook](src/app/api/stripe/webhook/route.ts), [settlement policy](src/lib/payment-policy.ts) | [Raw-body signatures, duplicate/concurrent notifications, retry, currency/session/amount binding](tests/checkout.test.ts) |
| Can one restaurant read another's orders? | [Policy](src/lib/admin-policy.ts), [database access](supabase/secure-admin-access.sql) | [Auth metadata, store scope, payment-gated state changes, stale writes](tests/admin-policy.test.ts) |
| When does printing begin? | `src/lib/order-service.ts`, `src/lib/cloudprnt-service.ts` | Staff acceptance creates a dispatch; physical printer recovery remains unverified |

The customer submits item/option IDs, quantities, and a displayed quote. The server
resolves its own active store catalog, creates authoritative snapshots, and rejects
a stale quote with HTTP 409 before saving an order. The same snapshots supply Stripe.
Client item names and option prices are not trusted. The demo tax rate is 10% in USD.

Signed webhooks and the success page use the same reconciliation function. It
checks the order/session binding, amount, currency, and test mode, then performs a
conditional update. Repeated settlement does not change `paid_at`; a late failure
cannot undo payment. Transient failures return 503 so Stripe can retry. Merely
visiting the cancel URL never changes an order. API keys for live payments are refused.

Original ordering, Stripe, CloudPRNT and tablet integration work dates to Circle POS
(Dec 2025-May 2026). Server repricing, webhook reconciliation, access hardening and
regression tests were added in the October 2026 AI-assisted demo review. The public
snapshot is for engineering review, with no customer records or production secrets.

## Features
- English / Korean customer ordering flow
- QR table entry
- Cart + Stripe card checkout
- Star Micronics CloudPRNT kitchen printer queue
- Store-scoped staff order board with authenticated API polling
- Admin QR generator page
- Order item option snapshots
- Future-ready dispatch table for POS / kitchen printer integration

## Setup
1. Install Node.js 22 or 24. Create a dedicated Supabase demo project.
2. Run `supabase/schema.sql`, `supabase/secure-admin-access.sql`, and `supabase/seed.sql`.
   The seed contains two synthetic menu items with one size option; no real orders,
   customers, staff accounts, or printer tokens. The retained branding is a visual
   reference, not evidence that this demo was used by a live restaurant.
3. Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_TEST_ENDPOINT_SECRET
```

If you already created the Supabase tables before adding card payment, run
`supabase/add-stripe-payments.sql` once in the Supabase SQL editor.

If you already created the Supabase tables before adding Star CloudPRNT,
run `supabase/add-star-cloudprnt.sql` once in the Supabase SQL editor.

4. Before exposing the app publicly, run `supabase/secure-admin-access.sql`.
   It closes direct browser access to the restaurant tables, orders, and printer tokens.
   All menu and admin reads now go through server routes. This migration must be applied
   to the actual Supabase project; a frontend login screen alone does not protect the database.

5. Create or invite a staff account in Supabase Auth. Through the server-side Admin API
   or dashboard, assign `app_metadata.admin_store_ids` to an array of the store UUIDs
   this person manages. Do not use editable `user_metadata`, and do not make all signed-in
   accounts administrators. `/admin/orders`, history, and QR management share the staff login.
   Set the Auth Site URL and allowed redirect URL to your deployed `/admin/orders` page.
   Invited staff can sign in by email link without creating a shared demo password;
   the login page does not register new accounts. Password login remains available for
   staff who already configured a password.

6. Install packages:

```bash
npm install
```

7. Run:

```bash
npm run dev
```

For phone testing on the same Wi-Fi, run:

```bash
npm run dev:lan
```

Then open `http://YOUR_MAC_LAN_IP:3000/ko/order?store=hanin&table=qr_hanin_t1`
on your phone. If your Mac IP changes, update `allowedDevOrigins` in
`next.config.js` and `NEXT_PUBLIC_APP_URL` in `.env.local`.

## Routes
- `/en/order?store=hanin&table=qr_hanin_t1`
- `/ko/order?store=hanin&table=qr_hanin_t1`
- `/admin/orders`
- `/admin/qr?store=hanin`
- `/api/cloudprnt/[token]`
- `/api/stripe/webhook` (POST, signed Stripe test events only)

## Stripe Test Webhook Setup

Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS origin. Checkout redirects use only
this configured value, never a browser-supplied origin. Local development can use HTTP.
Create a **test-mode** Stripe webhook endpoint at `https://YOUR_DOMAIN/api/stripe/webhook`
with `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, and `checkout.session.expired`. Store that
endpoint's signing secret as server-only `STRIPE_WEBHOOK_SECRET` and redeploy.
Never put secret keys in a `NEXT_PUBLIC_` variable. For local forwarding, use the
official Stripe CLI's test listener and its separate signing secret.

Verify a test checkout without visiting the success page, resend its notification,
and confirm a single paid transition with the original `paid_at`. Unsigned POSTs
must return 400; a missing endpoint secret returns 503. Unit tests are offline and
do not prove that a deployed endpoint has been configured correctly.

## Star CloudPRNT Kitchen Printing
Use a Star CloudPRNT-compatible printer such as mC-Print3 or TSP100IV.

1. Register the printer in Supabase:

```sql
insert into kitchen_printers (store_id, name, cloudprnt_token)
select id, 'Kitchen Printer', 'replace-with-long-random-token'
from stores
where slug = 'hanin';
```

2. In the printer Web Configuration, set the CloudPRNT server URL to:

```text
https://YOUR_DOMAIN.com/api/cloudprnt/replace-with-long-random-token
```

Staff-accepted paid Stripe orders and pay-at-counter orders create pending Star CloudPRNT
dispatches. The printer polls the endpoint, downloads a text kitchen ticket,
and marks the dispatch sent after printing completes.

## Verification

Run `node scripts/check-public-source.cjs`, `npm test`, and `npm run build`.
Tests need no database or Stripe key. Builds need the two public Supabase variables
(the same placeholders used by CI are sufficient to compile). The preflight scans
selected credential patterns; it is not a comprehensive secret or security audit.

`npm test` runs 113 checks covering catalog pricing, options, signed payment events,
retry reconciliation, authorization, untrusted user metadata, payload validation, the full
order transition matrix, payment gating, stale updates, and idempotent retries. Tests use
Node's test runner and TypeScript, without contacting Supabase or Stripe. The staff API
validates sessions with Supabase Auth, scopes reads and writes to assigned stores, and
uses a conditional database update to avoid overwriting concurrent state changes.

Deployment checklist: apply the SQL access migration, assign a real staff account, verify
anonymous database reads fail, check allowed/forbidden store access, then test staff login,
customer ordering, and a test-mode printer dispatch. Local policy tests are not a substitute
for this integration check. The public portfolio screenshots contain test orders.

The hosted demo passed 17 live access checks on October 6, 2026 after the access migration.
To repeat the access checks against a configured demo project:

```bash
ALLOW_REMOTE_AUTH_TESTS=yes TEST_APP_URL=https://YOUR_DOMAIN.com \
  node --env-file=.env.local scripts/test-admin-integration.mjs
```

This explicitly creates one temporary Supabase Auth user, tests missing and assigned store
permissions (including untrusted user metadata), then removes that test account. It does
not modify restaurant records or send emails. Use a dedicated test project where possible.
The owner account and customer menu are separate from this temporary test identity.

## Remaining production work
- Access-control integration checks exist; full order-lifecycle and real-printer tests do not.
- Acceptance and print dispatch are separate database operations, not a transactional outbox.
  Retrying acceptance recovers a failed dispatch; printer jobs use a unique conflict key.
- Order header and item creation are separate operations with compensating cleanup,
  not a database transaction. A crash can still leave an incomplete pending record.
- Checkout initiation is not yet idempotent across separate browser POST retries;
  the Stripe request itself uses an order-specific idempotency key.
- Rate limiting, operational alerting, refunds and full payment-lifecycle integration
  checks remain necessary before considering live payments.
- Tax is hardcoded to 10% for MVP.
- Menu item merging in cart is not enabled yet.
- Production dependencies pass `npm audit --omit=dev` after the October update.
  Tailwind 3 build-only tooling still has advisory findings; no untrusted stylesheet
  input is supported. A Tailwind 4 migration is separate work, not silently waived.
