# Sarah Employer and Benefits Correction — Evidence Report

**Implementation date:** 25 August 2026

**Approved option:** Narrow Option B

**Contract:** `sarah-employer-and-benefits-correction-contract.md`

**Status:** Implementation complete; Track C and Track B Phase B2 not started

## 1. Recovery points

The pre-correction Track B1 state is independently recoverable through the annotated tag
`mvp-rc-sarah-story-b1-2026-08-25`, which dereferences to commit `a554000`. The earlier Track A
recovery point remains commit `ba5a83c` with annotated tag
`mvp-rc-employer-registration-2026-08-25`.

The B1 tag was created before application, migration, seed, test or visual correction files were
changed. No existing recovery tag was replaced.

## 2. Implementation summary

The implementation reuses the existing private employer/provision model and public verified
membership model. Migration `20260825180000_sarah_employer_benefits_correction.sql` adds the smallest
explicit opportunity model:

- `employer_benefit_offerings` for versioned, sourced employer reference records;
- `user_benefit_states` for separate owner-specific eligibility, uptake, baseline-inclusion and
  completeness state;
- an index for membership-scoped offering reads;
- an index for owner-scoped state reads;
- same-user/same-employer and same-offering/same-employer foreign-key constraints;
- append-only update/delete rejection triggers; and
- forced RLS with narrow authenticated read grants.

The generated seed now creates Sarah's claimed provision and verified membership, the two OniBank
offerings and two Sarah states. Generated database types were regenerated and pass drift validation.

Application changes add an `EmployerBenefitSource` port and a request-scoped
`SupabaseEmployerBenefitSource`. The product-surface application composes that source with the verified
workplace source and immutable financial context. Home schema `1.2.0` and Benefits schema `1.1.0`
return presentation-ready JSON. The story contracts advance to `1.1.0` and fail closed unless the
sourced season-ticket record/state is present.

The browser remains a renderer. It displays server-owned membership, pension, opportunity, status and
provenance strings and has no employer inference, simulator, persistence or provider access.

## 3. Membership and provision report

Canonical Sarah now has exactly one membership:

| Field | Canonical value |
|---|---|
| Auth user ID | `11111111-1111-4111-8111-111111111111` |
| Personal Login | `sarah@example.test` |
| Employer | OniBank |
| Employer ID | `44444444-4444-4444-8444-444444444444` |
| Company ID | `FY7K3M9Q2D` |
| Work email | `sarah.wonk@onibank.test` |
| Membership status | `ACTIVE` |
| Membership source | `employer_provisioned` |
| Provision ID | `55555555-5555-4555-8555-555555555559` |
| Provision state | `CLAIMED` |
| Provision provenance | `canonical-sarah-employer-membership-v1` |

The work address remains technical demonstration data. It did not replace Sarah's personal Login,
create another Auth user, change recovery or replay/fabricate an OTP history. The consumed provision
has no eligible duplicate and cannot be claimed again.

## 4. Offering and user-state data

OniBank has two explicit reference records with reference and last-confirmed date 31 August 2026,
record version 1 and schema `future-you.employer-benefit-offering/1.0.0`.

| Benefit key | Display state | Numerical simulation | Further information |
|---|---|---:|---:|
| `ADDITIONAL_PENSION_MATCH` | Available opportunity; appears to match up to 5% | No | Required |
| `SEASON_TICKET_LOAN` | Available opportunity; eligibility unknown | No | Required |

Each offering has one separate Sarah-owned state with schema
`future-you.user-benefit-state/1.0.0`: eligibility `UNKNOWN`, uptake `INACTIVE`, information
`INCOMPLETE`, and `included_in_financial_baseline = false`.

The offering tables contain no saving, annual/monthly value, loan amount, repayment, cash-flow effect,
eligibility claim or active contribution percentage. Sarah's active employee/employer pension values
remain solely in her immutable context.

## 5. Benefits, Home and story presentation

Benefits now deliberately shows three separate states:

1. verified, active OniBank membership;
2. active workplace pension with Sarah 3% and OniBank 3%, sourced from the immutable context and
   labelled retirement value rather than spendable cash; and
3. two inactive opportunities with unknown/unconfirmed eligibility and no calculated effect.

