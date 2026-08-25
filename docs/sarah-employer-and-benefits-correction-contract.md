# Sarah Employer and Benefits Correction Contract

**Status:** Approved and implemented

**Contract date:** 25 August 2026

**Canonical benefit reference date:** 31 August 2026

**Canonical person:** Sarah Wonk / Sarah v1

**Paused work:** Track C and Track B Phase B2

## 1. Purpose and authority

This contract resolves a canonical-data inconsistency discovered after Track B Phase B1. It defines
Sarah's employer relationship, separates active benefit facts from employer opportunities, and defines
the minimum honest persistence and presentation model for a later implementation slice.

This document first froze the product/data contract. A subsequent explicit approval authorised the
narrow Option B implementation, including its migration, seed, request-scoped read models, tests and
reviewed visual updates. It still does not authorise simulator mathematics, financial-context mutation,
benefit calculation, activation or a new Ask branch.

If approved, this contract is authoritative for Sarah's employer and Benefits state wherever it
conflicts with older product, UI, fixture or evidence descriptions. Historical evidence remains an
accurate record of what existed and passed at its original gate; it must not be rewritten as though the
inconsistency never existed.

That separate implementation approval was received. Track C and Phase B2 remain paused until the
correction evidence gate is accepted.

Normative terms in this document use **must**, **must not**, **should** and **may** in their ordinary
contract sense.

## 2. Confirmed inconsistency

The current repository contains these individually valid but collectively inconsistent facts:

| Area | Current state | Why it is inconsistent |
|---|---|---|
| Canonical profile | Sarah is a Customer Insights Analyst at OniBank. | Employment is treated as canonical profile context. |
| Employer reference | OniBank is an active employer with Company ID `FY7K3M9Q2D`. | The employer exists independently of Sarah. |
| Sarah membership | Sarah has no verified `employer_memberships` record and no fallback workplace row. | The application cannot prove her canonical OniBank relationship. |
| Benefits workplace card | The real Sarah surface reports `No workplace added`. | It contradicts her canonical employment. |
| Active pension | The selected Sarah financial context contains active 3% employee and 3% employer pension information. | The employer contribution appears without a corresponding verified workplace relationship. |
| Additional pension match | The canonical rules describe an OniBank match up to 5%, but no authoritative persisted opportunity exists. | The product suppresses the opportunity despite the canonical story. |
| Season-ticket loan | The canonical rules describe an OniBank offering with eligibility unknown, but no authoritative persisted opportunity exists. | The product suppresses the opportunity despite the canonical story. |
| Opportunity catalogue | No employer-benefit offering store exists. | Workplace names cannot safely produce opportunities. |

The green test suite currently preserves different incomplete representations of Sarah: some tests
inject unverified OniBank, the real seeded Sarah browser journey expects no workplace, and the canonical
simulation documents retain the missing benefit facts. Those tests prove their former contracts; they
do not prove canonical cross-layer consistency.

This is a data-contract and fixture inconsistency. It is not a simulator-mathematics error and does not
justify changing any financial value or result.

## 3. Canonical Sarah employer relationship

### 3.1 Employer

| Field | Canonical value |
|---|---|
| Employer | OniBank |
| Company ID | `FY7K3M9Q2D` |
| Status | Active |
| Type | Canonical fictional demonstration employer |
| Financial effect | None |

### 3.2 Verified membership

| Field | Canonical value |
|---|---|
| Membership status | Active |
| Verification status | Verified |
| Relationship | Employer-provisioned |
| Work email | `sarah.wonk@onibank.test` |
| Provision state | Claimed/consumed |
| Source | Canonical employer-provisioned demo fixture |
| Financial effect | None |

The `.test` address is a non-real demonstration identity. It is Sarah's work-email evidence only and
must not become her personal login identifier. Her existing personal authentication identity remains
unchanged.

Sarah is an existing controlled legacy fixture. The implementation must therefore:

- reuse her existing Supabase Auth user;
- create no duplicate Auth identity;
- preserve her personal login email and credentials;
- avoid replaying the interactive first-time registration flow;
- preserve `legacy_fixture` as the truthful registration origin unless a separately approved migration
  defines a more precise origin model; and
- explicitly backfill or seed a claimed provision and active verified membership whose resulting state
  is equivalent to a successful employer-provisioned membership.

