# Trusted-data Ask demo mode — implementation and evidence

## Outcome

Future You now has a temporary, server-controlled Ask mode that preserves the existing Track C path and
adds a more natural continuous conversation over trusted Future You data. The deterministic simulator and
stored immutable runs remain the only authority for financial outcomes.

The implementation made no database migration, RLS-policy, financial-context, simulator, Sarah-fixture or
frozen-result change. No live OpenAI request was made.

## What changed

- Added the independent orchestration version
  `fy-conversation-orchestration/trusted-demo-1.0.0`.
- Added server-only `FUTURE_YOU_ASK_MODE=strict|trusted_demo`; unset means `strict`, and an unknown value
  fails configuration rather than silently enabling the demo.
- Kept existing strict conversations on their recorded strict orchestration version. Only conversations
  created while the server flag is enabled use the demo path.
- Reused the existing authenticated route, owner-scoped Supabase repository, immutable conversation turns,
  scenario/run persistence, exact-money/date validation and deterministic one-off-purchase use cases.
- Added two read-only retrieval intents: `RETRIEVE_GOALS` and `RETRIEVE_WORK_BENEFITS`.
- Added a trusted-data projection for goal facts and verified workplace/Benefits facts.
- Added a separate constrained wording call and a deterministic fallback.
- Added focused unit/contract tests and an isolated mobile Chromium journey for the seven requested turns.

## Orchestration flow

```text
Authenticated user message
  -> server-owned conversation/context and selected-run state
  -> strict demo interpretation
  -> runtime schema, quote, timing and scenario-reference validation
  -> one of:
       existing deterministic simulator operation
       stored immutable run retrieval
       trusted goal/Benefits projection
  -> presentation-ready trusted facts
  -> constrained wording template
  -> server substitution of exact trusted fact sentences
  -> persisted assistant message and renderer-only browser
```

Purchase, amount and timing turns continue through the existing application use cases. Explanation turns
read the selected immutable run and do not recalculate its result. Goal and Benefits turns read the
conversation's anchored context and authoritative employer records and create no scenario or financial run.
The existing conversation-detail envelope still supplies the renderer with the authoritative current-path
DTO; it does not make the retrieval answer an AI calculation.

## Financial-authority boundary

The model cannot set or overwrite affordability, balances, safety-buffer changes, bill coverage, overdraft
usage, restoration dates, goal dates, classifications, scenario ancestry or result identity.

For financial decisions, those values come from the existing simulator DTO. For explanations, they come
from the stored immutable result. For retrieval, they come from the anchored financial context and the
verified Benefits read sources.

The wording provider returns only a template containing server fact placeholders such as
`{{SAFETY_BUFFER}}`. It must preserve every supplied key exactly once. The server rejects repeated, missing
or unknown keys and rejects connective text that attempts to add numbers, dates, financial claims, benefit
effects, recommendations or advice. The server then replaces each placeholder with the complete trusted
fact sentence. Invalid output or a wording-provider failure uses the deterministic trusted-fact fallback;
an already-created result and its result card remain available.

Scenario labels supplied by interpretation remain non-authoritative. They must be grounded in the current
message or resolved from the authenticated conversation's own scenario list. Internal scenario and run IDs
are never model-selected.

## Provider data minimisation

Interpretation receives only the current message and the already-approved bounded state needed for the
turn: pending-clarification shape, user-facing scenario labels/types, selected scenario type, trusted date,
`Europe/London`, and the closed supported-follow-up family where applicable.

Wording receives only:

- the answer kind;
- presentation-ready fact keys; and
- the complete trusted sentences needed for that answer.

It does not receive auth IDs, emails, Company IDs, OTP data, context/run/scenario UUIDs, RLS metadata,
secrets, raw database rows or the full financial context. The existing OpenAI adapter remains server-only
and retains a forced strict function, runtime validation, `parallel_tool_calls: false`, no built-in tools,
`store: false` and application-owned conversation state.

## Supported demo journey

The tested continuous Sarah thread covers:

1. `Can I afford a £650 trip next month?`
2. `What about £500?`
3. `What about £400?`
4. `What if I wait until October?`
5. `Why does it delay my emergency fund?`
6. `What are my goals?`
7. `What benefits do I have from work?`

Sarah's values are read from the canonical context, employer records and existing simulator/stored runs.
No result is hard-coded into the AI adapter or prompt.

## Still unsupported

The demo adds retrieval, not new financial capability. Benefit activation or simulation, pension changes,
instalments, spending substitution, save-first, recurring-expense decisions, scenario commitment,
investment advice, goal-priority recommendations and autonomous financial action remain unsupported. The
model cannot improvise them.

The mode is intentionally not an unrestricted financial adviser. It accepts natural wording around the
approved operations and trusted retrieval questions while the server keeps the operation set bounded.

## Enable, disable and run safely

Strict mode remains the default:

```text
FUTURE_YOU_ASK_MODE=strict
```

For a local, non-billable demonstration, use the deterministic fake provider with local Supabase:

```text
APP_ENV=local
FUTURE_YOU_ASK_MODE=trusted_demo
CONVERSATION_PROVIDER=fake
OPENAI_PROVIDER_ENABLED=false
OPENAI_MODEL=
```

Then start the existing application normally. The isolated browser proof is:

```text
npm run test:e2e:demo
```

It starts the built application with the same fake-provider, disabled-OpenAI settings. Unset the mode or set
it back to `strict` to disable the demo for newly created conversations. Historical strict conversations
remain strict; demo conversations are identified by their recorded orchestration version.

Do not enable the live provider without a separately authorised server-only credential procedure. This
implementation did not resume C1H/Terra acceptance, Luna, Sol, Track C2 or Phase B2.

## Verification

| Gate | Discovered | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: |
| Full Vitest with coverage | 490 tests / 38 files | 490 | 0 | 0 |
| Focused demo/OpenAI contract | 19 tests / 2 files | 19 | 0 | 0 |
| Existing evaluation corpus | 142 tests / 4 files | 142 | 0 | 0 |
| Repeated fake-provider evaluation | 150 evaluations | 150 | 0 | 0 |
| Supabase integration after clean local reset | 20 tests / 6 files | 20 | 0 | 0 |
| PostgreSQL/pgTAP after clean local reset | 273 tests / 6 files | 273 | 0 | 0 |
| Existing mobile Chromium | 31 tests | 31 | 0 | 0 |
| Existing Slice 5 browser contract | 2 tests | 2 | 0 | 0 |
| Isolated trusted-demo mobile Chromium | 1 test | 1 | 0 | 0 |

Coverage from the 490-test run:

```text
Statements  79.20% (3,040/3,838)
Branches    67.83% (2,157/3,180)
Functions   82.13% (616/750)
Lines       81.58% (2,787/3,416)
```

TypeScript, ESLint, the keyless production build (22 generated pages/routes), source/client dependency
boundaries, generated database seed/type drift, secret scans and visual regression passed. No visual
baseline change was retained. `git diff --check` passed.

The first integration run found test-mutated local fixtures rather than a product defect. After proving the
target was the repository's local Supabase instance, the already-authorised local reset reapplied all five
committed migrations and the canonical seed. Clean-state integration passed 20/20. A second clean local
reset isolated pgTAP, which passed 273/273. No dashboard step, manual SQL, hosted database, weakened
expectation or changed financial output was used.

## Remaining limitations

- The live OpenAI behavior of the demo prompts has not been evaluated; the deterministic fake provider is
  the verified demo configuration.
- Natural connective wording is deliberately constrained. If it cannot be validated, users see the trusted
  deterministic fallback rather than unverified prose.
- Goal retrieval currently states confirmed balances, targets and paused state. It does not invent progress
  forecasts or recommendations.
- Benefits retrieval is descriptive and non-numerical. Eligibility and inactive opportunities do not alter
  any financial scenario.
- The stricter Track C path and all of its evidence remain in the repository and remain the default path.

