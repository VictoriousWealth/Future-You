# Slice 5 — constrained conversational orchestration and persistent Ask threads

**Status:** Frozen implementation contract  
**MVP timezone:** `Europe/London`  
**Interpretation prompt:** `fy-conversation-interpretation/1.0.0`  
**Interpretation schema:** `fy-conversation-intent/1.0.0`  
**Explanation prompt:** `fy-conversation-explanation/1.0.0`  
**Explanation schema:** `fy-explanation-plan/1.0.0`

> **Registration supersession:** The Signup reference inherited by this historical Slice 5 contract
> has been superseded by `employer-provisioned-registration-contract.md`. Conversation behaviour is
> unchanged; the new registration flow remains a separate future implementation concern.

This contract replaces the obsolete alternatives/navigation label for Slice 5. It is a scoped
supersession of earlier conversation and architecture rules: non-conflicting simulation, product,
security, UI-mapping and persistence rules remain active.

## 1. Outcome and authority

Slice 5 takes an authenticated user message through strict interpretation, server grounding, an existing
application/simulator operation, immutable run persistence, a bounded symbolic explanation plan and a
server-rendered response. The model is never a financial calculator or prose authority.

```text
Authenticated browser
  -> conversation API
  -> conversation orchestrator
  -> strict provider interpretation
  -> server grounding/validation
  -> existing deterministic use case
  -> immutable stored run
  -> symbolic explanation plan
  -> trusted server renderer
  -> browser DTO renderer
```

The browser cannot import simulator, provider, prompt, persistence, fixture, calendar or domain-mapper
modules. The simulator cannot import OpenAI, prompts, conversation persistence, Next.js, React, HTTP,
Supabase or provider SDK types.

## 2. Supported intent contract

The only supported interpretation kinds are:

- `CREATE_ONE_OFF_PURCHASE`
- `CHANGE_PURCHASE_AMOUNT`
- `CHANGE_PURCHASE_MONTH`
- `EXPLAIN_SELECTED_RESULT`
- `SELECT_EXISTING_SCENARIO`
- `HELP`
- `GREETING`
- `UNSUPPORTED`
- `AMBIGUOUS`

The first intent invokes only the existing one-payment, current-account-funded, additional-to-routine
spending operation. Amount/month follow-ups create or retrieve independent siblings from the same
baseline. Explanation reads an immutable stored run and performs no recalculation. Selection changes only
the thread's viewed run. Help and greeting remain narrow descriptions of supported behavior.

The canonical sequence is £650 next month, £500, £400, October, emergency-fund explanation and Current
path selection. Every frozen Sarah result remains unchanged.

## 3. Unsupported intent contract

The following produce a server-owned scope response, no simulator call and no complete/incomplete branch:

- instalments, split payments and mixed funding;
- credit or overdraft funding;
- goal-savings funding;
- spending substitution;
- before-payday/after-payday branching within one month;
- pension, benefit or season-ticket-loan simulation;
- save-first, recurring-expense, debt, investment or recommendation requests;
- scenario commitment, web search, files, voice and autonomous actions.

The older `S1-O1` season-ticket-loan branch does not exist in Slice 5. An informational opportunity may
remain visible elsewhere, but it supplies no scenario state or numerical effect.

## 4. Clarification policy

Clarification is deterministic and limited to:

1. missing purchase amount;
2. missing purchase month;
3. missing or ambiguous scenario reference.

The provider returns missing-field identifiers, never user-visible wording. The server selects one
question at a time from versioned templates. A pending clarification stores only the structured partial
state required to resolve that missing field. A response resolves the pending field where possible and
does not reinterpret the original message into another operation.

The canonical £650 next-month question never blocks. It receives the disclosed defaults: one payment,
current-account funding, additional spending and conservative month-only timing.

## 5. Source grounding and deterministic time

An amount interpretation carries the exact quote and `GBP`, `UNSUPPORTED` or null currency. The
application verifies the quote occurs in the current user message or in a specifically resolved existing
scenario. It extracts the exact numeric substring and passes it to the existing decimal-string GBP parser;
it never trusts a provider-normalised number or uses JavaScript `number` as money.

Supported forms include `£650`, `650`, `650.00` and `500 quid` when the numeric substring is exact and
source-grounded. Word-only amounts are ambiguous in Slice 5.

Timing interpretation preserves the user's quote and one semantic kind:

- `NEXT_MONTH`
- `MONTHS_AFTER_SELECTED`
- `NAMED_MONTH`
- `EXPLICIT_YEAR_MONTH`
- `MISSING`
- `AMBIGUOUS`

