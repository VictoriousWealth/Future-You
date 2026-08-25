# Future You — Employer-Provisioned Registration Technical Design

**Version:** 0.1.0-proposal
**Status:** Proposed for review; no implementation authorised
**Product authority:** `employer-provisioned-registration-contract.md`
**Prepared:** 2026-08-25
**Scope:** Employer provisioning, first-time activation, personal account creation and registration/onboarding handoff

## 1. Outcome and recommendation

Future You should implement registration as a dedicated, server-orchestrated activation workflow. It must not add Company ID to the legacy browser `signUp()` form.

The recommended boundary is:

```text
Registration browser
  -> versioned same-origin Registration API
  -> registration application orchestrator
  -> privileged registration persistence port
  -> work-email challenge mailer
  -> server-only Supabase Auth Admin adapter
  -> auth.users trigger finalises the one-time employer claim
  -> personal-email confirmation
  -> onboarding-limited or authenticated onboarding state
  -> ordinary cookie-authenticated Future You application
```

The browser never receives a Supabase secret key, provisioning-row identity, code hash, employer-management credential or unrestricted database capability. Public Supabase `signUp()` remains disabled. Ordinary authenticated financial operations continue to use the existing publishable-key, cookie-scoped client and RLS.

This design recommends a narrowly isolated privileged registration adapter because first-time users are not yet authenticated and Supabase Auth administrative user creation is server-only. The adapter may invoke only approved registration database functions and Supabase Auth Admin operations; it must never become the client used by Home, Ask, Goals, Benefits, onboarding confirmation or simulation.

## 2. Current repository baseline

The current release candidate has the following relevant behaviour:

- `supabase/config.toml` disables global public signup and anonymous sign-in.
- The legacy Register component nevertheless calls browser-side `client.auth.signUp({ email, password })`; its successful production path is not proven in the controlled local release.
- Local Sarah, Alex and onboarding users are inserted deterministically by the committed seed generator.
- An `auth.users` insert trigger creates `public.profiles` with `financial_context_required` state.
- `public.workplace_associations` currently supports only `user_provided` and `unverified` data and permits owner update/delete.
- Financial contexts, baselines, scenarios, runs and conversations use owner-scoped composite keys, explicit grants, forced RLS and authenticated cookie-scoped clients.
- Normal server application code contains no service-role client and the client-bundle boundary forbids administrative credentials.

The registration implementation must replace the legacy Register behaviour without weakening those financial, ownership or client-bundle boundaries.

## 3. Supabase constraints used by this design

The design relies on these documented platform properties:

- Supabase Auth Admin `createUser` is server-only and its service/secret credential must never enter the browser: [Supabase createUser reference](https://supabase.com/docs/reference/javascript/auth-admin-createuser).
- Auth Admin `generateLink` can generate a signup link or OTP using an email and password for delivery through an application-controlled email provider: [Supabase generateLink reference](https://supabase.com/docs/reference/javascript/auth-admin-generatelink).
- A Before User Created hook may reject unauthorised user creation before insertion: [Supabase Before User Created hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).
- Supabase supports `auth.users` triggers for creating related application records, but a failing trigger blocks signup and must be thoroughly tested: [Supabase user-data guide](https://supabase.com/docs/guides/auth/managing-user-data).
- Secret/service credentials bypass RLS and must remain server-only; exposed tables still require explicit grants and policies: [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Cookie-backed SSR identity should continue to be validated with `getClaims()` or a current Auth lookup rather than trusting an unvalidated browser session object: [Supabase SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&package-manager=npm&queryGroups=framework&queryGroups=package-manager).

Any implementation must prove the exact behaviour of the locally pinned Supabase versions and the deployed project configuration. The references inform the design; they do not replace integration tests.

## 4. Authority boundaries

### 4.1 Ordinary application path

The existing path remains:

```text
Authenticated browser cookie
  -> request-scoped publishable-key Supabase client
  -> verified principal
  -> owner-scoped application use case
  -> forced-RLS persistence
```

No administrative credential is permitted in this path.

### 4.2 Registration path

The pre-authentication path is separate:

```text
Signed-out browser
  -> same-origin Registration API
  -> strict request schema + rate limit
  -> registration orchestrator
  -> registration-only privileged adapter
  -> narrowly named database functions / Auth Admin methods
```

The registration-only adapter:

- is imported by registration infrastructure only;
- creates a base `supabase-js` client with session persistence, refresh and URL detection disabled;
- never reads browser cookies into the administrative client;
- never returns raw Supabase users, links, errors or provider responses;
- exposes no generic `query`, `from`, `rpc` or Auth Admin object to application code;
- has method-level operations such as `reserveActivation`, `createPendingIdentity`, `resendPersonalConfirmation` and `readActivationOutcome`;
- is rejected by client dependency-boundary and bundle checks; and
- is excluded from Home, Ask, Goals, Benefits, simulation, conversation and normal onboarding dependencies.

This is a deliberate, auditable exception for pre-auth account activation, not a weakening of ordinary RLS.

## 5. Proposed persistence model

Names are proposals; constraints and ownership semantics are normative for the eventual design.

### 5.1 `private.employers`

| Column | Purpose |
|---|---|
| `employer_id uuid primary key` | Internal stable identity; never shown as Company ID |
| `public_company_id text unique` | Human-entered public identifier, normalised before comparison |
| `display_name text` | Name shown only after successful workplace proof |
| `status text` | `ACTIVE`, `SUSPENDED` or `RETIRED` |
| `created_at`, `updated_at` | Audit timestamps |

The table is outside the exposed API schema or has every `anon`/`authenticated` grant revoked. There is no public employer directory or Company-ID lookup endpoint.

### 5.2 Public Company ID representation

The Company ID should be:

- a non-sequential, human-safe identifier such as `FY-7K3M-9Q2D`;
- case-normalised and separator-tolerant at the request boundary;
- distinct from the internal employer UUID;
- safe to print in employer materials;
- treated as an identifier, never as a password; and
- rotatable for new provisioning without rewriting historical memberships.

The response to an initial request must not reveal whether the Company ID exists.

### 5.3 `private.employee_provisions`

| Column | Purpose |
|---|---|
| `provision_id uuid primary key` | Opaque one-time eligibility identity |
| `employer_id uuid` | Owning employer |
| `work_email_normalized text` | Canonical matching and delivery address, private |
| `work_email_fingerprint text` | Keyed lookup/audit fingerprint that is safe to log only in abbreviated form |
| `external_reference text null` | Optional employer-controlled idempotency reference, not an employee identifier returned to the browser |
| `status text` | `ELIGIBLE`, `CLAIMED`, `REVOKED` or `EXPIRED` |
| `available_from`, `expires_at` | Eligibility window |
| `revoked_at`, `revocation_reason_code` | Explicit revocation evidence |
| `claimed_user_id uuid null` | Supabase Auth user after atomic claim |
| `claimed_at timestamptz null` | Claim time |
| `created_at`, `updated_at` | Audit timestamps |

Required constraints:

- `claimed_user_id` references only the primary key of `auth.users`.
- `CLAIMED` requires `claimed_user_id` and `claimed_at`.
- `REVOKED` and `EXPIRED` cannot be claimed.
- A claim cannot change owners.
- An eligible record cannot be deleted through ordinary runtime operations.
- Concurrent claims serialise on the provision row.
- Re-provisioning semantics remain unresolved in section 23.

### 5.4 `private.registration_attempts`

| Column | Purpose |
|---|---|
| `registration_id uuid primary key` | Browser-facing opaque attempt identity |
| `provision_id uuid null` | Real provision when matched; null for a decoy/non-matching attempt |
| `request_fingerprint text` | Idempotency and conflict detection |
| `state text` | Registration state machine value |
| `submitted_work_email_fingerprint text` | Pseudonymous comparison/rate-limit key |
| `code_digest text null` | Keyed digest of the active work-email code |
| `code_key_version text null` | Hash/HMAC key rotation reference |
| `code_expires_at timestamptz null` | Active-code expiry |
| `verification_attempt_count integer` | Failed verification counter |
| `resend_count integer` | Challenge resend counter |
| `next_resend_at timestamptz null` | Cooldown |
| `work_email_verified_at timestamptz null` | Successful proof timestamp |
| `activation_digest text null` | Hash of the high-entropy activation cookie/token |
| `activation_expires_at timestamptz null` | Personal-account creation window |
| `personal_email_fingerprint text null` | Detects idempotent/conflicting account submissions without logging the address |
| `auth_user_id uuid null` | Created pending Supabase identity |
| `created_at`, `updated_at`, `completed_at` | Lifecycle timestamps |

Decoy attempts let the API return the same shape and timing class for unmatched details. They must retain only the minimum pseudonymous data needed for abuse control and expire quickly.

### 5.5 `private.registration_request_keys`

Each state-changing registration operation stores:

- operation;
- browser request ID;
- request fingerprint;
- registration ID;
- resulting state/result category; and
- timestamps.

The unique scope is operation + request ID, with registration ID included where appropriate. Exact retries return the stored response; conflicting reuse returns a sanitised `409 REGISTRATION_IDEMPOTENCY_KEY_REUSED`.

### 5.6 `public.employer_memberships`

This replaces verified use of the legacy `workplace_associations` table.

| Column | Purpose |
|---|---|
| `user_id uuid` | Owning Auth identity |
| `employer_id uuid` | Verified employer |
| `provision_id uuid unique` | One-time source record |
| `work_email_normalized text` | User-visible verified work address |
| `status text` | Initially `ACTIVE`; later lifecycle is unresolved |
| `source text` | Fixed to `employer_provisioned` |
| `verified_at`, `created_at`, `updated_at` | Provenance |

Initial MVP cardinality is one membership per user. The table uses forced RLS. Authenticated users may select their own row but cannot insert, change ownership, change verification status or delete it through ordinary APIs. Employer administrators receive no policy granting access to employee membership rows through the employee application.

### 5.7 Audit events

`private.registration_audit_events` is append-only and contains identifiers and sanitised categories only:

- correlation ID;
- registration ID;
- employer/provision internal ID where necessary;
- event kind;
- state transition;
- provider category;
- attempt/resend count;
- timestamp.

It must not contain passwords, codes, activation tokens, full work/personal emails, request bodies, email content or Supabase links.

## 6. Registration state machine

```text
DETAILS_SUBMITTED
  -> CODE_PENDING
  -> WORK_EMAIL_VERIFIED
  -> ACCOUNT_CREATION_RESERVED
  -> AUTH_IDENTITY_PENDING_CONFIRMATION
  -> ONBOARDING_ALLOWED_OR_PENDING   [product decision]
  -> PERSONAL_EMAIL_CONFIRMED
  -> ONBOARDING_COMPLETE
  -> ACTIVE
```

Terminal or exceptional states:

- `DETAILS_DECOY`
- `CODE_EXPIRED`
- `ATTEMPTS_EXHAUSTED`
- `REGISTRATION_EXPIRED`
- `PROVISION_REVOKED`
- `PROVISION_ALREADY_CLAIMED`
- `ACCOUNT_CONFLICT`
- `FAILED_RETRYABLE`
- `CANCELLED`

Transition rules:

- Only the server transitions state.
- Every transition checks the current state and expected version under a database lock.
- Backward transitions are prohibited.
- Resending replaces the active code digest and immediately invalidates every earlier code.
- Work-email verification never creates an Auth account by itself.
- Personal-account creation requires a valid work-email-verified activation token bound to one registration attempt.
- Full application access requires a confirmed personal email and completed onboarding.

## 7. Work-email challenge design

### 7.1 Generation

The server generates the six-digit code using a cryptographically secure integer generator over `000000`–`999999`. `Math.random()` is prohibited.

The code exists in plaintext only:

- in server memory long enough to prepare the provider request; and
- in the transactional request to the selected email provider.

It is never written to the database, application logs, analytics, traces or error reports.

### 7.2 Hashing

Because a six-digit space is only one million possibilities, a simple unsalted SHA digest is inadequate after a database leak.

Recommended verification material:

```text
HMAC-SHA-256(
  server-only versioned pepper,
  registration_id || code || per-challenge random salt
)
```

Store the digest, salt and key version; keep the pepper outside the database in server secret management. Compare in constant time. Key rotation must preserve verification for unexpired challenges only.

### 7.3 Proposed operational limits

These are recommendations requiring approval:

- code expiry: 10 minutes;
- maximum failed verification attempts per issued code: 5;
- resend cooldown: 60 seconds;
- maximum resends: 5 per hour and 10 per provision per day;
- activation-token expiry after successful work verification: 30 minutes.

The database enforces the counters and timestamps atomically. Provider-level limits supplement rather than replace application limits.

### 7.4 Resend invalidation

On an accepted resend:

1. Lock the attempt.
2. Confirm resend limits.
3. Generate a new code and digest.
4. Replace the old digest and expiry in one transaction.
5. Increment the resend counter and set the cooldown.
6. Send the new code.

An old code fails immediately even if its original expiry has not elapsed.

If email delivery fails, mark the delivery attempt as failed and invalidate the unsent code or allow a controlled retry with the exact same delivery idempotency key. Never generate an unbounded sequence of active codes.

## 8. Anti-enumeration behaviour

The initial details endpoint always returns an accepted response with the same schema, cache policy and broad timing envelope, regardless of whether:

- the Company ID is unknown;
- the work email is unknown;
- the pair does not match;
- the provision is expired, revoked or claimed; or
- an email was actually queued.

The masked destination is derived from the user-submitted address, not a stored record. A decoy attempt advances to the code screen but no email is sent. Verification failures use one neutral message such as:

> We could not verify that code. Check it or request a new one.

Support and abuse tooling may distinguish internal categories; browser responses and public logs may not.

Response-time equalisation should use bounded server work, not long sleeps. Rate limiting applies before expensive provider calls.

## 9. Activation-session binding

After valid work-email verification, the server creates a 256-bit random activation token and returns it only as a cookie:

- `HttpOnly`
- `Secure` in production
- `SameSite=Lax`
- narrow registration path where practical
- short expiry
- no JavaScript access

Only a digest is stored. It is bound to:

- registration ID;
- exact provision ID;
- verified work-email challenge;
- user-agent/session context only where that does not create brittle fingerprinting;
- current state and expiry; and
- the personal-account creation request once reserved.

It is one-time for account creation. It is not an Auth session, bearer credential for the full app or proof of financial-data ownership.

## 10. Personal Supabase Auth identity

### 10.1 Recommended Auth operation

Use a server-only Auth Admin adapter after the database reserves the activation. Prefer `auth.admin.generateLink({ type: "signup", email, password, options: { data } })` so the server receives a confirmation link/OTP for controlled delivery while the user retains their chosen password.

The internal metadata contains only a transient registration ID and high-entropy claim nonce. It contains no Company ID, work email, financial data or benefit data.

The implementation must integration-test whether the chosen Supabase local and hosted configuration invokes the required hooks consistently for Admin-generated signup links. If the pinned platform cannot support the recommended path, stop and revise the design; do not enable public `signUp()` as a shortcut.

### 10.2 Preventing public-signup bypass

Defence in depth is required:

1. Keep `[auth].enable_signup = false` in every environment.
2. Remove browser calls to `auth.signUp()` from the final Register implementation.
3. Configure a Before User Created hook to reject user creation without valid server-issued activation metadata where supported.
4. Add an `auth.users` trigger that refuses to finalise a profile/membership unless the activation reservation is valid.
5. Keep all Auth Admin credentials in a registration-only server module.
6. Add direct tests proving public SDK signup and raw Auth endpoint signup fail.

The hook and trigger are safety controls; browser-supplied `user_metadata` is never trusted by itself.

### 10.3 Atomic claim trigger

Extend or replace the existing profile-creation trigger with a tested registration-aware trigger path. During the same `auth.users` insert transaction it must:

1. Read the transient activation reference.
2. Lock the registration attempt and provision row.
3. Verify work-email proof, activation nonce digest, expiry and personal-email binding.
4. Reject revoked, expired, already claimed or conflicting provisions.
5. Create the profile in `financial_context_required` state.
6. Create the verified employer membership.
7. Mark the provision claimed by `new.id`.
8. Record the Auth user ID on the registration attempt.
9. Remove or neutralise transient activation secrets from Auth metadata.
10. Return successfully only if every write succeeds.

Supabase documents that a failing `auth.users` trigger can block user creation. Here that property is intentional for atomic authority, but it makes clean reset, hosted integration and failure-injection testing mandatory.

## 11. Idempotency, concurrency and crash recovery

### 11.1 Exact retries

Every mutation requires a caller-generated request ID and a canonical request fingerprint.

- Exact retry: return the stored result and do not resend, regenerate a code, create another Auth identity or claim again unless the operation is explicitly `resend`.
- Conflicting reuse: return `409 REGISTRATION_IDEMPOTENCY_KEY_REUSED`.
- Request IDs are scoped to the registration and operation; another registration may use the same value.

### 11.2 Concurrent code verification

Code verification locks the registration attempt. At most one request transitions it to `WORK_EMAIL_VERIFIED`. A simultaneous duplicate receives the same success result; a different code receives the resulting neutral state.

### 11.3 Concurrent account claims

Account creation obtains a transaction-level advisory lock for the registration and row locks the provision. Only one request may reserve the activation. The provision's unique claim constraint and Auth-trigger checks are the final database defence.

### 11.4 Crash cases

| Failure point | Required recovery |
|---|---|
| Before registration-attempt commit | Retry creates or recovers by request ID |
| After challenge commit, before email send | User may resend; the unsent challenge is invalidated or safely re-delivered by the same delivery key |
| After email send, before HTTP response | Exact retry returns the existing challenge without sending another code |
| After work verification, before activation cookie response | A recovery request tied to the registration ID issues a replacement token only after the same proof/state checks |
| After account reservation, before Auth Admin call | Exact retry resumes the reserved attempt |
| During Auth insertion/claim trigger | The Auth/database transaction rolls back; retry uses the same reservation |
| After Auth identity and membership commit, before confirmation email delivery | Retry detects the stored Auth user and resends confirmation; it never creates another user |
| After confirmation, before client redirect | Status endpoint recovers the confirmed state and routes correctly |

No recovery path stores or replays the chosen password. If the Auth operation outcome is genuinely indeterminate and cannot be reconciled by activation metadata/Auth user ID, stop with a recoverable support state rather than creating a second identity.

## 12. Personal-email confirmation and onboarding handoff

Supabase personal-email confirmation remains distinct from work-email eligibility verification.

Recommended product-fitting approach:

- create an unconfirmed personal Auth identity and send the Supabase confirmation link/OTP;
- allow an onboarding draft through the existing verified registration session, not through a full authenticated financial-data session;
- keep any pre-confirmation onboarding draft private and keyed to the registration attempt;
- after personal-email confirmation establishes the Auth session, bind or copy the draft to that Auth user under a transaction;
- create no immutable financial-context version until the confirmed Auth user explicitly reviews and confirms onboarding; and
- block Home, Ask, Goals, Benefits and normal financial APIs until personal email and onboarding are complete.

This preserves “confirmation alongside onboarding” without falsely marking the personal email confirmed or granting unconfirmed users ordinary RLS access.

However, whether onboarding begins before personal-email confirmation is explicitly unresolved. The simpler alternative is to block onboarding until the confirmation link is used. Section 23 requests approval before implementation.

## 13. Identity separation

| Identity/data | Authority | Purpose | Must not become |
|---|---|---|---|
| Supabase Auth user ID | Supabase Auth | Stable account owner key | Employer identifier |
| Personal email | Auth identity, user controlled | Routine Login and recovery | Employer-visible profile field |
| Work email | Verified provision/membership | Workplace proof and association | Routine login alias or personal recovery address |
| Employer UUID | Private employer record | Internal relationship key | Public Company ID |
| Public Company ID | Employer-issued identifier | Find candidate employer during registration | Password or ownership proof |
| Provision ID | Private one-time record | Eligibility and claim source | Browser-selected owner identity |
| Financial-context owner | Auth user ID | RLS ownership | Employer/member/provision ID |

No email address is copied into a financial-context payload. Employer membership is numerically inert.

## 14. RLS, grants and privacy

### Private registration data

- `employers`, provisions, attempts, request keys and audit events are placed in `private` or another unexposed schema.
- Revoke all from `public`, `anon` and `authenticated`.
- Do not expose views over those tables.
- Grant only narrowly required function execution to the registration administrative role/adapter.
- Codes, activation tokens and password material never appear in rows in plaintext.

### User-visible membership

- Enable and force RLS on `employer_memberships`.
- Revoke all from `anon` and `authenticated`, then grant only owner `SELECT` to `authenticated`.
- No ordinary user insert/update/delete policy.
- All relationships use same-user/auth-user foreign keys where user ownership is involved.
- An employee sees their own verified workplace details only.
- No employer-facing RLS policy is introduced in this slice.

### Financial data

Existing owner-scoped RLS remains unchanged. Employer, provision and membership identifiers do not satisfy financial policies and cannot be used to query another user's profile, context, conversation, scenario or run.

### Administrative credentials

- Prefer a modern Supabase secret key over a legacy service-role JWT where supported.
- Never prefix it with `NEXT_PUBLIC_` or expose it to Next.js Client Components.
- Initialise a non-persistent server client without browser cookies.
- Add an allowlist-based repository boundary test so the credential may appear only in the registration Auth Admin adapter and deployment configuration.
- Continue asserting that all ordinary application modules contain no bypass-RLS credential or client.

## 15. Registration API proposal

Exact field names may follow repository DTO conventions; behaviours are normative.

### `POST /api/v1/registration/challenges`

Request:

```json
{
  "requestId": "reg-request-opaque",
  "companyId": "FY-7K3M-9Q2D",
  "workEmail": "employee@example.test"
}
```

Response for both real and decoy attempts: `202`, private/no-store.

```json
{
  "schemaVersion": "fy-registration/1.0.0",
  "registrationId": "opaque-id",
  "state": "CODE_PENDING",
  "maskedDestination": "e•••••••@example.test",
  "resendAvailableAt": "trusted timestamp"
}
```

### `POST /api/v1/registration/:registrationId/verification`

Accepts request ID and six-digit code. A valid code returns `WORK_EMAIL_VERIFIED`; invalid, expired and decoy cases use sanitised bounded outcomes without provisioning detail.

### `POST /api/v1/registration/:registrationId/resend`

Always returns a neutral accepted envelope when request shape/rate limit permits. An accepted real resend invalidates the prior code before delivery.

### `POST /api/v1/registration/:registrationId/account`

Accepts request ID, personal email, password and confirmation. Requires the HttpOnly activation cookie. Password and confirmation are validated in memory, passed only to Auth Admin and never persisted/logged. Success returns a personal-confirmation/onboarding state, not raw Auth data.

### `GET /api/v1/registration/:registrationId/status`

Requires the registration cookie. Returns only the current user-facing state and next allowed action.

### Personal-email confirmation callback

A dedicated server callback validates the Supabase confirmation code using the SSR/PKCE-compatible flow, refreshes secure cookies, verifies the Auth user matches the claimed registration, then routes to onboarding or the pending onboarding draft. Redirect allowlists are exact.

### Common API rules

- runtime schemas and length limits;
- JSON only for mutations;
- same-origin enforcement;
- private/no-store responses;
- correlation IDs;
- generic errors;
- no owner/employer/provision ID accepted as authority from the browser;
- no raw provider payloads or links;
- bounded rate limiting backed by shared Postgres state rather than process memory; and
- no email/code/password/request-body logging.

## 16. Screen and route-state mapping

### Register — Verify your workplace

- Company ID
- Work email
- Send verification code
- Login link
- neutral error/retry state

### Register — Check your work email

- masked submitted destination
- six-digit input
- Verify work email
- Resend with cooldown
- Change details
- expired/attempt-limit state

### Register — Create your account

- Personal email
- Password
- Confirm password
- Register
- explicit statement that future Login uses the personal email

### Personal email confirmation

- confirmation-sent state;
- resend action;
- another-tab-safe status recovery; and
- no provider link/token rendered in application content.

### Onboarding

- no employer/workplace input for newly provisioned registrations;
- verified employer summary may be shown read-only with provenance;
- only minimum financial context is collected; and
- the app shell remains unavailable until the required confirmation/completion gates pass.

The registration UI state is server returned. The browser may validate presentation constraints but does not decide eligibility, verification, claim or access state.

## 17. Controlled provisioning mechanism

The first implementation should provide a committed, reproducible, server-only provisioning command rather than a dashboard-only manual process.

Proposed operation:

```text
npm run registration:provision -- --input approved-employees.csv --dry-run
npm run registration:provision -- --input approved-employees.csv --apply
```

The future command must:

- require an explicitly selected local/hosted environment;
- refuse unknown or production targets without an explicit production approval mechanism;
- validate Company ID, work-email syntax, expiry and external idempotency reference;
- show counts and masked examples only;
- support dry-run by default;
- be idempotent by employer + external reference;
- never overwrite claimed records;
- record who/what provisioned each row;
- avoid printing complete work emails; and
- require no undocumented dashboard edits.

Employer portal, live HR feed, SCIM and payroll integration remain out of scope.

## 18. Sarah, Alex and test-user compatibility

The controlled-demo release candidate remains frozen while this design is reviewed.

Future implementation requirements:

- Sarah's Auth user ID, personal login, canonical financial context, runs and frozen outcomes remain unchanged.
- Alex and the onboarding test identity remain usable for existing Slice 3–7 regression tests.
- Existing seeded identities are marked or treated as `LEGACY_SEEDED`/environment-gated accounts; they are not forced through registration retroactively.
- Existing user-provided/unverified workplace rows remain historical data and are never silently upgraded to verified employer memberships.
- New registration acceptance uses separate employer, provision and user fixtures.
- Local seed generation creates registration fixtures reproducibly without sending real email.
- A deterministic fake email sink exposes codes only to test code, never to browser production bundles or normal logs.
- No registration migration recalculates or rewrites financial contexts, scenarios, runs or conversations.

Before a public release, the product must decide whether legacy controlled-demo accounts remain permitted outside local/evaluator environments.

## 19. Security and abuse cases

Tests and threat modelling must cover:

- Company-ID enumeration;
- work-email enumeration;
- verification-code brute force;
- resend/email bombing;
- challenge replay;
- activation-cookie theft/replay;
- concurrent claims of one provision;
- direct public `signUp()` and raw Auth endpoint bypass;
- browser-supplied employer/provision/user IDs;
- personal-email collision;
- claimed, expired and revoked provisions;
- email aliases, casing and Unicode normalisation;
- CSRF and cross-origin requests;
- XSS access to registration state;
- open redirects in confirmation callbacks;
- password/code/token leakage through telemetry;
- administrative-key leakage or import into client code;
- service-role use outside the registration adapter;
- malicious provider errors containing PII;
- email-provider retry duplication;
- crash after Auth creation;
- forged Auth metadata;
- user mutation of `raw_user_meta_data` after activation;
- attempt-state tampering;
- employer access to employee personal/financial data; and
- a verified membership being treated as benefit uptake or money.

CAPTCHA or another challenge may be added after an abuse threshold, but it cannot replace provision matching, rate limits or work-email verification.

## 20. Test strategy

### Unit and contract tests

- Company-ID and email normalisation
- strict request/response schemas
- state-machine transition table
- code generation range and zero padding
- HMAC verification and key rotation
- constant-time comparison seam
- attempt/resend/expiry boundaries
- activation-cookie attributes
- idempotency fingerprints
- sanitised error mapping
- fake mailer and Auth Admin modes

### Supabase integration tests

- eligible, decoy, expired, revoked and claimed provisions
- exact retry and conflicting request-ID reuse
- resend invalidates old code
- one code claim under concurrency
- one account claim under concurrency
- Auth insertion trigger creates one profile and membership
- trigger failure leaves no Auth user/profile/membership claim
- crash/retry after Auth creation finds the same identity
- personal confirmation state and callback
- existing Sarah/Alex login compatibility
- clean local reset and deterministic fixtures

### PostgreSQL/pgTAP tests

- all new tables have intended schema exposure, forced RLS where applicable, grants and constraints
- anon/authenticated cannot read private employer/provision/attempt/audit data
- owner can read only their membership
- owner cannot forge/update/delete membership
- one provision cannot map to two users
- state constraints and claim invariants
- administrative functions are not executable by anon/authenticated
- employer identity cannot satisfy financial-table ownership policies

### Browser acceptance

1. Open Register as signed out.
2. Submit valid Company ID + provisioned work email.
3. Read the six-digit code from the test-only fake mail sink.
4. Verify the code.
5. Submit personal email + matching password.
6. Confirm personal email through the local test link/OTP.
7. Complete onboarding without an employer field.
8. Reach the full application.
9. Sign out.
10. Login using personal email + password only.
11. Prove Company ID/work email are absent from Login.
12. Prove another user/employer cannot access the membership or financial data.

Additional browser cases cover wrong code, expiry, resend, reload/resume, exact retry, collision, provider failure and reduced email leakage.

### Regression and repository gates

- every existing Slice 1–7 unit, integration, pgTAP and Playwright expectation remains green unless an explicitly superseded legacy registration assertion is replaced by stronger registration coverage;
- no Sarah financial expectation changes;
- generated database types and artifacts remain current;
- clean database reset;
- client-bundle boundary proves no secret/admin adapter/private schema identifier leaks;
- browser source contains no `auth.signUp` registration path;
- TypeScript, ESLint, production build and `git diff --check`; and
- no skipped tests.

## 21. Release-status impact

The approved release remains:

> MVP release candidate for controlled demonstration using seeded identities.

It is not registration compliant and is not ready for open/public or employer rollout.

Completing registration will require a separately approved implementation slice and a new release gate covering email delivery, Auth Admin configuration, migrations, RLS, provisioning operations, abuse controls, accessibility and clean-state browser evidence.

The live OpenAI status remains unrelated and unchanged:

> BLOCKED — authorised credential/model configuration unavailable

## 22. Implementation phases recommended after approval

### Phase A — Persistence and fake infrastructure

- migrations, state machine, constraints, grants and RLS;
- deterministic provisioning fixtures;
- fake mailer and fake Auth Admin ports;
- unit, integration and pgTAP tests.

### Phase B — Real Auth boundary and recovery

- isolated Supabase Auth Admin adapter;
- Auth hook/trigger claim finalisation;
- personal-email confirmation callback;
- failure injection, idempotency and reconciliation tests.

### Phase C — Registration UI and onboarding handoff

- three approved Register states;
- reload/resume/error/accessibility behaviour;
- removal of legacy browser `signUp()`;
- no-employer-field onboarding path for provisioned users.

### Phase D — Operational and release hardening

- controlled provisioning CLI;
- email provider configuration;
- rate limits and abuse review;
- browser acceptance and complete Slice 1–7 regression;
- new release evidence report.

No phase starts automatically from this design.

## 23. Explicit unresolved product and operational decisions

These questions remain open and must be approved before or during implementation planning. Recommendations are advisory, not silent decisions.

| Question | Recommendation | Why it remains unresolved |
|---|---|---|
| May personal email equal work email? | Initially require a distinct personal email | Portability and privacy favour separation, but some users may have no alternative address |
| What if personal email already belongs to an account? | Require Login and a separately designed authenticated employer-link flow | Creating a duplicate is unsafe; the linking UX is not approved |
| Can a work email be provisioned again? | Only by explicit admin reissue after an unclaimed record expires/revokes; never duplicate a claimed record | Rehire and correction cases need lifecycle policy |
| Provisioning expiry | Propose 30 days by default with explicit employer-selected shorter/longer policy | No duration has been approved |
| Revocation before claim | Block immediately and invalidate attempts | Operational notification and audit policy still need approval |
| Revocation after claim | Do not silently delete the personal account; define access/retention separately | Employment ending and user data ownership are major product/legal decisions |
| Multiple employer memberships | Keep one active membership in the first implementation | The canonical contract says initial single membership; future switching/linking is undefined |
| Personal-email changes | Use authenticated secure email change with confirmation of the new address, potentially both addresses | Exact recovery and employer interaction are unapproved |
| Work-email changes | Require a new employer-provisioned verification event | Aliases, transfers and employer-domain changes need rules |
| Loss of work-email access before activation | Employer support/re-provision only | Bypassing work proof would defeat the access contract |
| Does personal confirmation block onboarding or only full app? | Permit a private registration-bound onboarding draft; block immutable context confirmation and full app until personal confirmation | Best match to approved journey, but adds complexity requiring explicit approval |
| Code expiry/attempt/resend limits | 10 minutes, 5 attempts, 60-second cooldown, 5/hour | Concrete abuse limits have not been product-approved |
| Provisioning interface | Start with audited CLI/import, no employer portal | Operational owner and input format are not approved |
| Email provider and retention | Select through operational/privacy review; retain delivery metadata only | No provider or DPA decision exists |
| CAPTCHA threshold | Risk-triggered only, never default without usability review | Abuse volumes are not yet known |
| Legacy seeded accounts outside local review | Keep local/evaluator-only | Public grandfathering could undermine the new access contract |

## 24. Approval gate

Before implementation, approval must confirm:

- the privileged registration-adapter exception and its isolation;
- the Auth Admin `generateLink` + database trigger strategy or an approved replacement;
- the onboarding-before-personal-confirmation decision;
- provisioning, revocation and re-provisioning rules;
- personal/work email equality and existing-account handling;
- code and activation limits;
- local fixture compatibility; and
- the proposed implementation phases.

Until then, the current Register surface remains legacy/non-compliant and controlled demonstrations must continue to use seeded identities.
