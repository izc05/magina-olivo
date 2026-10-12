# G0 #743 security continuation — 2026-10-12

Inherited Antigravity HEAD: aaba57a7e3166545fe7ccaa4c0237d22994b401a. Existing three migrations, fixtures, RPCs and tests retained. Supabase production never queried or changed; project/branch metadata inventory only. No cloud DEV/STAGING branch exists in the connected project. Local Docker startup fails before its engine becomes available; no factory reset or system installation performed.

## Reproduction and repair

The inherited `npm test --prefix supabase` failed because fixture paths depended on cwd. Paths now resolve from the test file. Clean `npm ci` uses the inherited locked PGlite 0.2.17, now pinned exactly. The test command runs the original SQL suite and simulation suite; simulation results are separate from database authorization evidence.

Negative tests run as role authenticated/User A, not superuser: signed terms_notes, cost_responsibilities and duration; full ACCEPTED -> PROPOSED -> changed terms/reaccepted sequence for contracts and 30/70 agreements; changes between signatures; own signatures set directly or prefilled on INSERT; same identity as both parties; hard deletion of signed rows; revoked grants bypassed by definer RPC; mismatched campaign/farm and contract/parties references. Before repair: 15 failures / 25 SQL tests. Supplied logs retain the actual failures.

Repairs are confined to pending G0 migration 3: exact terms freeze from the first signature, consent fields immutable except first consent through the trusted definer RPC, lifecycle transitions cannot reuse old consent, two distinct parties, signed history preserved, composite references enforced, and definer RPC checks current farm capability before proceeding. Renewal/amendment remains a fresh unsigned row/version; contract ACTIVE/EXPIRED/TERMINATED lifecycle remains separate from accepting again.

A review found temporary pg_proc catalog shadowing could forge the role check when TEMP is available. Regression reproduced the bypass (after granting TEMP in isolated PGlite); both lookups now explicitly use pg_catalog. No caller-controlled GUC authorizes signatures.

## Verified locally

- `npm ci --prefix supabase`: clean installation, no audit vulnerabilities.
- `npm test --prefix supabase`: 31/31 tests = 26 PostgreSQL/PGlite tests + 5 inherited simulation tests, zero failures.
- Native runner Bash syntax and native Node test syntax checked. Native HTTP execution **not yet verified**.

## Native DEV gate

New G0 security DEV workflow uses pinned Supabase CLI 2.120.0 and disposable, separately named localhost stacks on GitHub runners. Native Auth creates four synthetic accounts and issues real JWTs; PostgREST and Storage assertions use those sessions. Two baselines: clean, and legacy farms fixture (UUID/owner/name/cover preserved, creator backfilled, workspace unclaimed). Includes backup restore into a verification schema and transaction rollback. It executes the production migration files against native auth/storage; mock platform fixtures are never loaded.

No link/deploy/remote credentials, no production URL accepted by tests, no keys logged/archived, no retained local stack stopped. The cleanup targets only this freshly created disposable project. CI must actually pass before claiming native Auth/Storage or the migration gate complete. A fixture migration test is not an exact clone of a production schema snapshot.

## Still outstanding

Review all grants, principal/workspace relationships, invitations and legacy-policy coexistence; native CI on final SHA; independent review and integration approval. This slice does not implement Android Auth/outbox or claim all sync entities have been finished. #721 Room and #745 Compose are untouched. PR stays DRAFT; no merge or production deployment.

References: [Supabase native CI guidance](https://supabase.com/docs/guides/deployment/ci/testing), [RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control), [PostgreSQL secure search path](https://www.postgresql.org/docs/current/sql-createfunction.html).