The server resolves the absolute `YearMonth` from an injected trusted timestamp, the thread-selected
scenario where applicable and `Europe/London`. The model does not calculate dates. Each turn stores the
trusted temporal reference and timezone. Ambiguous named months receive a clarification.

## 6. Strict interpretation and explanation schemas

Every provider result is parsed by Zod after receipt. Provider SDK types do not establish trust. Strict
function schemas use `additionalProperties: false`, list every property as required and encode optional
values as nullable. Direct text, unknown tools, multiple calls, missing calls and invalid arguments become
typed provider failures.

Interpretations contain only intent, exact source quotes, semantic timing, purpose/reference quotes,
missing fields, unsupported features and approved explanation-target identifiers. They contain no
financial outcome fields.

An explanation plan contains only:

- approved `templateId`;
- `primaryFactKey`;
- ordered available fact keys;
- approved caveat keys;
- approved follow-up action keys;
- `CLEAR`, `SUPPORTIVE` or `DIRECT` tone.

The model receives symbolic available-fact identifiers, not account balances, income, spending lists,
goal balances, employer data, ledger rows or exact result values. The server rejects unknown/unavailable
keys and renders final text using the immutable run DTO. The model cannot write final financial sentences,
amounts, dates, classifications, bill/borrowing status or recommendations.

## 7. Provider interface and OpenAI policy

Application code depends on a narrow `ConversationModelProvider` with `interpret` and `planExplanation`.
Implementations are a deterministic fake and a server-only OpenAI Responses adapter. OpenAI SDK types,
response IDs and errors remain in `infrastructure/ai/openai`.

Every OpenAI call must set or enforce:

- configurable model, initially `gpt-5.6-luna` as the evaluation candidate;
- `store: false`;
- no `conversation` and no `previous_response_id`;
- exactly one custom function tool;
- the named function forced through `tool_choice`;
- `strict: true` and fully closed schemas;
- `parallel_tool_calls: false`;
- no built-in tools;
- bounded output tokens and timeout;
- one bounded retry for transient or plausibly repairable invalid-output failure.

Future You owns conversation state. No provider-side persistent thread is authoritative. Raw requests,
responses, reasoning and full messages are not logged or persisted. The official Responses reference
documents the `store`, `tool_choice`, custom-function and `parallel_tool_calls` controls:
<https://developers.openai.com/api/reference/cli/resources/responses/methods/create>.

Provider configuration is explicit. Missing credentials may select the fake only through an explicit
local/test mode; production must not silently pretend a fake is live AI. Live-provider acceptance is
reported blocked when authorised credentials are unavailable.

## 8. Provider data minimisation

Interpretation receives only the bounded current message, supported-intent instructions, pending
clarification state, available scenario labels/types and trusted date/timezone metadata. Explanation
receives only symbolic trusted fact keys and allowed template/action identifiers.

Provider requests exclude full financial context, current-account balance, income, spending, goal
balances, employer association, Supabase identity, auth data, database rows and simulation ledger. A
pseudonymous safety identifier may be derived server-side without email or raw user ID. Tests inspect every
outbound fake/adapter request to prove this boundary.

## 9. Conversation and turn persistence

Each conversation is owned by one authenticated user and anchored to the user's server-resolved current
financial-context version at creation. It stores opaque ID, owner, anchored context, title, status,
selected run, prompt/orchestration version and creation/latest-activity timestamps. The browser supplies
neither owner nor arbitrary context.

Messages are append-only and ordered. Kinds are:

- `USER_TEXT`
- `ASSISTANT_CLARIFICATION`
- `ASSISTANT_RESULT`
- `ASSISTANT_EXPLANATION`
- `ASSISTANT_SCOPE`
- `ASSISTANT_ERROR`

An assistant result references the immutable simulation run rather than copying a second financial truth.
Turns store request ID/hash, status, interpretation/prompt/schema/provider/model versions, context/run
references, attempt/fallback metadata and timestamps. They do not store hidden reasoning or unvalidated
provider output.

Turn idempotency is scoped by user and conversation. An exact request ID/message retry returns the
existing completed/pending outcome without another message, run or unnecessary provider call. Changed
text under the same key returns `409 TURN_IDEMPOTENCY_KEY_REUSED`. Different users do not collide.

One pending clarification may be stored per conversation. Historical messages cannot be updated or
deleted by ordinary users.

## 10. Context revisions and stale conversations

A V1 conversation remains readable after V2 activation, and stored V1 explanations/results remain
available without recalculation. Any new scenario-producing message in that V1 thread returns
`CONVERSATION_CONTEXT_STALE`; it never uses V2 silently. The UI offers “Start a new conversation using
your current financial plan.” Explanation/selection of already stored V1 runs remains allowed. A new
thread anchors to V2.