The fixture must not claim that the historic Sarah user literally completed every current Track A
screen. Its provenance must make the controlled backfill explicit.

## 4. Three separate employer and benefit layers

The future read model and UI must preserve these layers rather than compressing them into one status.

### A. Employer membership

Membership proves only that Sarah is associated with OniBank for the demonstration and is entitled to
the employer-provisioned Future You environment.

It does not prove that:

- Sarah uses every OniBank benefit;
- Sarah is eligible for every OniBank offering;
- a benefit has a known monetary value;
- a benefit affects her financial context; or
- a benefit can be simulated.

### B. Active user-specific benefit facts

These are facts currently confirmed for Sarah. The active pension contribution is the only canonical
active benefit fact in this contract.

### C. Employer opportunities

These are explicit, sourced OniBank offerings that are available as information. They are not evidence
of Sarah's eligibility, uptake, cash value or numerical effect. The additional pension match and
season-ticket loan are opportunities.

The words **Verified**, **Active**, **Available**, **Eligibility unknown** and **Not active** apply to
different layers and must not be used as interchangeable labels.

## 5. Canonical active pension fact

| Field | Canonical value |
|---|---|
| Benefit | Workplace pension |
| Employer | OniBank |
| Employee contribution | 3% |
| Employer contribution | 3% |
| State | Active |
| Evidence | Confirmed canonical Sarah financial-context fixture |
| Net-pay treatment | Sarah's £2,450 take-home already reflects her employee contribution |
| Employer contribution treatment | Retirement value; not spendable income |
| Baseline effect beyond existing net pay | None |

The 3%/3% fact must be visibly associated with Sarah's verified OniBank membership. Its contribution
percentages remain owned by the immutable financial context. They must not be duplicated as a second
financial source of truth in an employer catalogue.

The employer contribution must not increase current-account cash, the safety buffer, monthly saving
capacity or purchase affordability. It must never be added to the cash ledger.

## 6. Canonical additional pension-match opportunity

| Field | Canonical value |
|---|---|
| Benefit | Employer pension matching up to 5% |
| Employer | OniBank |
| Employer offering status | Available |
| Sarah's current employee contribution | 3% |
| Sarah's current confirmed employer contribution | 3% |
| Potential additional-match range | Contribution level above 3% and up to 5% |
| Sarah eligibility | Unknown pending approved eligibility evidence |
| Sarah uptake | Not active |
| Financial-context effect | None |
| Numerical simulation | Unsupported/incomplete |
| Provenance | Canonical OniBank demonstration benefit record |
| Reference date | 31 August 2026 |

The product may say that OniBank appears to match contributions up to 5%. It must not claim that Sarah
is definitely eligible for the additional match, calculate a take-home change, calculate additional
retirement value, recommend increasing her contribution, or change the £650 result.

A future numerical 3%-to-5% scenario would require all of the following under a separate contract:

- confirmed or explicitly accepted estimated payroll effect;
- effective payday;
- applicable eligibility terms; and
- approved pension-simulation behaviour.

## 7. Canonical season-ticket-loan opportunity

| Field | Canonical value |
|---|---|
| Benefit | Season-ticket loan |
| Employer | OniBank |
| Employer offering status | Available |
| Sarah eligibility | Unknown |
| Sarah uptake | Not active |
| Included in current financial plan | No |
| Financial-context effect | None |
| Numerical simulation | Unsupported/incomplete |
| Provenance | Canonical OniBank demonstration benefit record |
| Reference date | 31 August 2026 |

The following remain unknown:

- eligibility confirmation;
- loan amount;
- start or disbursement date;
- repayment amount, frequency and duration;
- fees;
- the transport expense replaced or changed; and
- payroll and net-pay treatment.

The opportunity must not affect Sarah's baseline, £650 trip, goal dates, cash or income. It must not be
described as saving a specific amount. It creates no simulator branch and no Ask branch.

The current product must not show `See what changes`, claim that Sarah should use the loan, or invite a
numerical exploration it cannot perform. Older golden-path copy and architecture that describe an
`S1-O1`/Needs information branch are superseded by this rule. Benefits may present the offering only as
informational, with eligibility unknown and no numerical effect.

## 8. Canonical Benefits presentation states

