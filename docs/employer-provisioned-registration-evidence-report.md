# Future You — Employer-Provisioned Registration Evidence Report

**Track:** A — Employer-provisioned registration  
**Status:** Implementation complete; awaiting product approval  
**Evidence date:** 2026-08-25  
**Preserved pre-Track-A release:** annotated tag `mvp-rc-controlled-demo-2026-08-25` at commit `7909393`

## Outcome

The legacy public Register path has been replaced by the approved employer-provisioned sequence:

```text
Company ID + work email
  -> work-email code
  -> personal email + password
  -> personal-email code and financial onboarding
  -> full app only when both are complete
  -> future Login with personal email + password
```

The implementation preserves Sarah's deterministic financial context and results. Verified employer membership remains an opportunity/provenance fact only; it is not money, benefit uptake or a simulator input.

## Implementation

### Database and security

- Added `20260825120000_track_a_employer_registration.sql`.
- Added private employers, immutable employee provisions, registration attempts, idempotency keys, email-delivery metadata and append-only audit events.
- Added forced-RLS `public.employer_memberships` with owner-read-only grants.
- Extended profiles with registration origin, personal-confirmation evidence and account-activation state.
- Added a Before User Created hook that rejects Auth identities without a valid one-time registration claim; only explicitly gated local fixtures can bypass it during committed seeding.
- Added an atomic Auth trigger that claims one provision, creates one verified membership and binds it to one new personal identity.
- Added confirmation/onboarding activation triggers. Neither completion alone opens Home, Goals, Ask, Benefits or simulator APIs.
- Added privileged RPCs for begin, verify, resend, account reserve/release, status, delivery/audit updates and operational issue/revoke.
- Revoked every registration RPC from public, `anon` and `authenticated`; only the isolated registration credential can execute them.
- Added pre-activation revocation and post-activation membership-only deactivation.
- Added a concurrency follower state and compensating release/retry path for pre-Auth infrastructure failure.

### Application and infrastructure

- Added strict registration DTO schemas and typed error boundaries.
- Added a registration application orchestrator independent from React, Next.js, Supabase SDK types and HTTP.
- Added a cryptographic adapter using secure random six-digit codes, HMAC digests and opaque activation tokens.
- Added a Supabase registration persistence adapter.
- Added a server-only Supabase Auth Admin identity adapter and request-scoped personal-email verifier.
- Added replaceable memory-test and HTTP mail adapters. The memory mailbox requires test mode, loopback Supabase and a dedicated test token.
- Added an opaque HttpOnly activation cookie with server-side digest validation, rotation and 30-minute inactivity expiry.
- Added a distinct authenticated-but-not-activated boundary: pages return to onboarding; full-app APIs return `403 ACCOUNT_ACTIVATION_REQUIRED`.
- Added an environment-guarded provision/revoke script and operational runbook.

### APIs and UI

- Added the versioned registration attempt, work verification/resend, personal account, personal verification/resend and status routes.
- Replaced browser `auth.signUp()` with server registration orchestration.
- `/signup` now redirects to the canonical `/register` flow.
- Added workplace details, work-code and personal-Login Register stages.
- Added simultaneous personal confirmation and financial onboarding without collecting employer details again.
- Added read-only verified-employer presentation to onboarding and Benefits.
- Updated Login routing so returning users need only personal email and password.
- Public existing-account collision wording is neutral and uses `REGISTRATION_PERSONAL_LOGIN_UNAVAILABLE`; account linking is not attempted.

## Behavioural proof

