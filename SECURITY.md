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
and hardware integration tests. Tailwind 3 has build-tool advisories; CI separately
checks production dependencies. Test results are scoped evidence, not certification.

Report a suspected vulnerability privately to woochangchang@gmail.com. Do not post
secrets, customer data, or working live-system exploits in public issues.