Sarah's corrected Benefits surface must eventually show the workplace relationship and three distinct
benefit states.

### 8.1 Workplace

- Workplace: OniBank
- Verification: Verified
- Membership status: Active
- Source: Employer-provisioned demonstration membership
- Benefit information source: Canonical demonstration reference data

The ordinary Benefits summary should omit or mask the work email and need not display the public Company
ID. Company ID belongs to registration and controlled fixture documentation.

### 8.2 Active pension contribution

```text
Workplace pension
Active

You contribute 3%.
OniBank contributes 3%.

Retirement value — not spendable cash.
Included in your current financial context where applicable.
```

### 8.3 Additional pension match

```text
Additional pension match
Available opportunity

OniBank appears to match contributions up to 5%.
You currently contribute 3%.

Not active.
No numerical effect has been calculated.
```

### 8.4 Season-ticket loan

```text
Season-ticket loan
Eligibility unknown

OniBank lists this opportunity.
It is not included in your current financial plan.

More information would be required before any future simulation.
```

Exact prose may be refined in implementation review. The factual states, uncertainty and lack of
financial effect may not change.

## 9. Financial-context and simulator invariants

This correction must not create or revise Sarah's financial-context version. It must not recalculate or
replace a historical run.

The following remain frozen:

- £2,750 actual current-account balance;
- £1,850 routine-spending reserve;
- £900 preferred safety buffer;
- £2,450 take-home pay;
- £600 goal contribution capacity;
- every goal balance, target, allocation rule and completion date;
- the £650, £500, £400 and October scenario inputs and outputs;
- every affordability classification;
- `sarah-v1@2026-09-01` context identity; and
- every story-mode financial fact.

The £650 result remains exactly:

- safety buffer: £900 to £250;
- bills covered;
- £0 overdraft;
- buffer restored November 2026;
- emergency fund February 2027; and
- Affordable — significant trade-off.

The correction changes only verified employer membership, active-benefit provenance, employer
opportunity reference data and informational Home/Benefits presentation.

## 10. No employer-name inference

For Sarah and every ordinary user:

> A workplace name alone is not evidence that an employer offers a benefit.

The application must not infer pension matching, a season-ticket loan or another opportunity from an
employer name, Company ID alone, industry, job title, location, LLM output, prototype copy, general
knowledge or web search.

Sarah may show these opportunities only because explicit canonical demonstration records exist.

A user with a verified workplace but no authoritative offering record must see:

> We do not have confirmed benefit information for this workplace yet.

A user-provided unverified workplace must remain distinct from a verified employer membership. Other
users must not inherit Sarah's membership or OniBank opportunities merely because they enter the name
`OniBank`.

## 11. Provenance model

Every employer membership, active fact, employer offering and user-specific benefit status must expose
enough server-side provenance for audit without turning provenance into a second financial ledger.

At minimum retain:

- record identity;
- employer identity;
- fact or benefit key and name;
- state/status;
- source and source reference;
- reference or effective date;
- verification state;
- employer-level versus user-specific scope;
- whether the item affects the baseline;
- whether numerical simulation is supported; and
- last-confirmed date where applicable.

The layers map as follows:

| Layer | Source of truth | Record identity | Financial treatment |
|---|---|---|---|
| Verified employment | Existing claimed provision plus `employer_memberships` row | Provision ID and membership owner/employer identity | No financial effect |
| Active 3%/3% pension | `PENSION_INFORMATION` inside Sarah's immutable current context | Context-version ID plus the `PENSION_INFORMATION` fact key | Employee effect already included in net pay; employer amount non-spendable |
| Employer opportunity | Explicit employer benefit-offering reference record | Offering ID and version/effective identity | No baseline effect |
| Sarah eligibility/uptake | Explicit owner-scoped status linked to an offering | User-status record ID | No effect unless a future approved context/scenario says otherwise |
| UI state | Server-side read model joining only the authorised layers | Source IDs/version metadata retained server-side | Presentation only |

The Benefits read model may connect Sarah's active pension fact to the single active verified OniBank
membership, but it must continue reading the 3% values and net-pay treatment from the selected financial
context. It must not copy those values into opportunity records.

## 12. Representation options assessed

### Option A — Sarah-only fixture objects