Home uses a fixed presentation priority to show the sourced season-ticket loan first. Its `See details`
action navigates to Benefits. This order is a presentation choice, not financial advice. The card does
not post an Ask message, create a scenario, call a provider or claim the opportunity changes the trip.

The Sarah story opportunity step now uses the same request-scoped offering/state source. It says that
OniBank lists the loan, Sarah's eligibility is unknown and it is not in her plan or calculation. The
story still reads the same four immutable runs and creates none.

Generic no-workplace, unverified-workplace and verified-with-no-reference-data states remain covered by
separate fixtures. A verified workplace with no records sees: “We do not have confirmed benefit
information for this workplace yet.” Employer name, Company ID, email domain and a mismatched employer
record never create an opportunity.

## 6. Provenance and authority report

The server-owned composition is:

```text
verified employer membership
        +
explicit employer offering
        +
owner-scoped eligibility/uptake state
        +
immutable financial-context pension fact
        =
presentation-ready Home / Benefits / story DTO
```

Reference provenance is `CANONICAL_DEMONSTRATION_REFERENCE`; Sarah state provenance is
`CANONICAL_DEMONSTRATION_FIXTURE`; pension provenance is context version
`sarah-v1@2026-09-01`. Neither the browser nor a model determines existence, eligibility, uptake,
baseline inclusion, simulation support or pension cash treatment.

## 7. Financial stability proof

No financial-context migration, payload update or current-pointer operation was introduced.
Integration rehydration matches `SARAH_V1_CONTEXT` through canonical field-for-field serialization.
Sarah retains exactly one context version and the current pointer remains `sarah-v1@2026-09-01`.

The following identities remain unchanged:

- context `sarah-v1@2026-09-01`;
- baseline `baseline-ec13101a3fe66f17`;
- rules `fy-sim/1.0.0`;
- calendar `govuk-england-and-wales-2026-2028@2026-08-23`;
- £650 run `run-19b9e20a1ed382dc`;
- £500 run `run-3b1f93a202af641a`;
- £400 run `run-84e655ad5797d8d2`; and
- October run `run-3728df098b2960e5`.

Frozen results also remain unchanged:

- current path: £900 safety buffer; Emergency fund December 2026, Holiday May 2027, House deposit
  June 2029;
- £650 September: £250 lowest buffer, bills covered, £0 overdraft, restored November 2026, Emergency
  fund February 2027, Holiday June 2027, House deposit July 2029, significant trade-off;
- £500 September: £400 lowest buffer, restored October 2026, Emergency fund January 2027, significant
  trade-off;
- £400 September: £500 lowest buffer, restored October 2026, Emergency fund January 2027, noticeable
  trade-off; and
- £650 October: £250 lowest buffer with the same frozen goal dates as the September £650 scenario.

Opening Home and Benefits creates no run. Passive surface browser coverage observes zero conversation
message requests, and dependency enforcement proves that product-surface composition imports no
provider. Requests to use the season-ticket loan or change pension contribution remain unsupported and
invoke no simulator branch.

## 8. Security and RLS evidence

Both new tables have forced RLS. `employer_benefit_offerings_select_for_active_membership` permits an
authenticated user to read only offerings for an employer where that user has an active membership.
`user_benefit_states_select_own_active_membership` additionally requires ownership. Anonymous roles
have no table grant.

Ordinary authenticated users have SELECT only. They cannot insert, update or delete offering/state
records. Composite foreign keys prevent cross-employer state references. Append-only triggers reject
administrative update/delete rewrites; later state evolution requires a separately versioned record
contract rather than silent history mutation.

Database and integration tests prove:

- Sarah reads only OniBank offerings and her two states;
- Alex cannot read Sarah's membership, OniBank offerings or Sarah states;
- an Other Employer member cannot read OniBank offerings and Sarah cannot read the other catalogue;
- anonymous access is denied;
- normal routes use the request-scoped authenticated client;
- production Home, Benefits and story composition has no service/secret credential; and
- the new membership/offering relationship gives OniBank no access to Sarah's financial context,
  goals, scenarios, runs, conversations or story financial data.

