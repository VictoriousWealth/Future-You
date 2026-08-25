# Future You — Employer-Provisioned Registration Contract

**Version:** 1.0.0  
**Status:** Frozen product contract; implementation not started  
**Approved:** 2026-08-25  
**Scope:** First-time registration, employer verification, account activation and returning login  
**Architecture status:** Deliberately not designed by this contract

## 1. Authority and supersession

This document is the canonical product contract for registration and account access.

It supersedes every earlier statement that:

- permits open public self-registration;
- removes Company ID from registration;
- treats employer or workplace association as optional information collected after financial onboarding; or
- allows an unprovisioned visitor to create a Future You account using only an email address and password.

Older slice contracts and evidence reports remain accurate records of what was approved and built at that time. They do not describe the newly approved registration target. No application, database, authentication or UI implementation is authorised or claimed by this document.

This supersession does not alter Sarah v1, simulator mathematics, financial-context versioning, conversation authority, RLS expectations or the rule that benefits are opportunities rather than automatically active money.

## 2. Product intent

Future You is supplied through an employer. The employer pre-provisions a person's eligibility to activate an account; it does not create the person's password or gain access to their personal financial information.

`Register` therefore means:

> Verify that my employer has provisioned access, prove control of my work email, and create my private Future You login for the first time.

It does not mean open consumer signup.

`Login` means:

> Access an already activated Future You account using my personal email and password.

## 3. Canonical journey

```text
Employer provisions Company ID + eligible work email
  -> user chooses Register
  -> user submits Company ID + work email
  -> Future You sends a verification code to that work email
  -> user submits the valid code
  -> Future You confirms the employer-provisioned access record
  -> user supplies personal email + chosen password
  -> Future You creates the private account and verified workplace association
  -> user completes financial onboarding
  -> user receives full-app access

Returning user
  -> user chooses Login
  -> user submits personal email + password
  -> user receives normal authenticated access
```

The Company ID and work email are first-time activation inputs only. They are not requested during an ordinary future login.

## 4. Terms

- **Company ID:** An employer identifier supplied to the employee. It identifies the provisioning organisation but is not treated as a secret or sufficient proof of identity.
- **Work email:** The employer-associated address pre-provisioned for the person.
- **Provisioned access record:** The employer-created eligibility record against which Company ID and work email are checked.
- **Work-email verification:** Proof that the registering person controls the provisioned work email, using a time-limited code.
- **Personal email:** The user's private, future login and account-recovery identifier. It is not supplied by the employer.
- **Verified workplace association:** The account-to-employer relationship created from the successfully claimed provisioned access record.
- **Financial onboarding:** The user-owned process that creates the first financial-context version after account activation.

## 5. Registration screen contract

### 5.1 Verify your workplace

The first Register screen contains:

- Company ID
- Work email
- `Send verification code`
- A route back to Login for already activated users

Both inputs are required. A Company ID alone cannot activate an account. A work email not paired with a matching provisioned record cannot activate an account.

The response must not reveal whether a Company ID, work email or Company-ID/work-email pairing exists. User-facing failure wording remains neutral.

### 5.2 Check your work email

The second screen contains:

- The destination in masked form
- A six-digit verification-code input
- `Verify work email`
- `Resend code`
- `Change details`

The canonical code policy is:

- time limited;
- single use;
- attempt limited;
- rate limited per provisioned record and requester;
- superseded when a replacement code is issued; and
- never logged or stored in plaintext.

A successful code verifies only the current registration attempt and its exact provisioned access record. The browser cannot use the proof to select a different employer or work email.

### 5.3 Create your account

Only after successful work-email verification does the third screen request:

- Personal email
- Password
- Confirm password
- `Register`

It must not request the Company ID or work email again unless the verified registration proof has expired or the user chooses to change the workplace details.

The personal email becomes the only routine login identifier. The employer must not be able to choose it, see it through ordinary employer access, or use it to view the person's financial information.

A confirmation message is sent to the personal email. The confirmation may be completed alongside onboarding and must be complete before full-app access; it does not introduce another personal-data-entry screen into the canonical sequence.

Password requirements and error messages must be clear, accessible and provider-independent. Raw authentication-provider errors are never displayed.

## 6. Activation and onboarding rules