Store the two opportunities in Sarah-only code or fixture data and join them directly in the Sarah demo.

Advantages:

- smallest code and migration footprint;
- easy to constrain to the controlled demonstration; and
- no claim of an employer integration.

Risks:

- makes Sarah identity a data-selection rule;
- encourages presentation-shaped fixture duplication;
- provides weak record-level provenance;
- does not cleanly distinguish employer offerings from user status; and
- is difficult to extend without another contract rewrite.

This can make a screenshot correct, but it is not the preferred correction because the underlying
catalogue inconsistency would remain.

### Option B — Narrow explicit employer offering records

Reuse the existing employer, provision and membership model; add a small, explicit, effective-dated
offering store and an owner-scoped user-status store.

Recommended conceptual records are:

1. `employer_benefit_offerings`
   - employer and stable benefit key;
   - display name/category;
   - employer offering state;
   - narrowly typed terms, such as a 5% match ceiling where applicable;
   - provenance, verification, reference date and last-confirmed date;
   - baseline-effect and numerical-simulation flags; and
   - immutable/effective-dated identity rather than silent historical rewriting.
2. `user_benefit_statuses`
   - owner and offering identity;
   - eligibility state;
   - uptake state;
   - source, verification and effective date; and
   - explicit no-baseline-effect/no-simulation treatment for these Sarah records.

Authenticated users should have no direct write or delete grant. Offering reads should require an
active same-employer membership. User-status reads should be owner-scoped with forced RLS. The normal
server path should use the request-scoped authenticated client, not administrative credentials.

Advantages:

- gives each claim explicit provenance;
- separates employer offerings from Sarah's usage;
- avoids putting opportunities in immutable financial contexts;
- prevents employer-name inference; and
- creates an honest, narrow basis for Home and Benefits without claiming a full integration.

Risks:

- requires a migration, generated types, seed updates, RLS/grants, application ports, DTO evolution and
  regression work; and
- requires careful effective-date and same-employer constraints.

### Option C — Put all benefit state in the financial context

This would add the available match and season-ticket loan to Sarah's immutable financial context.

It is rejected because available opportunities are not current financial facts, offering information
and user finances have different lifecycles, and reference-data changes should not create a new
financial-context version. It would also risk making opportunity availability appear financially
authoritative.

### Recommendation

Use a deliberately narrow **Option B** implementation.

It is the smallest implementation that fixes the source-of-truth problem rather than only fixing
Sarah's rendered output. Limit the first catalogue to the two explicit OniBank opportunity records and
Sarah's two explicit unknown/not-active user states. Reuse the existing membership tables. Keep the
active 3%/3% percentages in the financial context and compose them with membership in the read model.

This is reference-data persistence, not an employer portal, payroll connection, eligibility service,
benefit activation workflow or numerical benefits engine.

## 13. Seed and membership correction requirements

A later approved implementation should update the generated local seed source, with `supabase/seed.sql`
remaining generated rather than hand-edited.

The seed should:

1. create or reuse the canonical active OniBank employer;
2. create one dedicated provision for `sarah.wonk@onibank.test`;
3. mark that provision claimed by Sarah's existing Auth user;
4. create exactly one active, verified Sarah/OniBank membership;
5. identify the source as a canonical employer-provisioned demo fixture;
6. create the two dated OniBank offering records;
7. create Sarah's explicit eligibility/uptake states;
8. leave Sarah's personal login and profile activation unchanged; and
9. leave her context and stored runs byte-for-byte/reproducibly unchanged.

The correction must be recreated by migrations and committed seed/setup sources after a clean local
database reset. It must require no dashboard action or undocumented manual SQL.

## 14. UI and product implications

### Benefits

Benefits must show verified active OniBank, the active pension fact, the available match and the
eligibility-unknown season-ticket loan as separate cards/states. It must remain informational and make
zero simulator and provider calls.

### Home

Home may show at most one sourced informational opportunity under the existing product constraint. It
must use an explicit offering record, show no fabricated value, link to Benefits information, create no
scenario, and invoke no AI provider. Which of the two records is selected for the first Home preview is
a presentation decision for the implementation review, not a financial decision.

### Story mode

Sarah's guided story may mention that a sourced employer opportunity exists, but only as informational
narrative. It must not claim eligibility, savings, improved affordability or a changed future path. No
story result or stored run changes.