## 11. Failure and retry behavior

- Interpretation unavailable: persist safe turn state, call no simulator, return retryable typed error.
- Invalid strict interpretation: at most one repair retry; otherwise fail without guessing.
- Unsupported: server scope message, no simulator.
- Simulator/application failure: typed application error, no replacement model prose.
- Explanation failure after simulation: preserve the one successful run and result card; render the
  deterministic fallback; mark fallback mode.
- Persistence failure: sanitised error, no partial provider output presented as completed.

One correlation ID spans the turn. Retries do not create another simulation. Logs contain only opaque IDs,
intent, version/model metadata, timing/token counts and sanitised categories—not messages or financial
payloads.

## 12. API contract

The minimum authenticated, owner-scoped, private/no-store API is:

```text
POST /api/v1/conversations
GET  /api/v1/conversations
GET  /api/v1/conversations/:conversationId
GET  /api/v1/conversations/:conversationId/messages
POST /api/v1/conversations/:conversationId/messages
POST /api/v1/conversations/:conversationId/selection
```

Mutations use the existing same-origin guard. Foreign/missing IDs are non-enumerable. Responses expose no
prompt, provider payload, owner ID, raw domain object or `bigint`.

## 13. Database ownership contract

Conversation, message, turn/idempotency and reference tables use explicit grants and forced RLS.
Ownership constraints require same-user context and run references; selected runs must match the
conversation's anchored context. Policies prove owner create/read/append, deny foreign and anon access,
and prevent owner mutation/deletion of historical messages. Normal processing uses the authenticated RLS
session and no service-role credential.

## 14. Ask visual source and design system

The primary structural source is the seven-SVG archive
`Blue Purple and Pink Modern Financial Investment Mobile Prototype (1).zip`; the rendered source is the
paired PNG archive `(2).zip`, both dated 23 August 2026. The exports are approximately `414 × 896`.
SVGs govern geometry, spacing, shape, radii, border, icon and gradient placement. PNGs govern overall
balance, density, hierarchy and colour impression. Product specifications govern behavior/content and
override outdated prototype copy or data.

Do not embed the full exported screens, use them as backgrounds, overlay invisible controls, reuse
outlined SVG text, hard-code Sarah values into clients or extract/distribute fonts. Reconstruct semantic,
accessible, data-driven React and CSS. Use a close accessible geometric sans-serif through the design
system.

Design tokens include:

- primary `#004AAD`, supporting blue `#5271FF`;
- pink approximately `#DE53AD`, purple approximately `#8C5BEA`, cyan `#38B6FF`;
- white plus pale-blue/pink/lilac surfaces;
- shared border opacity, radius, spacing, type, shadow, navigation and safe-area scales;
- a `414px` mobile reference width with fluid responsive bounds.

Reusable components are AppHeader, BottomNavigation, GradientHeroCard, PromptCard,
ConversationMessage, ResultCard, ImpactComparisonCard, ScenarioPill, ClassificationPill, AskComposer,
ContextPill, BottomSheet, ExpandableDisclosure, ErrorRetryCard and EmptyLoadingState. Slice 6 reuses these
for Home, Goals and Benefits.

## 15. Code-facing supplied-screen inventory

| Screen | Approved role / route-state | Reusable parts | Prototype replacement/defect | Production slice |
| --- | --- | --- | --- | --- |
| 1 | Welcome/auth choice | centred mark, primary/outline actions | slogan/copy may change; no screenshot embedding | Shared auth, Slice 5 foundation |
| 2 | `/login` | blue corner hero, outlined fields, primary action | demo email/password never hard-coded in production UI | Login styling foundation, Slice 5 |
| 3 | Signup visual reference only | auth form geometry | remove mandatory Company ID; workplace remains post-auth optional | Future auth styling; not a new Slice 5 signup flow |
| 4 | Home upper | greeting/header, gradient Ask hero, horizontal prompts, nav | replace Jenny/outdated prompts and clipped cards | Home, Slice 6 |
| 5 | Home lower/current path/opportunity | overview surface, goal cards, opportunity hero, nav | correct goal dates; remove fabricated £50 benefit | Home/Benefits preview, Slice 6 |
| 6 | Goals | outlined goal rows, add action, fixed nav | replace prototype targets with server data | Goals, Slice 6 |
| 7 | Ask initial | wordmark/menu, welcome hierarchy, prompts, composer, nav | Sarah/current user; supported prompts only; microphone deferred | Ask, Slice 5 |

