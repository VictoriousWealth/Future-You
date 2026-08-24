# Slice 3 authenticated Supabase persistence

Slice 3 replaces the Sarah-only runtime context source and process-local run store with authenticated,
request-scoped Supabase adapters. The deterministic simulator, versioned JSON DTOs and renderer-only
browser boundary remain unchanged.

```text
Authenticated browser
    -> cookie-backed Route Handler
    -> verified AuthenticatedPrincipal
    -> application use case
    -> RLS-bound persistence ports + deterministic simulator
    -> explicit DTO mapper
    -> private/no-store JSON
    -> renderer-only browser
```

This slice does not add an LLM, natural-language interpretation, production onboarding, numerical
benefit simulation, scenario commitment, pensions, instalments, spending substitution, recurring
expenses or connected financial data.

## Local prerequisites and pinned packages

The verified local toolchain is Node `20.19.0`, npm `11.7.0`, Supabase CLI `2.39.2` and Docker.
Runtime Supabase dependencies are pinned exactly in `package.json`:

- `@supabase/ssr` `0.12.0`
- `@supabase/supabase-js` `2.109.0`
- `server-only` `0.0.1`

Copy `.env.example` to `.env.local` and `.env.test.local`, then replace the publishable key with the
local anon/publishable key reported by `supabase status`. The checked-in example contains no secret.
`.env*` files are ignored except for `.env.example`.

The local environment is deliberately not a production account system. Public signup, anonymous
signup, email signup, realtime, storage, Studio and Inbucket are disabled. The generated seed creates
two local-only, email-confirmed test identities:

| User | Purpose | Financial context |
|---|---|---|
| Sarah Wonk / `sarah@example.test` | canonical User A | exact Sarah v1 context |
| Alex Morgan / `alex@example.test` | independent User B | explicit no-context state |

The deterministic passwords live only in the local seed generator and browser-test helper. Never use
these fixture credentials outside local/test Supabase.

## Reproducible database workflow

```sh
supabase start
npm run db:reset
npm run db:test
npm run db:types:generate
npm run db:artifacts:check
```

`db:reset` first regenerates `supabase/seed.sql` from the canonical TypeScript Sarah fixture and the
explicit persistence mapper, then rebuilds the local database from migrations. It is safe to rerun
against the local project and destructive to that local database by design.

`db:artifacts:check` compares the committed seed with a fresh canonical fixture rendering and compares
the checked-in `Database` types with `supabase gen types`. It detects fixture/seed and migration/type
drift. Regenerate types only after the local database has been reset to the current migrations.

## Migration and ownership model

The reproducible migration is:

- `supabase/migrations/20260824140000_slice_3_authenticated_persistence.sql`

It creates six private-data tables:

| Table | Role |
|---|---|
| `profiles` | one profile and mutable current-context pointer per Auth user |
| `financial_context_versions` | immutable, complete, versioned context payloads |
| `simulation_baselines` | immutable deterministic current-path projections |
| `scenarios` | immutable one-off definitions and parent/derived ancestry |
| `simulation_runs` | immutable requests, audit metadata and authoritative response DTOs |
| `api_request_keys` | immutable user-scoped request identities for idempotency |

All financial primary keys include `user_id`. Composite foreign keys ensure that a current pointer,
baseline, scenario, parent, derived scenario, run and idempotency key can reference only rows with the
same owner. This remains true even when two users know the same public-looking ID.

Financial context, baseline, scenario, run and request-key rows are append-only. Ordinary
`authenticated` users receive `SELECT` and `INSERT` only; they receive no `UPDATE` or `DELETE` grant.
Mutation-rejection triggers add defence in depth for more privileged accidental callers. The only
ordinary mutable financial field is `profiles.current_financial_context_version_id`; its composite
foreign key prevents pointing at another user's context. A database trigger owns `updated_at`.

The auth-user profile trigger is the only `SECURITY DEFINER` function. It is isolated in a non-exposed
`private` schema, pins an empty `search_path`, has execute revoked from `public`, `anon` and
`authenticated`, and is invoked only by the `auth.users` trigger. No security-definer function is
exposed in the API's `public` schema.

Every private table has RLS enabled and forced. Explicit owner policies exist separately for each
permitted `SELECT`, `INSERT` or profile-pointer `UPDATE`. `anon` has no table privileges. Explicit
grants are intentionally narrow; authenticated users cannot alter onboarding state or timestamps.

The migration adds owner-first indexes for context creation order, baseline context, scenario
baseline/parent/derivation, run context/baseline/scenario/creation order and request-key run lookup.
Database-generated SHA-256 columns fingerprint context payloads, baselines, scenarios and stored
responses.

Administrative access is not part of the ordinary request graph. This slice has no service-role
client and no `SUPABASE_SERVICE_ROLE_KEY` use. Local migrations and seeds run through the Supabase CLI
database administrator. If a future administrative client is required, it belongs only in an
explicit seed/migration/admin script and must never be imported by Route Handlers, application use
cases or browser code.

## Authentication and request scope

The browser auth client is restricted to login/logout operations. Server Components, the request
proxy, Route Handlers and persistence adapters use the public project URL and publishable key with the
caller's cookie-backed JWT, so PostgreSQL RLS remains authoritative.

