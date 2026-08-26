# Authorised OpenAI and Ask Refinement — Track C

## Status and phase boundary

Track C0 is an evaluation and audit phase. It may add only server-side provider configuration, credential-readiness checks, evaluation instrumentation, sanitised evidence collection, and defects that prevent a faithful evaluation of the approved conversation contract.

Track C0 does not change prompts, schemas, supported intents, clarification behaviour, financial rules, server-rendered financial wording, or Ask visuals. Track C1 requires a separate approval. Track B Phase B2 remains paused.

The corrected Sarah employer/Benefits state is preserved at annotated tag `mvp-rc-sarah-employer-benefits-2026-08-25`, dereferencing to commit `ef40a0e`. The Track A and pre-correction B1 recovery points remain intact.

## Human-owned credential and authorisation model

The authorised account owner creates and manages a dedicated OpenAI Platform project and project-scoped service account. Suggested names are `future-you-live-evaluation` and `future-you-live-evaluator`. The owner controls model permissions, Responses API access, project rate limits, spend limits, alerts, rotation, and revocation.

The key must be a project service-account key, not a shared personal key. It is considered authorised only when its owner confirms that it belongs to the Future You evaluation project, explicitly authorises this evaluation, understands billing, intentionally grants the candidate-model access, and stores it in the approved ignored server environment.

The secret is named `OPENAI_API_KEY`. It must never be pasted into chat, committed, documented, printed, logged, returned in an error, exposed through `NEXT_PUBLIC_*`, or sent to the browser.

The operational enable switch is a separate human assertion:

```text
OPENAI_PROVIDER_ENABLED=true
```

A configured key without that switch is not authorised for a request. A working random key is not accepted as evidence of project ownership.

## Server-only configuration

The supported runtime settings are:

```text
OPENAI_PROVIDER_ENABLED=false
OPENAI_MODEL=gpt-5.6-terra
OPENAI_REASONING_EFFORT=provider_default
OPENAI_TIMEOUT_MS=12000
OPENAI_MAX_RETRIES=1
OPENAI_API_KEY=<ignored server secret>
```

`provider_default` deliberately omits the `reasoning` request property and preserves the pre-Track-C adapter behaviour. An explicit value may be `none`, `low`, `medium`, `high`, `xhigh`, or `max`. Timeout is bounded to 1–60 seconds and retries to 0–2. The frozen baseline is 12 seconds and one application retry. The OpenAI SDK performs no additional automatic retries.

The application still uses `CONVERSATION_PROVIDER=fake` for ordinary local and CI work. Selecting `CONVERSATION_PROVIDER=openai` also requires every OpenAI enablement field above; there is no silent model fallback.

## Build and secret boundary

Next.js loads `.env` files during compilation and Turbopack may place referenced values in ignored build caches even when they are server-only. `npm run build` therefore launches Next with `OPENAI_API_KEY` defined as empty for the build process. The key remains a runtime-only value and must be injected when starting the server, not during compilation.

Run:

```text
npm run openai:secret-boundary
```

The check compares the configured key in memory without printing it and reports only whether it occurs in tracked files, `.next` artifacts, or `.next/static` client output. It also verifies that `.env.local` is ignored.

Do not replace the safe build wrapper with a direct `next build` while a key is present in a loaded `.env` file.

## Safe readiness

Run:

```text
npm run openai:readiness
```

It prints exactly:

```text
Key configured: yes/no
Provider enabled: yes/no
Selected model: <model ID>
Provider reachable: yes/no
Model accessible: yes/no
```

No network request is made unless a key, explicit enablement, model, and valid bounded configuration are all present. When enabled, readiness makes one minimal synthetic Responses API call using `store: false`, one forced strict function, no built-in tools, no financial data, and no provider-side conversation. Errors are reduced to booleans; headers, body content, key fragments, and raw provider errors are never printed.

## Frozen baseline contracts

The live baseline retains these exact versions:

```text
Interpretation prompt: fy-conversation-interpretation/1.0.0
Interpretation schema: fy-conversation-intent/1.0.0
Explanation prompt: fy-conversation-explanation/1.0.0
Explanation schema: fy-explanation-plan/1.0.0
Conversation orchestration: fy-conversation-orchestration/1.0.0
Evaluation corpus: fy-conversation-evaluation/1.0.0
Timezone: Europe/London
Trusted corpus date: 2026-08-24
```

Track C0 freezes the existing 33-case interpretation corpus, the two symbolic explanation-plan probes, supported/unsupported intent union, clarification policy, amount grounding, server date resolution, server templates, retries, timeout, Ask result cards, and failure states.

## Candidate models

- `gpt-5.6-terra` — primary intelligence/cost candidate.
- `gpt-5.6-luna` — lower-cost challenger.
- `gpt-5.6-sol` — diagnostic quality ceiling for selected failures or a representative comparison only.

The repository cost estimate uses the official prices current at the baseline date: Terra $2 input/$12 output, Luna $0.20/$1.20, and Sol $4/$20 per million tokens. Pricing is evidence metadata and must be reconfirmed before a later production decision.

No model is selected for release until the live comparison passes every mandatory safety gate. Sol is not run across the full repeated corpus without separate evidence justifying that cost.