No owner, employer or context identity is accepted from the browser. There is no offering-by-ID
ordinary API, so foreign and nonexistent offering/state IDs are not enumerable through a public route.

## 9. Visual evidence

The intentional captures are:

- `artifacts/slice-6-visual/home-lower-414x896.png`;
- `artifacts/slice-6-visual/benefits-canonical-414x896.png`;
- `artifacts/slice-7-visual/07-home-lower-414x896.png`;
- `artifacts/slice-7-visual/16-benefits-canonical-414x896.png` (full page);
- `artifacts/slice-7-visual/benefits-768x1024.png`;
- `artifacts/slice-7-visual/benefits-1440x900.png`; and
- `artifacts/track-b1-visual/08-opportunity-information-414x896.png`.

The only updated Playwright visual-regression baseline is
`benefits-canonical-mobile-chromium-darwin.png`. Its expected/actual/diff was manually reviewed before
the approved update. A subsequent no-update affected run passed 18/18, and the final full no-update
browser suite passed 31/31. Mechanically changed unrelated captures were restored.

The reviewed visual state distinguishes Verified workplace, Active membership, Active pension,
Available opportunity and Eligibility unknown; long labels wrap without horizontal overflow. It
contains no benefit saving, cash effect, recommendation or activation/simulation control.

## 10. Verification results

All final gates ran after the target was proven local (`127.0.0.1`, local API port 54321 and PostgreSQL
port 54322). The database was recreated using `supabase db reset --local` through the project script;
all five committed migrations and generated seed applied with no dashboard or manual SQL step.

| Gate | Discovered | Passed | Failed | Skipped/not run | Result |
|---|---:|---:|---:|---:|---|
| Vitest unit/regression | 29 files / 263 tests | 29 files / 263 tests | 0 | 0 | Pass |
| Supabase integration | 6 files / 20 tests | 6 files / 20 tests | 0 | 0 | Pass |
| PostgreSQL/pgTAP | 6 files / 273 assertions | 6 files / 273 assertions | 0 | 0 | Pass |
| Conversation evaluation corpus | 1 file / 34 cases | 1 file / 34 cases | 0 | 0 | Pass |
| Fake-provider modes | 1 file / 8 tests | 1 file / 8 tests | 0 | 0 | Pass |
| Affected browser subset | 18 tests | 18 tests | 0 | 0 | Pass |
| Full Playwright mobile Chromium | 31 tests | 31 tests | 0 | 0 | Pass |

Additional gates:

- TypeScript: pass, zero errors.
- ESLint: pass, zero errors.
- Production Next.js build: pass, all pages and Route Handlers compiled.
- Coverage: pass — 73.09% statements, 58.34% branches, 76.88% functions and 75.85% lines.
- Seed and generated database-type drift: pass.
- Client-bundle/dependency boundary: pass; built chunks contain no server-only simulator/store
  identifiers, and source dependency tests prevent product UI imports of financial/provider adapters.
- Clean local database reset: pass; Sarah, Alex, onboarding, visual, registration and story fixtures
  were recreated from committed migrations and generated seed.
- `git diff --check`: pass.
- Skipped tests: zero.
- Live OpenAI evaluation: **BLOCKED — authorised credential/model configuration unavailable**.

No Slice 1–7, Track A or Track B1 financial expectation was changed or weakened to obtain a pass. The
two historical Track A assertions that treated Sarah as membership-free were replaced with stronger
owner-specific checks: Sarah cannot see or acquire the registration-test user's membership and her
canonical OniBank membership remains unchanged after a personal-email collision attempt.

## 11. Remaining limitations and recommendation

- Eligibility is unknown and cannot be verified in this slice.
- Neither opportunity can be activated, applied for or numerically simulated.
- No employer administration, payroll or employer-system integration exists.
- Offering and Sarah-state changes require controlled versioned seed/operational work; ordinary users
  cannot mutate them.
- Home's season-ticket ordering is fixed presentation, not a recommendation.
- Ask remains intentionally unable to use either opportunity.

The correction completion gate is satisfied. Track C may now be considered for a separately approved
start because Sarah's employer and Benefits data are internally coherent, source-backed and isolated.
This report does not start or approve Track C. Track B Phase B2 also remains paused.