- Valid Company ID + provisioned work email reserves and sends one code.
- Unknown workplace details return the same accepted public shape but send no code.
- Codes are cryptographically generated; plaintext values are absent from persisted attempts and logs.
- A code expires at 10 minutes, is capped at five failed attempts and is single-use.
- A resend is blocked for 60 seconds, replaces the previous code, is limited to three per hour and contributes to the ten-send daily cap.
- Personal-confirmation resends use the same cooldown/hour/day database boundary.
- Work verification creates a server-bound activation state; the browser cannot change employer or work email afterward.
- Personal and verified work emails must differ.
- An existing personal account receives neutral Login/recovery guidance, creates no second user and receives no employer membership.
- A concurrent exact account reservation produces one `RESERVED` authority and one retryable `PROCESSING` follower; Auth is not invoked twice.
- A transient failure before Auth creation releases the reservation, retains failed-delivery audit evidence and permits the exact request to reserve again.
- Auth insertion atomically claims the provision and creates one membership.
- Direct public Supabase `signUp()` without a registration claim is rejected.
- Personal email cannot Login before confirmation.
- Personal confirmation alone still receives `403 ACCOUNT_ACTIVATION_REQUIRED` from the full app.
- Financial onboarding alone cannot activate an unconfirmed personal email.
- Completing both gates changes the account to `ACTIVE`.
- Future Login works with personal email/password; work email/password fails.
- Verified employer data is not re-requested during onboarding.
- Pre-activation revocation clears activation state immediately.
- Post-activation revocation changes membership to `INACTIVE` without changing account activation or deleting personal data.
- Sarah's manually entered canonical context still produces the frozen £650 result: safety buffer `£900 -> £250`, bills covered, no overdraft and significant trade-off.

## Isolation and authority proof

- Private registration tables expose no schema/table access to `anon` or ordinary authenticated users.
- Membership RLS is enabled and forced.
- A user can read only their own membership and cannot insert, update, delete, transfer or forge it.
- Another authenticated user sees no foreign membership.
- Ordinary Home, Goals, Ask, Benefits, onboarding confirmation and simulator paths continue to use cookie-scoped publishable-key clients and RLS.
- The registration secret has one server configuration holder and is excluded from Client Components and built browser chunks.
- The browser cannot submit owner, employer, provision or context-version authority.
- Existing account linking, multiple employers, employer transfer and personal-email change remain absent.

## Verification evidence

The last clean verification sequence used only the repository's loopback Supabase target (`127.0.0.1`) and required no dashboard changes.

| Gate | Discovered | Passed | Failed | Skipped | Result |
|---|---:|---:|---:|---:|---|
| Vitest unit/regression | 253 tests in 28 files | 253 | 0 | 0 | PASS |
| Supabase integration | 13 tests in 4 files | 13 | 0 | 0 | PASS |
| PostgreSQL/pgTAP | 213 assertions in 5 files | 213 | 0 | 0 | PASS |
| Conversation evaluation corpus | 34 cases in 1 file | 34 | 0 | 0 | PASS |
| Fake-provider modes | 8 tests in 1 file | 8 | 0 | 0 | PASS |
| Mobile Chromium / Playwright | 27 tests | 27 | 0 | 0 | PASS |
| TypeScript | 1 command | 1 | 0 | 0 | PASS |
| ESLint | 1 command | 1 | 0 | 0 | PASS |
| Production build | 1 build, 22 generated page entries | 1 | 0 | 0 | PASS |
| Generated database artifacts | 1 check | 1 | 0 | 0 | PASS |
| Client bundle boundary | 1 check | 1 | 0 | 0 | PASS |
| `git diff --check` | 1 check | 1 | 0 | 0 | PASS |

Coverage: 72.97% statements (1858/2546), 57.52% branches (1078/1874), 76.13% functions (421/553) and 75.77% lines (1720/2270). Registration infrastructure is additionally exercised through the separate local-Supabase integration, pgTAP and browser suites, which V8 unit coverage does not instrument.

No test was skipped. No Sarah value, simulator result, exact-money expectation, RLS policy, ownership constraint, immutability assertion or renderer-sentinel expectation was weakened to obtain a pass.

The clean reset applied every migration and regenerated Sarah, Alex, onboarding, visual-onboarding and Track A registration fixtures solely from committed migration/seed sources. No undocumented manual database modification was required.

## Provider status

The registration flow has no OpenAI dependency. The separate live OpenAI conversation evaluation remains:

> BLOCKED — authorised credential/model configuration unavailable

Fake-provider and offline conversation gates remain green.

## Production operational risks

- A production email provider and its retention/availability controls still require deployment approval and live acceptance.
- The in-process IP limiter is supplemental; horizontally scaled production should add an approved shared edge/API abuse limiter while preserving the authoritative Postgres per-attempt limits.
- The single-record operator script is deliberately narrow. Bulk import and employer self-service are deferred.
- Account linking, employer transition, multiple memberships, personal-email change and commercial offboarding entitlement remain separate product contracts.

These are production-operational follow-ups, not missing employer-provisioned registration semantics in the implemented local/test slice.