## Provider authority and request policy

The provider may return only a typed interpretation or symbolic explanation plan. It cannot calculate or alter money, balances, dates, goal delays, recovery, bills, borrowing, classifications, scenarios, employer state, Benefits state, stored runs, or recommendations.

Every provider request uses:

- Responses API
- `store: false`
- one forced named function
- `strict: true`
- `additionalProperties: false`
- every property required, with nullable optional values
- `parallel_tool_calls: false`
- no built-in tools
- no web, file, code, computer, MCP, or external action
- no provider Conversation object
- no authoritative `previous_response_id`
- bounded output tokens, timeout, and retries
- application-owned conversation state
- runtime validation after the response

Direct prose, zero or multiple calls, unknown functions, invalid JSON, schema-invalid arguments, unavailable fact keys, and unavailable templates are rejected. The deterministic simulator and server renderer remain authoritative.

`store: false` disables retrieval-oriented response storage. It is not documented as a promise of zero provider retention; applicable OpenAI data-control and abuse-monitoring policies still need to be reviewed for the authorised project.

## Data minimisation

Track C0 permits only synthetic Sarah demonstration data, synthetic messages, the frozen corpus, and approved adversarial cases.

Interpretation receives a synthetic message, structured pending clarification, user-facing scenario labels and symbolic type, trusted date, and timezone. Explanation planning receives only symbolic target, fact IDs, template IDs, and action IDs. It excludes full financial context, balances, income, goals, employer/provision/membership records, benefit records, simulation ledgers, authentication data, registration data, and human-context profile information.

The evaluation report stores case IDs, expected/actual symbolic classifications, source-grounding and server-handoff outcomes, attempts, sanitised error category, latency, token counts, and estimated cost. It does not store hidden reasoning, raw provider responses, auth headers, or complete provider request bodies.

## Repository-owned evaluation harness

The deterministic repeated harness is separate from ordinary CI:

```text
npm run test:evaluation:harness -- --output=artifacts/track-c0-evaluation/fake-baseline.json
```

An authorised live model is selected only through the ignored server environment, then run with:

```text
npm run openai:readiness
npm run test:evaluation:live -- --output=artifacts/track-c0-evaluation/<approved-model>-baseline.json
```

The full corpus runs at least three repetitions. `--case=<case-id>` is available for a selected Sol diagnostic, but repetitions remain at least three. Terra and Luna must use identical prompt/schema versions, reasoning configuration, trusted date, labels, retry rules, timeout, and evaluation rules.

The harness records one sanitised record per case/repetition and two symbolic explanation cases per repetition. Normal CI continues using Vitest and the fake provider with no network or key.

## Approval gates

A model cannot be approved unless every repetition passes the canonical request, exact amount grounding, server-owned relative dates, unsupported payment/funding/benefit/pension/commitment boundaries, adversarial-result protection, strict function contract, and trusted-fact-only explanation planning.

The frozen corpus does not contain dedicated credit-funding or goal-savings-funding cases. The prompt and application already classify those treatments as unsupported, but those two missing live cases are an evaluation-corpus gap to resolve under an approved Track C1 contract. Adapter unit tests remain authoritative for direct prose, invalid schema, unknown function, and multiple-call rejection.

## Human review and Ask audit

Representative live review must cover the canonical path, £500/£400/October follow-ups, explanation, three clarification states, unsupported instalment/benefit/pension requests, noisy text, injection, provider retry, and explanation fallback. Reviewers score naturalness, clarity, warmth, brevity, repetition, helpfulness, necessary clarification, next-action clarity, non-judgment, and financial authority.

The Ask audit covers initial state, composer, status communication, clarification, result transition, cards, explanation, scenario switching, history/reload, retry, unsupported and stale states, keyboard behaviour, announcements, long messages, latency, template repetition, and the AI/deterministic distinction. Live screenshots use synthetic data only and contain no provider headers.

## Provider failures

Missing or disabled configuration makes no request. Invalid credentials, inaccessible models, billing, rate limit, timeout, malformed output, unknown/multiple calls, network interruption, service failure, and rotation are sanitised at the boundary. No failure can fabricate a financial result.

If interpretation fails, no simulator operation occurs. If explanation planning fails after simulation, the immutable run and result card remain and the approved deterministic fallback is rendered without creating another run.

## Proposed Track C1 boundary — not approved or implemented

Track C1 should not start until Terra and Luna have been run and reviewed. Its contract should contain only evidence-backed changes. Current candidates for review are:

1. Add the missing live safety corpus cases for credit and goal-savings funding.
2. If live wording is too repetitive, prefer richer symbolic choice among approved server templates (Option B) before considering constrained connective prose.
3. If latency makes the combined status unclear, separate server-owned “Understanding your question” and “Calculating the trusted result” states without streaming financial claims.
4. Review the technical fallback label, long-message editing, and real mobile-keyboard behaviour.
5. Preserve the existing provider authority, exact-money parser, date resolver, simulator, immutable run, and server renderer without expansion.

Free model-written financial explanations remain unapproved and are not recommended. Phase B2 remains paused.
