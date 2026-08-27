# Track C1H — Local Evidence Report

## Final status

```text
TRACK C1H — LOCALLY COMPLETE
LIVE PROVIDER — NOT AUTHORISED / NOT RUN
TRACK C2 — PAUSED
PHASE B2 — PAUSED
```

## Implementation

The completed C1G state was tagged before production changes at
`track-c1g-scenario-reference-diagnostic-complete-2026-08-26` (`b96ffa2c0360d636ef11c166cc268affc61ae87f`).

The implementation adds:

- prompt/schema/runtime v4 versioning while retaining v1–v3 history
- explicit exact-clarification precedence and contrastive examples
- bounded server-owned amount, month, explanation and current-path evidence
- semantic rejection of generic ambiguity when scenario reference is provably the sole gap
- safe diagnostic codes and one bounded repair rule
- provider-visible family-only evidence projection
- exact `amountMinorUnits` pending-state preservation
- pending amount/month/explanation resolution through existing same-conversation operations
- `fy-scenario-reference-corpus/1.0.0`
- deterministic scenario-reference fake modes
- evaluation-runner support for the server-owned evidence boundary

No migration, UI, simulator, financial fixture, explanation-plan or RLS change was made.

## Behavioral proof

- `What about £500?` with no selected/explicit scenario produces
  `CLARIFY_SCENARIO_REFERENCE / CHANGE_PURCHASE_AMOUNT`.
- Pending state retains `50000` GBP minor units and the original message ID.
- No simulator or amount-alternative operation runs before a scenario is resolved.
- Resolving `£650 trip` invokes the existing amount alternative once and returns the frozen £500 sibling.
- Exact turn retry returns the stored turn without another provider, message or run.
- The same pattern is proven for October timing and goal-delay explanation.
- Explanation resolution reads the existing immutable run and invokes no purchase simulation.
- One unselected scenario is not chosen implicitly; it still asks which purchase.
- Multiple unselected scenarios, nonexistent labels and no-scenario state remain non-authoritative.
- Current-path selection remains `SELECT_EXISTING_SCENARIO`.
- Truly unclear language remains valid `AMBIGUOUS`.
- Unsupported and cross-user wording invokes no exact-gap override.
- Stale context blocks a scenario-producing follow-up before pending state or simulation is created.

## AI and repair boundary proof

- Provider function: `submit_conversation_interpretation_v4`.
- Responses calls retain one forced strict function, `strict: true`, `parallel_tool_calls: false`, no built-in
  tools and `store: false`.
- The strict v4 provider shape equals the v3 structural shape; runtime semantics provide state-specific
  precedence.
- Generic ambiguity in the exact-gap state fails at `BRANCH_SEMANTIC_VALIDATION` with
  `SCENARIO_REFERENCE_CLARIFICATION_REQUIRED` and `/interpretation/kind`.
- Lost/changed structured follow-up evidence fails with `FOLLOW_UP_EVIDENCE_MISMATCH` and
  `/interpretation/attemptedOperation`.
- One repair can produce the exact clarification. Repeated or differently invalid repairs fail closed.
- Initial and repair provider inputs include only the closed evidence family; exact parsed pence is absent.
- Diagnostics contain no message, amount, timing quote, label, raw provider output, financial context,
  prompt or reasoning.
- No live OpenAI request was made and estimated live spend is US$0.

## Verification evidence

| Gate | Discovered | Passed | Failed | Skipped | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Full Vitest | 478 tests / 37 files | 478 | 0 | 0 | PASS |
| Focused evaluation contract | 142 tests / 4 files | 142 | 0 | 0 | PASS |
| Repeated fake evaluation | 150 evaluations | 150 | 0 | 0 | PASS |
| Supabase integration, clean state | 20 tests / 6 files | 20 | 0 | 0 | PASS |
| PostgreSQL/pgTAP, clean state | 273 tests / 6 files | 273 | 0 | 0 | PASS |
| Mobile Chromium Playwright | 31 tests | 31 | 0 | 0 | PASS |

Additional gates:

- TypeScript: pass
- ESLint: pass
- production build: pass, 22 generated pages/routes
- generated Supabase seed/types drift: pass
- client-bundle/server dependency boundary: pass
- secret boundary: pass for tracked files, repository files, generated artifacts and client bundle
- visual regression: pass; no baseline update retained
- `git diff --check`: pass

Coverage from the authoritative 478-test run:

```text
Statements  78.74% (2900/3683)
Branches    67.31% (2055/3053)
Functions   81.20% (579/713)
Lines       81.22% (2657/3271)
```

## Environment and clean-state notes

The first integration attempt was blocked by sandbox denial of local loopback and the Docker socket. The
authorised rerun reached only the verified Future You local instance at `127.0.0.1:54321` and PostgreSQL
`127.0.0.1:54322`.

That rerun exposed test-generated state from prior suites. The verified local-only reset command was
`supabase db reset --local` through `npm run db:reset`; it reapplied all five committed migrations and the
generated canonical seed with no dashboard or manual SQL step. Clean-state integration then passed 20/20.

Running pgTAP immediately after integration reproduced expected fixture-count pollution because integration
mutates the local test database. A second verified local-only reset gave the authoritative pgTAP result of
273/273. No expected financial result, ownership rule, RLS policy, immutability assertion or fixture value
was weakened.

## Files changed

Application/provider implementation:

- `src/application/conversation/application.ts`
- `src/application/conversation/contracts.ts`
- `src/application/conversation/follow-up-evidence.ts`
- `src/application/conversation/prompts.ts`
- `src/application/conversation/schemas.ts`
- `src/infrastructure/ai/fake-conversation-model-provider.ts`
- `src/infrastructure/ai/openai/interpretation-diagnostics.ts`
- `src/infrastructure/ai/openai/openai-responses-conversation-provider.ts`
- `src/infrastructure/ai/openai/provider-json-schemas.ts`
- `scripts/run-live-conversation-evaluation.ts`
- `package.json`

Tests and corpus:

- `tests/scenario-reference-clarification-correction.test.ts`
- `tests/fixtures/scenario-reference-evaluation-corpus-v1.ts`
- existing interpretation, timing, provider, orchestration and C1G regression tests updated for active v4

Documentation:

- `docs/track-c1h-scenario-reference-clarification-correction.md`
- `docs/track-c1h-local-evidence-report.md`
- append-only `docs/future-you-evolution-details.md`

## Remaining risks and next recommendation

The bounded grammar intentionally refuses to infer arbitrary phrasing. The static provider schema still
contains both exact clarification and genuine ambiguity branches, so server semantic validation remains a
required defense. Live Terra behavior under prompt v4 has not been tested.

Recommendation: C1H may proceed only to the separately approved one-case Terra validation described in the
contract. Do not begin Track C2 or Phase B2 automatically.
