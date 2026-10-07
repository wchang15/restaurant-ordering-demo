# Demo Security Boundary

This is an internal-test system, not a production service template. Do not use live
Stripe keys or real customer information. The checkout adapter deliberately refuses
live keys and webhook events. Demo tax is a fixed 10%, not jurisdictional tax advice.

The published snapshot excludes environment files, customer/order exports, printer
tokens, private Git history, and deployment metadata. `supabase/seed.sql` is synthetic.
Branding files are visual references, not evidence of commercial restaurant usage.
Original media and third-party dependencies retain their respective rights; this
snapshot does not grant additional asset redistribution rights.

Server credentials belong only in the host's secret store. Apply the access-control
SQL before exposing the database and grant staff permissions through verified
`app_metadata`, never editable user metadata. Never make service-role keys public.

Implemented controls: server catalog prices, option membership, quote mismatch
rejection, Stripe signatures, amount/currency/session checks, conditional settlement,
store-scoped admin access, guarded status transitions, fixed checkout redirect origin.

Known gaps: transactional order creation/outbox, checkout-request deduplication,
rate limiting, refund handling, comprehensive authorization review, full lifecycle
and hardware integration tests. Test results are scoped evidence, not certification.

## Development dependency review (2026-10-06)

`postcss-selector-parser` is pinned through an npm override to patched version
7.1.6 (GHSA-rj75-hqrm-r3gf). Lint, policy tests and the production build are retained.

One upstream issue remains: [braces GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The current published version is 3.0.3 and the advisory lists no patch. It appears
as seven high-severity dependency findings, all development-only. This is **not**
a zero-vulnerability audit. Runtime-only audit has zero findings as of this review.
The relevant inputs here are repository-controlled Tailwind/ESLint glob patterns,
not customer-provided menu or checkout data. Do not build or lint untrusted sources
with production credentials. CI pull requests have read-only permissions and no
deployment secrets. A major Tailwind upgrade alone does not remove the Next lint
dependency path; forced framework downgrades are not an appropriate patch.

`npm run audit:dependencies` audits the full tree and fails on other advisories,
runtime exposure, audit-service errors, or review expiry (2026-11-06). Its exception
is restricted to this advisory, including transitive parents, and prints the raw
remaining counts. Reassess when upstream publishes a fix; remove the exception
after upgrading. `npm audit` intentionally still reports the outstanding issue.

`npm run test:audit-policy` covers the exception with 14 offline regression tests:
new/mixed advisories, runtime dependencies, missing packages, dependency cycles,
expiry, malformed reports and audit-process failure all fail closed. These tests
verify the policy gate, not the absence of vulnerabilities in the application.

Report a suspected vulnerability privately to woochangchang@gmail.com. Do not post
secrets, customer data, or working live-system exploits in public issues.