### Ask and Track C

This contract adds no conversational intent. `Use the season-ticket loan`, `change my pension to 5%`
and equivalent numerical benefit requests remain unsupported, invoke no simulator and create no branch.
The future Track C provider evaluation must not receive a capability to infer or calculate benefit
effects from these records.

## 15. Privacy and security boundary

The correction must preserve Track A's separation between employer access entitlement and the user's
private financial life.

An employer must not gain access to Sarah's:

- personal login identity;
- current-account balances;
- income or spending;
- goals or safety buffer;
- contexts, scenarios or runs;
- conversations;
- human context; or
- story interactions beyond separately approved demonstration administration.

Reference data must not provide a join path for an employer operator to employee financial data. No
employer operator role or portal is created by this correction.

Required controls include:

- forced RLS and narrow grants for user-specific membership/status data;
- same-owner and same-employer foreign-key or equivalent database constraints;
- no anonymous access to private membership or user-status records;
- no authenticated user writes to authoritative employer offerings;
- no administrative credential in ordinary Home/Benefits routes;
- private/no-store authenticated APIs;
- non-enumerable foreign and nonexistent identifiers; and
- omission or masking of work email in ordinary Benefits DTOs and UI.

Employer-level reference rows may be shared with eligible members only through an active matching
membership. Their schema must not contain employee financial facts.

## 16. Required implementation acceptance tests

### 16.1 Membership and fixture identity

- Sarah has exactly one active verified OniBank membership.
- It uses `sarah.wonk@onibank.test` and the approved canonical demo source.
- Its provision is claimed/consumed by Sarah's existing user ID.
- No duplicate Sarah Auth identity is created.
- Sarah's personal login identity is unchanged.
- Her legacy fixture history is represented honestly.
- Sarah's employer is not inferred from profile/free text.
- Other users do not inherit her membership.

### 16.2 Benefits behaviour

- Sarah's workplace card shows verified active OniBank and not `No workplace added`.
- The active pension card shows 3% employee and 3% employer.
- The employer contribution is labelled non-spendable.
- The active pension is visibly connected to OniBank without duplicating its percentages as catalogue
  authority.
- Additional match up to 5% is shown as Available, eligibility not asserted, and uptake Not active.
- The additional match has no numerical impact.
- Season-ticket loan is shown as Eligibility unknown and Not active.
- The loan has no numerical impact.
- No benefit simulation action, `See what changes` action or Ask branch exists.
- A workplace name alone creates no offering.
- A verified workplace with no records shows the approved no-confirmed-information message.
- A user-provided unverified OniBank name receives no OniBank catalogue.

### 16.3 Financial regression

- Sarah v1 rehydrates unchanged.
- Context identities and stored-run hashes/results remain unchanged.
- All frozen £650, £500, £400 and October scenarios remain unchanged.
- All Sarah acceptance tests pass.
- All story-mode financial values and results remain unchanged.
- Opening Home or Benefits creates no run.
- Home and Benefits make zero fake/live provider calls.

### 16.4 Database and security

- Forced RLS and grants are proven for every new user-readable table.
- Sarah can read her own membership and applicable offering/status records.
- User B cannot read Sarah-specific membership or status.
- User B cannot obtain OniBank offerings without an active OniBank membership.
- An unverified `OniBank` workplace row grants no catalogue access.
- Anonymous users cannot read private membership/status data.
- An authenticated user cannot insert, update or delete authoritative offering data.
- An authenticated user cannot forge eligibility or uptake state.
- Same-owner/same-employer references are enforced at database level.
- Employer reference data exposes no employee financial information.
- Foreign identifiers remain non-enumerable.
- Administrative credentials remain absent from normal routes.

### 16.5 Full regression

The implementation gate must include:

- Track A registration;
- Track B1 story;
- Slice 1–7 unit/regression suites;
- Supabase integration tests;
- PostgreSQL/pgTAP;
- conversation evaluation corpus;
- fake-provider modes;
- all Playwright/browser tests and approved visual evidence/baselines;
- TypeScript;
- ESLint;
- production build;
- generated database artifacts/types and seed drift;
- client-bundle/dependency boundaries;
- a clean local database reset from committed sources;
- `git diff --check`; and
- zero skipped tests.

