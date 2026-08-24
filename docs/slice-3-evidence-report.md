# Slice 3 completion evidence

Evidence recorded on 24 August 2026 against the local Supabase stack after two successful clean
resets. Slice 4 was not started.

## Implementation

### Files and modules

- Configuration and dependencies: `.gitignore`, `.env.example`, `package.json`, `package-lock.json`,
  `supabase/config.toml`, `tsconfig.json`, `vitest.config.ts`, `vitest.integration.config.ts`.
- Reproducible database assets: one migration, generated `supabase/seed.sql`, generated
  `src/infrastructure/supabase/database.types.ts`, pgTAP database tests, canonical seed/type drift
  scripts and a built-client boundary script.
- Authentication: narrow application principal port, validated Supabase claims provider,
  request-scoped server client, browser auth client, session-refresh proxy, authenticated route
  wrapper, login form/page and logout proof.
- Persistence: explicit context and simulation JSON mappers, typed persistence failures,
  `SupabaseFinancialContextSource`, `SupabaseSimulationRunStore`, baseline persistence and
  user-scoped canonical idempotency.
- Application/API: authenticated production composition; all nine private Route Handlers protected;
  private/no-store responses; stable auth/context/run/persistence errors; same-origin mutation guard;
  persisted run retrieval without recalculation.
- Browser: protected `/ask`, no-context state for Alex, session-aware login/logout and the existing
  renderer-only result shell. No full visual implementation was introduced.
- Tests: API CSRF/idempotency contract coverage, dependency/service-key rules, real Supabase adapter
  integration, real-session browser/API isolation, login helpers and retained Slice 2 renderer tests.
- Documentation: `docs/authenticated-persistence-slice-3.md`, this evidence report, and one appended
  Slice 3 entry in `docs/future-you-evolution-details.md`.

### Migration inventory

- Migration: `20260824140000_slice_3_authenticated_persistence.sql`.
- Tables: 6 — `profiles`, `financial_context_versions`, `simulation_baselines`, `scenarios`,
  `simulation_runs`, `api_request_keys`.
- Explicit secondary indexes: 10, all owner-first. Primary-key/unique constraints add their normal
  PostgreSQL indexes separately.
- RLS policies: 12 — owner `SELECT`/`INSERT` policies on the five immutable data tables and owner
  `SELECT`/pointer-only `UPDATE` on profiles.
- Grants: `anon` receives no private table privileges. `authenticated` receives profile `SELECT`,
  pointer-column `UPDATE`, and owner-filtered `SELECT`/`INSERT` on immutable tables. It receives no
  ordinary financial `UPDATE`/`DELETE` grant.
- Immutability: five mutation-rejection triggers plus absent user grants. Profile timestamps are
  database-owned. Composite owner foreign keys protect pointer and scenario ancestry.
- Functions: JSON SHA-256 and timestamp trigger functions are invoker functions. The auth profile
  trigger is the sole security-definer function and is isolated in the non-exposed `private` schema
  with an empty search path and revoked execute privileges.

## Test evidence

| Layer | Files | Passed | Failed | Skipped |
|---|---:|---:|---:|---:|
| Original Slice 1 focused regression | 7 | 74 | 0 | 0 |
| Main Vitest suite | 13 | 126 | 0 | 0 |
| Real-Supabase Vitest integration | 1 | 6 | 0 | 0 |
| Combined current Vitest | 14 | 132 | 0 | 0 |
| PostgreSQL pgTAP | 1 | 59 | 0 | 0 |
| Playwright mobile Chromium | 2 | 6 | 0 | 0 |

- Original approved Slice 2 evidence remains: 122 Vitest and 3 Playwright tests passed. The current
  suite retains those assertions and expands them to authenticated persistence.
- TypeScript: `tsc --noEmit` passed with zero errors.
- ESLint: passed with zero errors.
- Production build: passed; all private APIs, `/ask` and `/login` are dynamic, and the Next.js proxy
  is active.
