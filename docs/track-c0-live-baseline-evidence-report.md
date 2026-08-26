# Track C0 Live Baseline Evidence Report

## Outcome

```text
LIVE_PROVIDER ACCEPTANCE — BLOCKED
```

The local ignored environment contains a configured OpenAI key, but `OPENAI_PROVIDER_ENABLED` is not true and `OPENAI_MODEL` is not configured. Those missing values mean the human-owned project/service-account authorisation and model selection have not been asserted. No OpenAI request was made, no model-access probe was attempted, and the key was not printed or exposed.

Track C1 has not started. Track B Phase B2 remains paused.

## Recovery point

- Corrected Sarah employer/Benefits tag: `mvp-rc-sarah-employer-benefits-2026-08-25`
- Tag dereference: `ef40a0e`
- Pre-correction B1 tag: `mvp-rc-sarah-story-b1-2026-08-25` → `a554000`
- Track A tag: `mvp-rc-employer-registration-2026-08-25` → `ba5a83c`

## Baseline freeze

- Interpretation prompt: `fy-conversation-interpretation/1.0.0`
- Interpretation schema: `fy-conversation-intent/1.0.0`
- Explanation prompt: `fy-conversation-explanation/1.0.0`
- Explanation schema: `fy-explanation-plan/1.0.0`
- Orchestration: `fy-conversation-orchestration/1.0.0`
- Corpus: `fy-conversation-evaluation/1.0.0`
- Reasoning: provider default/omitted
- Timeout: 12,000 ms
- Application retries: one
- Maximum output: 1,200 tokens

No prompt, schema, intent, clarification rule, financial rule, server template, result card, failure copy, or Ask visual was changed.

## Credential readiness

The safe command reported:

```text
Key configured: yes
Provider enabled: no
Selected model: not configured
Provider reachable: no
Model accessible: no
```

“Provider reachable: no” means no call was authorised or attempted; it is not evidence that OpenAI was unavailable.

## Credential-safety evidence

- `.env.local` is ignored.
- The configured key is absent from every tracked file.
- The OpenAI adapter remains server-only.
- No OpenAI value uses a `NEXT_PUBLIC_*` name.
- Client chunks contain no provider adapter or server financial implementation.
- Readiness never prints the key, prefix/suffix, environment file, header, request body, or raw provider error.
- An audit found the key in ignored Turbopack cache files after a direct build. The exact generated `.next` directory was removed.
- `npm run build` now withholds the runtime key from the build process. A clean rebuild and byte comparison confirm the configured key is absent from generated artifacts and `.next/static`.

This build-cache issue was classified as a credential/configuration defect and fixed without changing user-facing behaviour.

## Implementation

- Added explicit server-only OpenAI runtime configuration and approved candidate IDs.
- Added explicit provider enablement, selected model, reasoning, timeout, and retry configuration.
- Preserved the existing default reasoning omission, 12-second timeout, and one-retry baseline.
- Added provider telemetry for latency and token usage, including failed strict-output attempts where usage is returned.
- Added the five-field safe readiness command.
- Added a secret-boundary scan for tracked, generated, and client files.
- Added a production-build wrapper that excludes the runtime key from Turbopack compilation.
- Extended the repository evaluation harness to fake/OpenAI candidates, three-or-more repetitions, per-case sanitised records, explanation probes, per-category results, safety results, latency, token use, and current official price estimates.
- Generated `artifacts/track-c0-evaluation/fake-baseline.json` from synthetic cases only.
- Added regression tests for configuration bounds, explicit enablement, safe readiness source, build isolation, telemetry, reasoning configuration, and retry limits.

## Synthetic baseline result

The repeated fake-provider harness passed 105/105 evaluations:

| Category | Passed | Failed |
| --- | ---: | ---: |
| Canonical | 3 | 0 |
| Natural variants | 9 | 0 |
| Noisy variants | 9 | 0 |
| Clarification | 18 | 0 |
| Follow-up | 12 | 0 |
| Unsupported | 24 | 0 |
| Adversarial | 24 | 0 |
| Explanation plans | 6 | 0 |

All 105 passed their first strict-schema attempt. There were zero retries. Fake-provider token, cost, and network latency values are intentionally non-live and must not be used for a model decision.

The harness identified two gaps in the frozen live corpus: dedicated credit-funding and goal-savings-funding cases. Existing application/prompt boundaries reject them, but live candidate approval must not claim those cases were measured until an approved corpus revision adds them.

## Live candidate results

| Candidate | Repetitions | Result | Latency | Tokens | Cost |
| --- | ---: | --- | --- | --- | --- |
| `gpt-5.6-terra` | 0 | Blocked—not authorised/configured | N/A | N/A | N/A |
| `gpt-5.6-luna` | 0 | Blocked—not authorised/configured | N/A | N/A | N/A |
| `gpt-5.6-sol` | 0 | Not run; diagnostic only | N/A | N/A | N/A |

There is no model recommendation. Configuring a key alone is not a pass, and no anecdotal preference substitutes for the repeated evaluation.