No prior financial, RLS, ownership, immutability, renderer-authority or provider-zero expectation may be
weakened to obtain a pass.

## 17. Existing sources that preserve or expose the inconsistency

These records must remain historically truthful. A future implementation should add correction or
supersession notes where required rather than rewriting old evidence.

### 17.1 Canonical and product documents

| Source | Current statement or gap | Required future treatment |
|---|---|---|
| `src/fixtures/sarah-v1.ts` | Canonical profile says Sarah works at OniBank; context contains 3%/3% pension facts. | Keep values; connect through verified membership. |
| `src/fixtures/sarah-v1-onboarding.ts` | Recreates pension facts but has no workplace because verified membership is separate. | Keep context mapping; do not reinsert workplace into financial onboarding. |
| `simulation-rules-specification.md` | Correctly names active 3%/3%, available match up to 5% and eligibility-unknown loan. | Preserve; cite explicit records after implementation. |
| `golden-path-conversation-specification.md` | Correctly names the facts, but older sections describe opportunity actions and an `S1-O1` branch. | Preserve history; add correction that Ask remains unsupported and branchless. |
| `golden-path-ui-mapping.md` | Defines the opportunity cards, then its Slice 6 note suppresses them because records do not exist; older copy includes `See what changes`. | Supersede suppression after records exist, but retain the new no-branch rule. |
| `mvp-specification.md` | Slice 6 amendment says current Sarah has no authoritative opportunity records; older acceptance still names a Needs information loan branch. | Mark as historical data-state evidence and supersede the branch expectation. |
| `shared-product-surfaces-slice-6.md` | Treats OniBank as user-provided/unverified and Sarah as having no authoritative opportunities. | Add an explicit post-B1 correction note after implementation. |
| `slice-6-evidence-report.md` | Accurately reports the sparse, unverified/no-catalogue implementation that passed. | Preserve evidence; append/point to later correction evidence. |
| `slice-7-evidence-report.md` | Preserves the sparse Benefits visual baseline and states that no catalogue exists. | Preserve release evidence; record the later approved baseline change separately. |
| `technical-architecture-specification.md` | Earlier architecture proposes curated OniBank data and an incomplete opportunity branch; later implementation diverged. | Record the narrow offering store but keep numerical benefit modelling and Ask branching disabled. |
| Track A registration contract/design/evidence | Correctly separates verified membership from benefit eligibility and proves membership for newly registered users. | Preserve; explain Sarah's explicit legacy-fixture backfill. |
| Track B1 design/evidence | Shows Sarah's OniBank role and treats opportunity information as uncalculated. | Preserve all financial results; only update sourced informational wording if approved. |
| `future-you-evolution-details.md` | Contains the original benefit concept, later suppression, Track A membership and B1 employer context at different milestones. | Append the discovery/correction; never reorder or condense history. |

### 17.2 Seed and implementation boundaries

| Source | Current state |
|---|---|
| `scripts/generate-supabase-seed.ts` / generated `supabase/seed.sql` | Create Sarah and OniBank separately but create no Sarah provision/membership and no opportunity records. |
| `SupabaseWorkplaceAssociationSource` | Correctly prefers a verified membership, but finds none for Sarah and then no fallback workplace. |
| Product-surface application/DTO contracts | Benefits always emits an empty opportunity list; the DTO currently makes opportunities `never[]`; Home always emits no preview. |
| Benefits UI | Honestly renders the server's current no-workplace/no-opportunity state, exposing the canonical contradiction. |

### 17.3 Tests and visual evidence

