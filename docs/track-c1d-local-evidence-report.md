# Track C1D Local Evidence Report

Date: 26 August 2026  
Final status: **C1D LOCAL TIMING-CONTRACT DIAGNOSTIC — COMPLETE**  
Production correction: **NOT IMPLEMENTED**  
Live OpenAI requests: **0**  
Live provider cost: **US$0**  
Track C2: **PAUSED**  
Track B Phase B2: **PAUSED**

## 1. Scope and outcome

C1D traced and tested the existing timing contract without changing the interpretation prompt, provider
schema, runtime semantic behavior, resolver, repair behavior, corpus expectations, simulator or UI.

The exact mismatch is now established:

```text
Provider strict schema:
  five required properties + broad string/enum/(integer|null) types

Runtime semantic contract:
  kind-specific null/value combinations

Canonical required object:
  quote="next month"
  kind=NEXT_MONTH
  monthNumber=null
  year=null
  offsetMonths=1

Server-resolved period from trusted 2026-08-24:
  2026-09
```

The live provider output remains unknown. C1D neither reconstructs nor claims its values.

## 2. Files changed

Added:

- `tests/helpers/timing-contract-diagnostics.ts`
- `tests/timing-contract-diagnostic.test.ts`
- `docs/track-c1d-timing-contract-diagnostic-review.md`
- `docs/track-c1d-local-evidence-report.md`

Updated append-only:

- `docs/future-you-evolution-details.md`

No source application/provider file, migration, seed, generated database type, visual baseline or artifact was
changed.

## 3. Preservation evidence

| Item | Evidence |
| --- | --- |
| C1C recovery tag | `track-c1c-sanitised-diagnostics-ready-2026-08-26` |
| Recovery commit | `f6d215ae032c1068fe89511571b4480654d2b981` |
| Live evidence commit | `2e292cac134fd6bc598852cc5ddfae0d48d3a57f` |
| Terra artifact SHA-256 | `bbb8c83a0a446046bc3e3b294e400a771ba18e21f8ed4a2f7c32ff9442711cab` |
| Live report SHA-256 | `67bd1c23560eb9084bd3ca1ba5b9f205a26b7f683876e64288d3e512aa426c2d` |

Both preserved files have zero working-tree diff.

## 4. Diagnostic implementation

The test-only utility:

- extracts the real nested create timing schema from `INTERPRETATION_PARAMETERS_V2`;
- evaluates the JSON-Schema constructs used by that timing object;
- enumerates all 32 provider nullability patterns;
- samples lower, boundary, ordinary valid and upper range equivalence classes;
- invokes the real v2 envelope/Zod parser;
- invokes the real sanitised diagnostic mapper;
- invokes the real source-grounding function;
- invokes the real trusted period resolver;
- records only synthetic values and closed application/diagnostic outcomes; and
- imports no simulator and can create no run.

The provider literal space is infinite because strings and integers have no provider-schema bound. The test
therefore combines complete predicate analysis with 3,024 equivalence representatives rather than claiming a
finite list is every possible string and integer.

## 5. Enumeration evidence

| Result | Count |
| --- | ---: |
| Synthetic provider-valid representatives | 3,024 |
| Provider-valid representatives accepted by runtime | 32 |
| Reported strict-schema failures | 73 |
| Reported branch-semantic failures | 2,919 |
| Runtime-valid but source-ungrounded | 16 |
| Grounded but resolver/state rejected | 3 |
| Eligible initial-create representatives | 13 |
| Eligible with canonical meaning | 1 |
| Eligible with quote/kind meaning mismatch | 12 |
| Diagnostic authorised but application resolver rejected | 3 |

Every application-eligible representative passed runtime validation, source grounding and resolver state.
Only the exact canonical timing object also passed the test-only canonical meaning check.

## 6. Required reproductions

Local deterministic tests cover:

- missing timing quote;
- null offset;
- incompatible explicit month;
- incompatible year;
- correct quote with wrong timing kind;
- correct kind with non-grounded quote;
- provider-valid but semantically incomplete timing;
- correct complete semantic timing;
- identical invalid repair;
- different invalid repair; and
- valid repair.

Invalid cases never become simulator-eligible. The one wrong-kind case is intentionally frozen as an existing
validator defect: it currently becomes eligible because quote provenance is checked but quote meaning is not.
No actual simulator is present in the diagnostic harness.

## 7. Repair evidence

For the same local semantic failure class observed live, the repair receives only:

```text
Path: /interpretation/timing
Code: SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION
```

Tests prove the validation-error portion does not identify `offsetMonths`, `monthNumber`, `year`, `quote`,
or `NEXT_MONTH`. The transient invalid object is sent back under existing data-minimisation rules, but the
same schema and prompt do not state the missing cross-field invariant.

Repair behavior remains unchanged:

| Case | Calls | Result | Simulator |
| --- | ---: | --- | ---: |
| Same invalid semantic shape twice | 2 | `IDENTICAL_FAILURE` | 0 |
| Different invalid timing signature | 2 | `NEW_FAILURE` | 0 |
| Invalid then canonical valid timing | 2 | `SUCCEEDED` | 0 |