`createRequestSupabaseClient()` creates a fresh server client from the current request cookie store.
There is no global server client or global authenticated application. `SupabasePrincipalProvider`
calls Supabase `auth.getClaims()` and derives `userId` from the verified `sub`; it does not trust
`getSession()`, manually decode a JWT or accept a browser user ID.

The Next.js proxy refreshes Supabase sessions for `/login`, `/ask` and all `/api/v1` operations.
Protected pages redirect to login. APIs never redirect: they return the stable error envelope with
`AUTHENTICATION_REQUIRED` or `AUTHENTICATION_INVALID` and a private/no-store policy.

Supabase SSR browser-managed auth cookies use `SameSite=Lax`, `Path=/` and `Secure` in production.
They cannot be marked `HttpOnly` while the standard browser client owns password sign-in and token
refresh; this is an explicit standard-SSR constraint, not a custom token protocol. State-changing
JSON routes additionally require `application/json`, a matching `Origin` when present and an allowed
`Sec-Fetch-Site`. Unexpected cross-origin mutations return 403 before authentication or calculation.
There is no wildcard credentialed CORS policy.

## Persistence mappings and exact money

`financial-context-persistence.ts` is the sole context persistence mapping. It validates a strict,
versioned shape before storage and on rehydration, converts decimal minor-unit strings with `BigInt`,
reconstructs branded local dates/months, preserves evidence and scope, then runs domain validation.
Unsupported persistence schemas and malformed rows fail closed with sanitised typed errors.

`simulation-run-persistence.ts` validates every stored response as JSON-safe and verifies critical
response identities. Money remains:

```json
{ "currency": "GBP", "minorUnits": "65000", "display": "£650.00" }
```

Minor units are canonical integer strings in JSONB. Signed values, zero and values beyond
`Number.MAX_SAFE_INTEGER` remain exact. Fractional minor units are rejected. No persistence adapter
uses `Number`, `parseInt`, unary numeric coercion or a PostgreSQL numeric result for domain money.
Dates/months and exact ratio numerator/denominator values also remain strings.

Stored response DTOs are the retrieval authority. `GetSimulationRunUseCase` returns the validated
persisted response and never invokes the simulator. A later recalculation must create a new run.

## Idempotency and immutable scenario identity

`requestId` is unique per user for mutating one-off calculations. A canonical input identity is
derived independently of JSON key order.

- First use calculates, persists and returns one immutable run.
- An exact retry returns the authoritative stored JSON value without recalculation.
- Reusing the ID with a different canonical payload returns `409 IDEMPOTENCY_KEY_REUSED`.
- The same request ID belongs to a separate namespace for another authenticated user.
- A unique constraint and authoritative read-after-insert resolve near-simultaneous identical calls
  to one run.

Baselines persist independently and are also written before scenario runs. Alternatives retain their
baseline, source, parent/derived and context identities. Viewing a scenario remains browser-only
selection state and cannot update the current financial context.

## Runtime modules

The publishable Supabase client is permitted in:

- `src/ui/auth/browser-supabase-client.ts` for browser auth only;
- `src/infrastructure/supabase/server-client.ts` for request-scoped server access;
- `src/infrastructure/supabase/proxy-session.ts` for session refresh.

Normal production composition is `src/server/authenticated-application.ts`. It constructs the
request client, verifies the principal and injects `SupabaseFinancialContextSource` and
`SupabaseSimulationRunStore`. Sarah's fixture source and the in-memory store remain available only in
the Slice 2/unit-test composition.

All nine personal-finance operations use the authenticated wrapper. Foreign-owned context and run
queries are filtered by both the verified user ID and RLS and are handled exactly like missing rows.
Public not-found codes are `FINANCIAL_CONTEXT_NOT_FOUND`, `CONTEXT_VERSION_NOT_FOUND` and
`RUN_NOT_FOUND`; responses never expose owner identity or whether another user's record exists.
Raw Supabase/PostgreSQL errors, SQL, policy names, claims, stack traces and financial snapshots are
not logged or returned.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:coverage
npm run build
npm run build:boundary:check
npx playwright test
npm run db:test
npm run db:artifacts:check
git diff --check
```

`supabase/tests/database/rls_and_immutability.test.sql` is the database-level authority for grants,
owner visibility, anon denial, immutable rows, pointer ownership and ancestry. The integration suite
uses real Sarah and Alex Auth sessions against local PostgREST/RLS. Browser tests prove login/logout,
session continuation, typed unauthenticated responses, private caching, CSRF rejection, exact retry,
conflicting reuse, process-durable run retrieval, and non-enumerating Sarah/Alex isolation. The Slice
2 sentinel test remains in the same browser suite and continues to prove renderer authority.

## Failure modes and deferred work

If Supabase is unavailable, authenticated operations return a sanitised retryable
`PERSISTENCE_FAILURE` response. Invalid or schema-incompatible stored data returns a non-retryable
safe 500 code and never enters the simulator. Missing/foreign resources return the same 404 shape.

There is no production recovery workflow, account registration flow, password reset, onboarding,
context editing, context-head API, administrative user lifecycle, remote deployment migration,
multi-factor UI or social login in Slice 3. Deleting an Auth user remains an administrator-owned
lifecycle action and cascades that user's records; ordinary users have no delete path. These concerns,
plus all LLM and unsupported financial behaviour, remain deferred. Do not begin Slice 4 automatically.