| Source | Current expectation | Future handling |
|---|---|---|
| `tests/product-surfaces.test.ts` | Injects unverified OniBank and expects 3%/3% with no opportunities. | Replace the Sarah-specific expectation with verified membership and explicit inert opportunities; keep separate unverified-user coverage. |
| `tests/product-surface-api-contract.test.ts` | Expects `benefits.opportunities` to be empty. | Evolve the versioned DTO contract and add exact provenance/status assertions. |
| `tests/e2e/slice-6-product-surfaces.spec.ts` | The canonical Sarah journey expects `No workplace added` and absence of season-ticket/5% content. | Replace only the superseded Sarah expectation; retain generic no-workplace coverage. |
| `tests/e2e/slice-7-release-candidate.spec.ts` and Benefits PNG baseline | Preserve Sarah's current sparse canonical Benefits screen. | Update only with explicit visual-baseline approval and retain generic no-data coverage. |
| Track A unit/integration/pgTAP/browser tests | Prove newly registered users receive verified memberships. | Preserve and add the legacy Sarah backfill/identity case. |
| Track B1 story tests | Require opportunities to remain outside calculations and avoid eligibility/saving claims. | Preserve; optionally assert sourced informational copy without adding calculation. |
| Conversation/evaluation tests | Treat season-ticket and pension-change requests as unsupported and block fabricated benefit values. | Preserve unchanged. |
| Sarah acceptance and alternatives tests | Freeze all financial outcomes. | Preserve unchanged. |

The absence of a Sarah membership assertion in the seed/integration suite is itself a coverage gap. The
future correction must add a positive membership assertion and a negative cross-user inheritance
assertion.

## 18. Recommended implementation slice

After this contract is approved, implement one isolated **Sarah Employer and Benefits Consistency
Slice** before Track C or Phase B2 resumes.

The slice should contain only:

- the canonical Sarah claimed-provision/membership backfill;
- the narrow Option B employer-offering and user-status records;
- forced RLS, narrow grants and generated types;
- request-scoped persistence/read-model adapters;
- versioned Home/Benefits DTO and renderer changes needed for informational presentation;
- any approved sourced story wording;
- supersession notes and a new evidence report;
- the acceptance and full regression suite in section 16; and
- approved visual-baseline updates, if the UI change requires them.

It must exclude:

- numerical benefit or pension simulation;
- eligibility automation;
- benefit application/activation;
- an employer portal or employer financial-data access;
- payroll/employer integration;
- new Ask intent or opportunity branch;
- simulator or financial-context changes;
- Track C live-provider work; and
- Phase B2 everyday-companion or human-context work.

## 19. Decisions still requiring implementation review

No product-state, Sarah-value or simulation decision is unresolved in this contract. The later technical
slice must still freeze these implementation details before code:

- exact table, constraint, status-enum and versioning names for the narrow Option B records;
- whether effective-dated records use a supersession link or another immutable current-record rule;
- the version numbers and compatibility policy for Home/Benefits DTO changes;
- which one of the two opportunities, if either, Home previews first;
- exact user-facing copy within the locked factual boundaries; and
- the explicit visual-baseline update set.

Those choices must not reopen eligibility, numerical effect, Sarah's financial values, simulator
behaviour or the no-Ask-branch decision.

## 20. Approval and stop gate

Approval of this document would freeze:

- Sarah's verified active OniBank membership;
- the 3%/3% active pension fact and its non-spendable treatment;
- the available additional match up to 5% with unknown eligibility and no uptake/effect;
- the eligibility-unknown, inactive season-ticket loan with no effect;
- explicit provenance and no employer-name inference;
- the narrow Option B representation recommendation;
- no change to Sarah v1 or any frozen result; and
- continued pause of Track C and Phase B2 until the correction implementation passes its own gate.

The contract approval and subsequent implementation approval were both received. The implemented
outcome is recorded below; Track C and Phase B2 did not begin.

## 21. Implementation record

The narrow Option B implementation uses the existing OniBank employer, provision and membership
system. Sarah's existing Auth identity now owns one active employer-provisioned OniBank membership,
backed by the claimed canonical provision for `sarah.wonk@onibank.test`. Her personal Login remains
`sarah@example.test`; no second Auth identity or work-email Login was created.

Two append-only employer offering records represent the additional pension match and season-ticket
loan. Two separate owner-scoped Sarah state records retain unknown eligibility, inactive uptake,
incomplete information and exclusion from the financial baseline. Forced RLS and read-only ordinary
grants restrict offerings to active members of the same employer and state to its owner.

Home, Benefits and the Sarah story now consume the request-scoped authoritative projection. Sarah's
active 3%/3% pension still comes only from `sarah-v1@2026-09-01`; the opportunity records contain no
active contribution percentages or monetary effects. No context version, current pointer, run,
scenario, rules version or calendar version changed. Numerical benefit requests remain unsupported.

The implementation evidence is recorded in
`sarah-employer-and-benefits-correction-evidence-report.md`.