## 8. Clarification and corpus evidence

- Initial purchase, timing follow-up, nested pending operation and month clarification all use the same
  complete runtime timing schema.
- Their provider contracts share the same weaker generic timing schema.
- Frozen C0 expectations remain unchanged.
- Expanded v2 timing-bearing cases produce the expected `NEXT_MONTH`, `NAMED_MONTH` and
  `MONTHS_AFTER_SELECTED` shapes through the deterministic fake.
- Missing and ambiguous month cases still clarify.
- Current-path selection has no timing object.
- Intra-month payday wording remains unsupported.
- Explicit `YYYY-MM` has schema/fake/unit coverage but no expanded corpus case; this is documented, not fixed.

## 9. Contract and version stability

Unchanged:

```text
fy-conversation-interpretation/2.0.0
fy-conversation-intent/2.0.0
fy-clarification-resolution-prompt/1.0.0
fy-clarification-resolution-schema/1.0.0
fy-interpretation-diagnostic/1.0.0
```

No prompt, provider schema, runtime rule, resolver rule, diagnostic code, repair input, intent, clarification
rule or evaluation expectation changed.

## 10. Verification evidence

All authoritative commands ran with `OPENAI_API_KEY` removed from the process,
`OPENAI_PROVIDER_ENABLED=false`, and `OPENAI_MODEL` unset where configuration was relevant.

| Gate | Discovered | Passed | Failed | Skipped | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Focused timing/provider/diagnostic/corpus tests | 161 | 161 | 0 | 0 | Pass |
| Full Vitest regression | 397 | 397 | 0 | 0 | Pass |
| Repeated fake interpretation/clarification | 144 | 144 | 0 | 0 | Pass |
| Repeated fake explanation | 6 | 6 | 0 | 0 | Pass |
| Supabase integration, clean state | 20 | 20 | 0 | 0 | Pass |
| PostgreSQL/pgTAP, clean state | 273 | 273 | 0 | 0 | Pass |
| Mobile Chromium Playwright | 31 | 31 | 0 | 0 | Pass |

Coverage from the 397-test run:

| Metric | Coverage | Covered/total |
| --- | ---: | ---: |
| Statements | 76.75% | 2,543/3,313 |
| Branches | 64.18% | 1,704/2,655 |
| Functions | 79.79% | 537/673 |
| Lines | 79.27% | 2,337/2,948 |

Additional gates:

- TypeScript: pass, zero errors on the authoritative serial rerun.
- ESLint: pass, zero errors.
- Keyless production build: pass twice; 22/22 static-generation steps completed each time.
- Generated Supabase seed and database types: current.
- Client bundle: no server-only simulator/store identifiers.
- Secret boundary: ignored secret file confirmed; no configured key in tracked files, repository files,
  generated artifacts or client chunks.
- Disabled readiness: key not configured, provider disabled, model not configured, provider unreachable and
  model inaccessible; no provider request occurred.
- Preserved C1C artifact/report hashes: unchanged.
- Visual baselines: the browser suite regenerated evidence PNGs; every verification-only binary rewrite was
  restored because C1D has no visual change.
- `git diff --check`: pass after the documentation/history append.

### Environment notes

The first pgTAP run reached the proven local database at `127.0.0.1:54322` and exposed accumulated test
state: 248/273 assertions passed and 25 fixture-count/current-pointer assertions failed. The output named
prior generated conversation, Slice 6 context, run, membership and onboarding records. No C1D timing test
was involved.

Before reset, the repository proved:

- project ID `future-you`;
- local API port `54321`;
- local database port `54322`;
- no linked project-ref file;
- no configured Supabase/database URL; and
- the reset script expands to seed generation plus `supabase db reset --local`.

The approved local reset reapplied all five committed migrations and the generated seed. The clean pgTAP
rerun passed 273/273. Playwright then passed 31/31 and intentionally created contexts for its onboarding and
historical-plan journeys. An integration run immediately afterward passed 18/20; its two failures were those
expected non-empty Alex/onboarding fixtures. A second verified local reset restored the canonical seed and
the clean integration rerun passed 20/20.

No hosted/shared database, dashboard, manual SQL, expectation change or RLS relaxation was used. These were
test-order/fixture-lifecycle effects, not implementation defects.

## 11. No-live/provider containment

C1D uses only deterministic test doubles and local functions. It makes no Responses API request and incurs
no provider cost. Provider configuration remains disabled and no model is selected. No live artifact or
runtime secret is created.

## 12. Recommendation and stop decision

The recommended next step is a separately approved local **Track C1E — Timing Contract Alignment** using
the narrow combined correction described in the diagnostic review. It should align provider/runtime shapes,
add deterministic quote/kind compatibility, make repair diagnostics precise and version each changed
contract. It must stop before live evaluation.

After that local slice passes, the proposed live gate remains exactly one canonical Terra case, low reasoning,
one initial request plus at most one existing repair and a maximum estimated spend of **US$0.10**.

Track C2 and Phase B2 remain paused.