- No Future You account is created before work-email verification succeeds.
- A provisioned access record can be claimed only once.
- Account creation and claiming the provisioned record must behave as one idempotent activation from the user's perspective.
- Exact safe retries cannot create a duplicate account or workplace association.
- A conflicting reuse must fail safely.
- Successful activation creates a verified workplace association; onboarding must not ask the user to type their employer again.
- Successful activation leads to financial onboarding, not directly to Home, Ask, Goals or Benefits.
- Full-app access requires completed financial onboarding and confirmed personal email ownership.
- Financial onboarding remains user-entered and private. Employer provisioning supplies no balances, income, spending, goals, conversations or simulation outcomes.

## 7. Returning-login contract

The Login screen contains:

- Personal email
- Password
- `Login`
- Account-recovery entry
- A route to Register for first-time users

Ordinary Login must not ask for:

- Company ID;
- work email;
- employer name; or
- another work-email verification code.

The work email is not a supported routine login alias in the initial contract.

## 8. Employer and privacy boundary

Employer provisioning may establish only the minimum access and workplace facts required for registration, such as:

- employer identity;
- Company ID;
- provisioned work email;
- provisioning, verification and claim status; and
- applicable access lifecycle metadata.

It does not authorise the employer to read or control:

- personal email;
- password or recovery credentials;
- financial context;
- current-account balances;
- income or spending;
- goals;
- decisions or scenarios;
- conversations;
- simulation runs; or
- assistant explanations.

Future You must keep employer-provisioning data separate from user-owned financial data and authentication secrets.

## 9. Benefits boundary

A verified workplace association may allow Future You to surface authoritative opportunities associated with that employer. It does not prove that a person is eligible for every benefit and does not prove that a benefit is active.

Benefits remain opportunities:

- no opportunity is automatically treated as spendable income;
- no opportunity automatically changes the current financial context;
- no benefit uptake is inferred from successful registration; and
- a benefit changes a simulation only through a separately approved, sufficiently specified scenario.

## 10. Failure and recovery behaviour

- Invalid, expired or over-attempt verification codes fail without creating an account.
- Losing access to the work email requires an approved employer-support recovery process; Future You must not bypass workplace proof using unverified claims.
- An already claimed provisioned record directs the legitimate user towards Login or account recovery without exposing account details.
- A personal email already attached to an existing Future You account must not create a duplicate identity. Linking a newly provisioned employer to an existing account requires a separately approved authenticated flow.
- Registration can be safely resumed only while its verified proof remains valid.
- Partial registration does not grant access to financial onboarding or the full app unless the preceding required state is complete.

## 11. Access lifecycle boundary

The initial registration implementation supports one active employer-provisioned association per account.

The following require a later contract and must not be improvised during implementation:

- linking a new employer to an existing Future You account;
- changing employers;
- concurrent employer memberships;
- employer-initiated suspension or removal;
- post-employment data retention and continued personal access;
- employer administration UI;
- bulk provisioning interfaces; and
- enterprise SSO.

## 12. Required acceptance behaviour

The future implementation is not complete until tests prove:

1. An unprovisioned visitor cannot create an account with only personal email and password.
2. A valid Company ID with a non-matching work email cannot continue.
3. A matching provisioned record sends a work-email verification code without exposing record existence in the response.
4. An invalid or expired code creates no account.
5. A valid code permits the personal-email/password screen.
6. Personal credentials cannot be submitted successfully without valid work-email proof.
7. Successful activation claims exactly one provisioned record and creates exactly one verified workplace association.
8. Exact retries do not create duplicate identities or associations.
9. A claimed record cannot activate a second account.
10. Successful activation routes to financial onboarding.
11. Onboarding does not ask for an employer already established by registration.
12. Full-app access is unavailable until onboarding and personal-email confirmation are complete.
13. Returning Login requires only personal email and password.
14. Work email cannot be used as an ordinary login alias.
15. Employer users cannot access the employee's personal or financial data.
16. Registration does not activate a benefit or change a financial simulation.
17. Cross-user and cross-employer access are blocked at the application and database boundaries.
18. Registration errors, logs and analytics expose no verification codes, passwords, complete email addresses or provider internals.

## 13. Explicit non-goals

This registration contract does not define:

- database tables, migrations or RLS policy syntax;
- Supabase implementation strategy;
- administrative credentials or server topology;
- email provider selection;
- employer portal architecture;
- UI visual polish beyond the required screen content and order;
- SSO, social login or passwordless returning login;
- benefit calculation or activation; or
- any new simulator behaviour.

Those decisions belong to a separate technical design and implementation slice. No implementation should begin until that design preserves this contract and the existing financial-authority boundaries.