- Built-client scan: passed; no selected simulator, fixture-context or Supabase run-store identifiers
  occur in client chunks.
- Coverage: statements 74.38% (970/1304), branches 60.49% (542/896), functions 78.82% (242/307),
  lines 76.41% (891/1166). This configured report excludes app/server/UI/fixture files and does not
  merge the separately executed real-Supabase integration suite.
- `git diff --check`: passed with no whitespace errors.
- Clean database reset: passed twice after the final migration changes.
- Seed/type drift check: passed against the clean local schema.

## Security and isolation proof

- User A/Sarah reads her current context and her stored runs through real Auth sessions.
- User B/Alex cannot read Sarah's context, run, comparison or scenario creation path. Alex has an
  explicit no-context state.
- Foreign and nonexistent run IDs return the same `RUN_NOT_FOUND` code/message; responses expose no
  Sarah email, UUID, balance or ownership/existence signal.
- Anonymous SQL has no private table privilege. Every unauthenticated financial API operation returns
  typed `401 AUTHENTICATION_REQUIRED`, not an HTML redirect, with `private, no-store, max-age=0`.
- Sarah cannot update/delete immutable context, baseline, scenario, run or request-key rows. She can
  append a second owned context and move only her owned current pointer.
- Same-owner scenario ancestry succeeds; foreign context, baseline, parent and derived references
  fail at the composite foreign-key/RLS boundary.
- Normal request modules contain no service/secret key, service-role client or RLS bypass. Static
  dependency tests enforce Supabase adapters in production and fixture/in-memory adapters only in
  test composition.
- Server identity comes from validated Supabase claims in a fresh request client. No browser `userId`
  or owner ID is accepted.
- A disallowed cross-origin POST returns 403 before calculation. Reusing that request ID in a valid
  same-origin request succeeds, proving the rejected request created no run.
- Protected browser pages redirect to login, remain dynamically rendered and preserve the session
  across navigation. Login/logout and Sarah-to-Alex-to-Sarah transitions pass in Chromium.

## Exactness proof

- The persisted Sarah context rehydrates with deep equality to `SARAH_V1_CONTEXT`, including
  `bigint`, branded dates/months, evidence, assumptions and informational pension/payroll facts.
- The exact rehydrated baseline and all four persisted-input scenarios equal the original frozen
  domain projections. This preserves the 19 Sarah acceptance assertions and the £650, £500, £400 and
  October outcomes.
- A deliberately large value greater than `Number.MAX_SAFE_INTEGER` survives PostgreSQL JSONB and
  returns as the same domain `bigint`.
- Stored simulation output proves exact negative signed cash and zero credit values. Fractional
  persisted minor units are rejected before domain rehydration.
- Persistence adapters contain no `Number(minorUnits)`, `parseInt(minorUnits)`, unary numeric
  coercion or implicit PostgreSQL-number trust for money.

## Persistence and identity proof

- Recreating the Supabase client, persistence adapter and application service retrieves the original
  stored response without recalculating it.
- An exact retry returns the existing run. Two near-simultaneous identical requests result in one
  authoritative row. A different payload with the same user/request ID returns
  `409 IDEMPOTENCY_KEY_REUSED`. Another user has an independent key namespace.
- A source run remains unchanged after sibling calculations and hostile cross-user requests.
- Amount siblings retain their `derivedFromScenarioId`; baseline, context, scenario, run and parent
  identities survive persistence.
- Rules, calendar and context versions, projection horizons, material assumptions, deterministic
  classification, input/output identities and calendar fallback metadata survive readback exactly.
- Browser scenario selection remains view state only and never changes financial persistence.

## Deferred

No OpenAI/LLM, natural-language interpretation, production onboarding, benefits calculation,
scenario commitment, save-first, pension changes, instalments, spending substitution, recurring
expenses, Open Banking, payroll/employer integration or full visual implementation was added.
