# Future You — Employer-Provisioned Registration Operations

**Version:** 1.0.0  
**Status:** Track A operational runbook  
**Authority:** `employer-provisioned-registration-contract.md` and `employer-provisioned-registration-technical-design.md`  
**Prepared:** 2026-08-25

## Purpose

This runbook covers the first controlled mechanism for issuing and revoking one employee provision. It is not an employer portal, bulk HR integration or permission to inspect employee financial data.

The commands use the registration-only Supabase credential and narrowly scoped database functions. They cannot be called by `anon` or ordinary `authenticated` users.

## Required environment

Set these values in the operator's temporary shell or approved secret runner. Do not commit them, print them into logs or expose them to browser environment variables.

```text
SUPABASE_URL
SUPABASE_REGISTRATION_SECRET_KEY
REGISTRATION_FINGERPRINT_PEPPER
```

For a loopback target (`localhost`, `127.0.0.1` or `::1`), no extra target acknowledgement is required.

For any hosted target, the command refuses to run unless this value exactly matches the hostname parsed from `SUPABASE_URL`:

```text
REGISTRATION_OPERATION_CONFIRM_HOST
```

That hostname acknowledgement is a technical guard, not operational approval. Production use still requires the organisation's normal change approval and credential-access process.

## Issue one provision

```bash
npm run registration:provision -- FY-7K3M-9Q2D employee@company.example EMPLOYEE-REFERENCE-001
```

The command:

- normalises the Company ID and work email;
- validates identifier, email and external-reference lengths;
- creates a random opaque provision ID;
- stores only a keyed work-email fingerprint alongside the private normalised delivery address;
- creates a provision valid for exactly 30 days;
- refuses a second simultaneously claimable provision for the same employer and work email; and
- records a sanitised operational audit event for success, duplicate or unknown-employer outcomes.

Output contains the result category and provision ID only. It does not echo the work email or any financial information.

## Revoke one provision

```bash
npm run registration:revoke -- 00000000-0000-4000-8000-000000000000 EMPLOYMENT_ENDED
```

Reason codes accept 2–80 letters, digits, underscores, colons or hyphens.

Before activation, revocation:

- changes the provision to `REVOKED`;
- invalidates associated registration attempts and activation digests immediately; and
- prevents code verification, Auth creation and claim.

After activation, revocation:

- changes only the verified employer membership to `INACTIVE`;
- removes the membership from employer-opportunity presentation; and
- does not delete or lock the personal account, financial contexts, goals, scenarios, runs or conversations.

Every outcome is audited, including `NOT_FOUND` and no-op outcomes.

## Local verification

The local database must be recreated only from committed migrations and the generated seed:

```bash
npm run db:reset
npm run db:test
npm run test:integration
```

The committed local seed includes separate browser, integration, concurrency and existing-account-collision provisions. These addresses are `.example.test` fixtures and must never be treated as production employees.

## Inspection and support

Registration state is private. Ordinary users and employer operators have no schema usage or table grants for employers, provisions, attempts, request keys, deliveries or audit events.

An authorised database operator may inspect private records through approved administrative tooling. Support evidence should use internal registration/provision/correlation IDs and sanitised result categories. Do not copy passwords, OTPs, activation tokens, full email content, Auth tokens or personal financial records into tickets or logs.

## Recovery behaviour

- Exact request retries reuse the stored request identity.
- A concurrent account-creation follower receives a retryable in-progress response and cannot call Auth twice.
- If Auth creation fails before an identity exists, the server marks the reserved delivery failed, releases the reservation and permits the exact request to retry.
- If the Auth identity was created before a network failure was observed, the database claim remains authoritative and the retry retrieves the existing outcome.
- If the personal-confirmation delivery fails after Auth creation, the identity and membership remain intact; the user retries and then uses the rate-limited personal-email resend flow.

No recovery case requires a manual dashboard mutation.

## Deferred operations

This implementation does not include CSV bulk import, employer self-service, SCIM, HR/payroll integration, account linking, employer transfer, personal-email change or multiple memberships. Each requires a separate approved contract.