## AI and financial authority

Static and fake-provider evidence confirms one forced strict function, `additionalProperties: false`, all properties required/nullable, `parallel_tool_calls: false`, no built-ins, `store: false`, no provider Conversation, no `previous_response_id`, bounded output/time/retries, and runtime validation.

Interpretation outbound shape contains only the synthetic message, structured clarification state, labels/type, trusted date, and timezone. Explanation requests contain symbolic IDs. Balances, income, goals, workplace and benefit records, contexts, ledgers, auth data, and real-user history are absent.

The model cannot create a financial result. Amounts remain source-grounded, dates server-resolved, simulations deterministic, runs immutable, and final financial facts server-rendered. Sarah’s corrected employer/Benefits data is not sent to or alterable by the model.

## Ask audit — offline frozen experience

The existing synthetic/fake Ask journey and accepted mobile/tablet/desktop captures were reviewed. This is not represented as a live-model human review.

Strengths:

- The initial screen leads with a decision question rather than a balance.
- Suggested prompts remain inside the supported scope.
- Clarification is visually distinct and asks one missing field.
- Unsupported instalments return scope guidance with no result card.
- Provider failure clearly says the plan was not changed and offers retry only when allowed.
- Result cards clearly separate immediate buffer, bills, borrowing, recovery, goal impact, assumptions, and immutable run identity.
- Scenario selection is view-only and preserves all paths.
- History, refresh, stale-thread messaging, alerts, and polite loading announcements already have automated coverage.
- Fixed mobile navigation/composer has corresponding bottom content space, and accepted captures show no horizontal clipping.

Findings to validate live before changing anything:

1. The single loading sentence combines interpretation and deterministic calculation, so the two authority stages may not be obvious during real latency.
2. Result and explanation prose is deliberately template-owned; repeated amount alternatives may feel mechanical. A live human review is needed before choosing template refinement.
3. “Trusted fallback explanation used” is accurate but technical and may draw attention away from the result.
4. The composer is a single-line input. It safely bounds and wraps rendered long messages, but editing a long question and real mobile-keyboard/viewport behaviour need device review.
5. The UI explains how a result was calculated, but the distinction between “AI understood the question” and “the deterministic simulator calculated the answer” could be more explicit if user review shows confusion.

Recommended direction, pending live evidence: preserve the authority boundary; prefer richer symbolic template selection (Option B) over model-written financial prose; consider separate non-streaming interpretation/calculation statuses; review fallback wording and long-input ergonomics. No visual or copy change was made in Track C0.

## Provider-failure audit

Automated fake and adapter tests cover timeout, rate limit, provider unavailability, invalid schema, direct prose, unknown function, multiple calls, and explanation-plan failure. Failures are sanitised; interpretation failure invokes no simulator; explanation failure preserves the stored run/result and uses deterministic fallback.

Missing key and disabled-provider behaviour are proven locally. Invalid/wrong-project key, inaccessible/disabled model, billing failure, real rate limits, live network interruption, and rotation cannot be genuinely claimed without an authorised project and remain blocked live checks.

## Verification evidence

- Vitest: 30 files, 267 passed, 0 failed, 0 skipped.
- Conversation corpus: 33 cases plus corpus-permission assertion, 34 passed.
- Repeated fake harness: 99 interpretation + 6 explanation evaluations, 105 passed.
- Supabase integration: 6 files, 20 passed after canonical local reset.
- pgTAP: 6 files, 273 passed after canonical local reset.
- TypeScript: passed.
- ESLint application/tests: passed.
- Track C0 script ESLint and isolated TypeScript check: passed.
- Production build: passed through the runtime-secret isolation wrapper.
- Generated database artifacts: current.
- Client-bundle dependency boundary: passed.
- Secret-boundary scan: passed.
- Playwright mobile Chromium: 31 passed, 0 failed, 0 skipped.
- Coverage: 73.41% statements, 59.28% branches, 76.91% functions, 76.13% lines.
- `git diff --check`: passed.
- Skipped tests: 0 across every completed suite.

The initial integration attempt was blocked by sandbox access; the escalated local run then exposed fixture pollution from earlier tests. After proving the target was loopback-only, the approved local database reset applied all five committed migrations and canonical seed. pgTAP was run before mutation-producing integrations, and both suites passed without changing any expectation.

## Remaining risks and stop decision

- Human confirmation of project/service-account ownership and billing controls is still absent.
- Provider enablement and model selection are absent.
- No Terra/Luna access, quality, latency, token, cost, or live safety evidence exists.
- No live human conversation review or actual provider-backed Ask recording exists.
- Two frozen-corpus safety gaps require an approved future corpus version.
- Real mobile keyboard behaviour remains unreviewed.

Therefore Track C0 ends honestly as blocked, not passed or partially passed. Track C1 must not begin. Once the authorised owner sets the explicit enable flag and selected candidate model in the ignored server environment, rerun readiness, Terra three times per case, Luna three times per case, selected Sol diagnostics only if justified, then update this report from real sanitised metrics and human review.
