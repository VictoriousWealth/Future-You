# Track C1A Local Evidence Report

Date: 26 August 2026  
Final local status: **C1A LOCALLY READY FOR SEPARATELY AUTHORISED C1B**  
Live-provider status: **NOT RUN — C1B NOT AUTHORISED**

## Implementation

The active interpretation boundary now uses prompt/schema v2 with a strict root object and branch-specific nested alternatives. An application-owned policy module supplies exact intent, clarification, unsupported, explanation-target and scenario-reference identifiers to prompts, schemas, runtime mappings and tests.

Pending clarifications use separate amount, month and scenario-resolution contracts. Application orchestration combines only the resolved field with the already stored pending operation. Exact amount, timing and scenario-label grounding remains server enforced. Unsupported and ambiguous clarification responses invoke no simulator.

The OpenAI adapter uses one bounded semantic repair containing minimal state, invalid structured output, sanitised validation codes and permitted identifiers. A repaired or unrepaired output still passes runtime validation and application authority checks. The Responses API, forced function, `strict: true`, `parallel_tool_calls: false`, no built-in tools and `store: false` policies remain intact.

No UI, server-rendered financial copy, explanation prompt/schema, simulator, scenario, Sarah fixture/result, financial context, database migration, persistence schema, RLS policy, grant or product capability changed.

## Files changed

Application/provider implementation:

- `src/application/conversation/application.ts`
- `src/application/conversation/contracts.ts`
- `src/application/conversation/interpretation-policy.ts`
- `src/application/conversation/prompts.ts`
- `src/application/conversation/schemas.ts`
- `src/infrastructure/ai/fake-conversation-model-provider.ts`
- `src/infrastructure/ai/provider-configuration.ts`
- `src/infrastructure/ai/openai/openai-responses-conversation-provider.ts`
- `src/infrastructure/ai/openai/provider-json-schemas.ts`
- `scripts/run-live-conversation-evaluation.ts`
- `package.json`

Tests/fixtures:

- `tests/conversation-evaluation-corpus.test.ts`
- `tests/conversation-evaluation-corpus-v2.test.ts`
- `tests/conversation-orchestration.test.ts`
- `tests/fake-conversation-provider.test.ts`
- `tests/interpretation-contract-v2.test.ts`
- `tests/openai-conversation-provider.test.ts`
- `tests/fixtures/conversation-evaluation-corpus-v2.ts`
- `tests/helpers/conversation.ts`
- `tests/integration/supabase-conversations.integration.ts`

Documentation:

- `docs/track-c1-interpretation-contract-repair.md`
- `docs/track-c1a-local-evidence-report.md`
- `docs/future-you-evolution-details.md`

No migration, seed schema or generated database type was changed. The seed file was regenerated during the approved local reset and remained byte-current.

## Recovery and historical preservation

- New annotated recovery tag: `track-c0-terra-failed-baseline-2026-08-26`
- Tag purpose: preserve the original frozen interpretation contract and failed Terra evidence before C1 changes.
- The tag dereferences to the clean C0 commit `61c22df`.
- Earlier MVP, Track A, Track B1 and Sarah-correction recovery points remain intact.
- The C0 smoke/baseline artifacts and evidence report have no diff.
- V1 identifiers, runtime schema, provider schema and 33-case interpretation fixture remain available.
- The 33 interpretation cases plus two explanation probes remain the frozen 35-case C0 comparison set.

## Contract proof

- Provider root is `type: object`, has no root `anyOf`, rejects additional properties and requires `interpretation`.
- Twelve alternatives are nested under `interpretation`.
- Every nested object sets `additionalProperties: false` and requires every declared property.
- Minimum valid values for all 12 branches pass.
- Missing required fields, extras, wrong branch-only fields, invalid identifiers and illegal strategy/quote combinations fail.
- All 17 unsupported identifiers occur in the policy, prompt, strict schema, renderer mapping and expanded evaluation coverage.
- All three clarification identifiers have server-owned templates.
- V2 turns persist `fy-conversation-interpretation/2.0.0` and `fy-conversation-intent/2.0.0`.
- Pending clarification turns persist `fy-clarification-resolution-prompt/1.0.0` and `fy-clarification-resolution-schema/1.0.0`.
- Explanation remains v1.

## Behavioural and authority proof

- Canonical £650 still produces the frozen result immediately.
- £500, £400 and October siblings remain unchanged.
- Missing amount/month use exact clarification branches and existing server wording.
- Pending amount/month/scenario answers go through narrow contracts.
- Scenario clarification preserves the attempted amount/month/explanation operation.
- Repeated ambiguity and unsupported clarification answers create no simulation.
- Every expanded unsupported/adversarial application case invokes no simulator.
- Schema-valid but ungrounded amount, timing and scenario-label quotes fail before simulation.
- Scenario IDs, user IDs and financial facts are never accepted from the provider.
- Exact retry still creates no duplicate message, provider call or run; conflicting reuse still returns 409.
- Explanation planning and server financial wording are unchanged.