Benefits has no complete supplied primary screen. Ask conversation/result/clarification/error/history states
also have no supplied screen; they extend screen 7 and the card language of screens 4–7 rather than
introducing another design.

## 16. Slice 5 Ask states

The mobile Ask shell implements initial, persisted conversation, user message, interpreting/calculating,
deterministic result, before/after impact, scenario selector, amount alternative, monthly timing
alternative, clarification, explanation, unsupported scope, retryable provider error, deterministic
fallback, conversation history, stale context and required empty/loading/reload states.

The primary result uses a deep-blue gradient, pale future-impact surfaces, rounded comparison cards,
scenario/classification pills and compact trusted values for buffer, bills, borrowing and recovery. The
answer precedes technical detail. Composer/navigation remain usable and appropriately fixed. Long text
must wrap without overlap; horizontal cards visibly indicate overflow.

The UI is not raw JSON, a wall-of-prose chat bubble, a table-heavy developer view or a banking dashboard.
Every financial value comes from server DTOs.

## 17. Evaluation corpus and visual evidence

A versioned corpus covers canonical, natural/noisy, clarification, follow-up, unsupported and adversarial
messages. Each case records expected intent, missing/unsupported fields, simulator permission, operation,
scenario reference and provider requirement. Fake-provider modes cover every success/failure class without
network.

Live evaluation is opt-in and credential-authorised. It requires every canonical case correct, zero
unsupported/adversarial simulator calls, source-grounded amounts, server-resolved relative dates, valid
fact-only plans, `store: false` and data-minimised requests. Lack of credentials is reported blocked, never
passed.

Visual evidence captures at `414 × 896`: initial Ask, £650 result, clarification, selector/alternatives and
unsupported/provider error. The initial view is compared with screen 7 for hierarchy, spacing,
proportions, colour, composer/navigation placement and overall energy without reproducing clipping or
prototype errors.

## 18. Completion gate

Slice 5 completes only when persistent owner-scoped threads can be created/reopened; canonical natural
language yields the unchanged £650 result; amount/month/explanation/selection follow-ups work;
clarification is minimal; unsupported requests create no run; every provider result is strict,
runtime-validated and source-grounded; final financial wording is server-rendered; all provider calls use
stateless `store: false`; idempotency, stale contexts, RLS and safe failures are proven; Ask follows the
supplied visual system; every Slice 1–4 gate remains green; no tests are skipped; and evolution history is
appended. Slice 6 does not begin automatically.

## 19. Known limits

No new simulator behavior, benefit arithmetic, scenario commitment, bank/payroll/employer integration,
web/RAG/file/voice/streaming provider tool, autonomous action, provider conversation state, full Home,
Goals or Benefits implementation, or product-wide final polish belongs to Slice 5.

## 20. Developer and operational proof

Use `CONVERSATION_PROVIDER=fake` for deterministic local and CI review. Set
`CONVERSATION_FAKE_MODE` to one of `normal`, `timeout`, `rate_limit`, `provider_failure`,
`invalid_schema`, `unknown_tool`, `multiple_tool_calls` or `explanation_failure` to force the matching
provider boundary. Playwright sets the normal fake explicitly.

Run the versioned 33-case interpretation corpus with:

```text
npm run test:evaluation
```

An authorised live review is deliberately separate from CI. Set `OPENAI_API_KEY` and the explicitly
approved `OPENAI_CONVERSATION_MODEL`, then run:

```text
npm run test:evaluation:live
```

The command exits with a `BLOCKED` result when either value is unavailable; that is not a passing live
gate. It reports case identifiers and aggregate outcomes only, not messages or financial context.

After `npm run db:reset`, persisted rows can be inspected through local Supabase Studio or an authenticated
SQL session in `conversations`, `conversation_messages` and `conversation_turns`. The assistant result
message's `run_id` must identify the immutable row in `simulation_runs`; the renderer reloads that run and
does not persist a copied financial result inside message content. Turn rows retain prompt/schema/model,
trusted timestamp/timezone, attempt and sanitised failure metadata.

To prove source authority and isolation, run `npm run test:integration`, `npm run db:test`,
`npm run build:boundary:check` and `npm run test:e2e`. The integration suite recreates the application,
reloads referenced runs, checks exact retry and cross-user denial. The bundle check rejects simulator,
provider, orchestration, fixture and mapper identifiers in client chunks. Provider-request assertions prove
that balances, income, goals, employer data and stored ledgers are absent.

After a context revision, the old conversation remains readable and is marked stale. Stored-result
explanation and selection remain available; scenario-producing input returns the server-owned
`CONVERSATION_CONTEXT_STALE` state, and the UI offers a fresh conversation anchored to the current plan.