## Evaluation results

Frozen C0 fixture integrity:

- 33/33 original interpretation cases present
- Two unchanged explanation probes retained in the harness
- C0 artifact/evidence changes: 0

Expanded v2 corpus:

- 48 interpretation/clarification cases
- 33 frozen C0 messages represented directly
- 15 approved expansion cases
- Exact unsupported categories covered: 17/17
- Corpus/integrity tests: 83/83 passed across two files

Repeated fake harness (`3` repetitions):

- Interpretation/clarification evaluations: 144/144 passed
- Explanation evaluations: 6/6 passed
- Total: 150/150 passed
- First-attempt strict/runtime validity: 150/150
- Repairs: 0 for deterministic fake baseline
- Canonical, grounding, relative-date, instalment, overdraft, benefit/pension, commitment, prompt-injection, goal-savings and credit safety gates: passed

Adapter tests separately prove repair success, repair failure, direct-text rejection, invalid nested output, unknown tool, multiple tool calls, zero-retry configuration and narrow clarification schemas.

- Fake-provider mode tests: 8/8 passed.
- OpenAI adapter tests: 7/7 passed.
- V2 schema/policy/version tests: 19/19 passed.

## Full regression evidence

- Vitest: 32 files discovered; 32 passed; 345 tests passed; 0 failed; 0 skipped.
- Coverage: 74.61% statements, 60.43% branches, 78.35% functions, 77.00% lines.
- Supabase integration: 6 files; 20 passed; 0 failed; 0 skipped.
- PostgreSQL/pgTAP: 6 files; 273 passed; 0 failed.
- Playwright mobile Chromium: 31 passed; 0 failed; 0 skipped.
- TypeScript: passed.
- ESLint: passed.
- Production build: passed.
- Generated Supabase seed/types drift: passed.
- Client-bundle dependency boundary: passed.
- OpenAI secret boundary after build/browser run: passed.
- `git diff --check`: passed.

The first pgTAP attempt connected to the proven local database at `127.0.0.1:54322` and exposed pre-existing test pollution: 25 of 273 assertions failed due to accumulated conversation/context/run/membership records. It was classified as an environment/fixture-state defect. After the explicitly approved local-only reset, all five committed migrations applied, canonical seeds loaded, pgTAP passed 273/273, and integration passed 20/20. A second local-only reset was required because integration intentionally mutates the onboarding fixture before Playwright; Playwright then passed 31/31. No dashboard/manual SQL step or expectation change was used.

## Secret and provider proof

- Disabled readiness: key configured `yes`; provider enabled `no`; selected model `not configured`; provider reachable `no`; model accessible `no`.
- Live OpenAI requests during C1A: **0**.
- Provider remained disabled and model unset.
- Configured key in tracked files: no.
- Configured key in non-ignored repository files: no.
- Configured key in generated artifacts after cleanup/rebuild: no.
- Configured key in client bundle: no.

A long-running pre-C1 local Next development server had recreated an ignored `.next` cache containing the configured key’s bytes. The boundary gate detected it before completion. The local dev process was stopped; only the ignored, reproducible `.next` directory was removed; a runtime-secret-isolated production build recreated it; the secret scan then passed before and after Playwright. Source and user data were not removed. Restarting plain `next dev` while a runtime key is present can recreate this ignored-cache risk and remains an operational limitation.

## Scope and regression integrity

- Sarah’s context, goal facts and all frozen outcomes are unchanged.
- Simulator mathematics and supported scenario types are unchanged.
- No financial expectation was changed to fit implementation.
- RLS, grants, ownership, immutability and non-enumerability are unchanged and passed their existing gates.
- Explanation planning and Ask UI/copy are unchanged.
- C0 evidence remains `LIVE_PROVIDER ACCEPTANCE — FAILED`; no model is approved or recommended.
- No test is skipped.
- No undocumented manual database modification was required.

## Remaining risks

- No real model has yet passed the v2 contract; fake and adapter evidence do not imply live accuracy.
- The larger v2 prompt/schema may change latency, token use and repair frequency.
- The plain local Next development command can cache runtime environment bytes in ignored artifacts; keep provider disabled and run the secret boundary after local provider work.
- Track C2 UX/naturalness observations remain unresolved by design.

## Proposed C1B — separate approval required

Run Terra first at low reasoning: schema access, canonical smoke, repaired-category samples, the frozen comparison set three times and expanded v2 once. Stop and disable on any mandatory gate failure. Run Luna only if Terra passes every gate. Reserve Sol for justified diagnostics. Require 100% canonical, schema, grounding, unsupported/adversarial, clarification, canonical follow-up and current-path gates, with zero simulator/authority violations.

Recommended proposed cumulative spend guard: **US$5**. This is a planning estimate/cap, not an authorisation or invoice. C1B must not begin until the user separately approves live requests and budget.

## Stop decision

Track C1A is locally ready for separately authorised C1B. No live request was made. Track C1B is not approved, Track C2 is not started, and Phase B2 remains paused.
