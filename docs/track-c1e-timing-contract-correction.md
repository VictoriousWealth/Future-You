# Track C1E — Timing Contract Correction

Date: 26 August 2026  
Status: **CANONICAL LOCAL CONTRACT IMPLEMENTED**  
Live OpenAI requests authorised in C1E: **0**  
Track C2: **PAUSED**  
Track B Phase B2: **PAUSED**

## 1. Purpose and recovery boundary

C1E corrects the two timing defects established by C1D:

1. the provider schema previously allowed timing-field combinations rejected by runtime validation; and
2. source grounding previously proved that a quote existed, but not that its meaning agreed with the
   provider's timing kind and fields.

The independently recoverable pre-correction state is:

```text
tag:    track-c1d-timing-diagnostic-complete-2026-08-26
commit: e42c03aab85959f2d104efdf721a76f92f8fcd5f
```

All earlier recovery tags and evidence remain unchanged. C1E changes only the approved interpretation,
timing validation, clarification, bounded-repair, fake-provider, evaluation and documentation boundaries.
It does not change simulator mathematics, money parsing, Sarah's context or results, scenario types,
persistence ownership, RLS, explanation planning, server financial rendering or Ask UI.

## 2. Active and historical versions

| Contract | Active after C1E | Historical retained |
| --- | --- | --- |
| Interpretation prompt | `fy-conversation-interpretation/3.0.0` | `1.0.0`, `2.0.0` |
| Interpretation schema | `fy-conversation-intent/3.0.0` | `1.0.0`, `2.0.0` |
| Timing policy | `fy-conversation-timing-policy/1.0.0` | Not applicable |
| Clarification prompt | `fy-clarification-resolution-prompt/2.0.0` | `1.0.0` |
| Clarification schema | `fy-clarification-resolution-schema/2.0.0` | `1.0.0` |
| Interpretation diagnostics | `fy-interpretation-diagnostic/2.0.0` | `1.0.0` |
| Explanation prompt/schema | `1.0.0` / `1.0.0` | Unchanged |

Historical turns retain their recorded versions. New turns use only the active versions.

## 3. One canonical timing policy

`src/application/conversation/timing-policy.ts` is the canonical server-owned policy. It defines:

- the four complete timing kinds;
- bounds and kind-specific null/value invariants;
- branch/state allowances;
- the deliberately bounded quote parser;
- quote/kind/numeric-field equivalence checks;
- the active Zod timing union;
- provider-facing descriptions and prompt table; and
- safe timing repair rules.

The active runtime schema imports the policy's Zod union. The provider schema is generated from policy
constants and branch definitions. Prompts embed the policy table. Diagnostics and repair map policy errors,
and the fake provider uses the deterministic parser. Drift tests cover each surface. Frozen v2 artifacts
remain separate and are explicitly labelled historical rather than silently changed.

## 4. Normative complete-timing matrix

Every complete branch has exactly five required fields. `null` is a required value where shown, not an
omitted property.

| Kind | Quote | `monthNumber` | `year` | `offsetMonths` | State requirement | Server resolution |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `NEXT_MONTH` | Non-empty and grounded | `null` | `null` | exactly `1` | No selected scenario for a create | Add one month to trusted request month |
| `MONTHS_AFTER_SELECTED` | Non-empty and grounded | `null` | `null` | integer `1..120` | Authorised selected scenario and a month-change operation | Add offset to selected scenario month |
| `NAMED_MONTH` | Non-empty and grounded | `1..12` | `null` | `null` | Selected scenario only when used as a change | Next occurrence relative to trusted date |
| `EXPLICIT_YEAR_MONTH` | Non-empty and grounded | `1..12` | `2000..2200` | `null` | Selected scenario only when used as a change | Validated explicit year and month |

`MISSING` and `AMBIGUOUS` remain application-owned partial/pending states. They are never complete provider
timing objects. A new purchase may not use `MONTHS_AFTER_SELECTED`; that kind belongs only to a selected
scenario month-change, including its matching pending-clarification continuation.

## 5. Provider schema

The v3 provider root remains a strict object with one required `interpretation` property and no root
`anyOf`. Interpretation alternatives remain nested. Timing itself is a nested four-way alternative whose
objects each:

- have `additionalProperties: false`;
- require all five properties;
- use a single allowed kind value;
- express exact nulls;
- constrain month/year/offset ranges; and
- constrain `NEXT_MONTH.offsetMonths` to exactly `1`.

The same v3 timing schema is used by the active month-clarification provider contract. The sanitised SHA-256
fingerprint of the complete active interpretation parameter object is:

```text
93022ec341abe8706f8e59e08e6058d96119ef28c5121a8e95e58f3e645960b5
```

Automated tests run the existing strict-schema walker across the interpretation and month-clarification
contracts. The provider continues to use one forced strict function, no built-in tools,
`parallel_tool_calls: false`, runtime validation and `store: false`. The official Responses API reference
documents these function, strict-schema, tool-selection, parallel-call and storage controls
([OpenAI Responses API reference](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create)).

## 6. Deterministic timing grammar

The application parser accepts only the approved bounded grammar:

- `next month` and the existing case/noisy `nxt month` variant;
- English month names;
- named month plus a four-digit approved year;
- the already supported `YYYY-MM` form;
- numeric `N month(s) later/after` within `1..120`;
- word `one` for the existing one-month form; and
- the existing `wait one month` form.

Case and whitespace are normalised. Arbitrary word-to-number conversion, general natural-language date
parsing and provider-resolved calendar dates are not introduced. Multiple recognised timing meanings or
approved vague wording such as `sometime later` is ambiguous. Unknown wording is unrecognised.

The validation order is:

1. require the complete kind-specific structure;
2. verify the exact quote occurs in the current user message or the one explicitly allowed prior field;
3. parse that quote deterministically;
4. compare parsed kind, month, year and offset with provider fields;
5. validate intent and selected-scenario state; and
6. let the trusted server resolver produce `YYYY-MM`.

No contradiction may reach the simulator. For trusted date August 2026, canonical `NEXT_MONTH` resolves to
`2026-09`; September is not embedded in the prompt or parser.

## 7. Precise diagnostics

Diagnostic v2 retains the original closed inventory for historical comparison and adds the approved timing
codes:

```text
TIMING_KIND_REQUIRED
TIMING_QUOTE_REQUIRED
TIMING_QUOTE_NOT_GROUNDED
TIMING_QUOTE_UNRECOGNISED
TIMING_QUOTE_AMBIGUOUS
TIMING_QUOTE_KIND_MISMATCH
TIMING_MONTH_NUMBER_REQUIRED
TIMING_MONTH_NUMBER_FORBIDDEN
TIMING_MONTH_NUMBER_MISMATCH
TIMING_YEAR_REQUIRED
TIMING_YEAR_FORBIDDEN
TIMING_YEAR_MISMATCH
TIMING_OFFSET_REQUIRED
TIMING_OFFSET_FORBIDDEN
TIMING_OFFSET_MUST_EQUAL_ONE
TIMING_OFFSET_MISMATCH
TIMING_SELECTED_SCENARIO_REQUIRED
TIMING_KIND_NOT_ALLOWED_FOR_INTENT
TIMING_FIELDS_INCOMPATIBLE
```

Each active timing failure records an approved stage, closed code, safe pointer and the approved timing kind
where one was supplied. It never records the quote or any other user/provider value. Structurally invalid
fields fail at strict-schema validation; incompatible kind fields fail branch semantics; quote provenance
and meaning fail source grounding; and selected-scenario/intent restrictions fail conversation-state
validation. No failed diagnostic authorises an application command or reports a simulator invocation.

## 8. One bounded repair

The existing maximum of one repair is unchanged. Timing failures supply only:

- a safe JSON-pointer path;
- a closed diagnostic code; and
- the corresponding fixed contract rule.

The repair input includes the current message and minimal symbolic conversation state already approved for
interpretation. It does not include the raw provider response, invalid structured output, an expected corpus
branch, resolved month, simulator result, financial context, hidden prompt or financial output. Repair uses
the same active v3 prompt/schema/model configuration. Tests preserve `SUCCEEDED`, `IDENTICAL_FAILURE`,
`NEW_FAILURE` and `EXHAUSTED` outcomes, with exactly two total calls when repair is used.

## 9. Clarification alignment

The active month clarification uses timing schema v3 and clarification prompt/schema v2. The same semantic
object represents `next month` in:

- an initial purchase;
- an answer to `Which month?`; and
- a timing-change follow-up.

The contextual distinction is state, not representation. `MONTHS_AFTER_SELECTED` is allowed only when the
pending operation is a month change and the server declares an authorised selected scenario. The narrow
clarification provider cannot reinterpret the original request into a different intent.

## 10. Evaluation and fake-provider contract

The versioned v3 timing corpus adds 18 direct cases covering canonical, structural, semantic, grounding,
state, noisy, ambiguous, clarification, follow-up and unsupported intra-month timing. Each case records the
expected kind/fields, diagnostic, simulator permission, state requirement and resolved month where valid.

Deterministic low-level provider modes cover valid canonical/named/explicit/relative timing; missing and
wrong offsets; wrong kind/month/year; missing selected state; ungrounded quotes; and successful, identical
and changed timing repairs. The production fake's lexical timing recognition is driven by the bounded parser,
not corpus case IDs or full-message answer keys.

The C1D 3,024 representative analysis remains frozen. Repeating the same shape grid against v3 yields:

| Classification | Count |
| --- | ---: |
| Synthetic representative objects | 3,024 |
| Provider-valid | 32 |
| Runtime-valid | 32 |
| Source-equivalent for the grid's two non-empty quote samples | 2 |

Every provider-valid representative is runtime-valid. Every source-equivalent representative has one
unambiguous parser meaning. Quote equivalence and selected-scenario state intentionally remain runtime-only
because they depend on user text and trusted application state rather than static JSON shape.

## 11. Security and authority

- The provider receives no financial context, balances, goals, employer data or simulation ledger.
- Exact money still uses the server GBP parser; no timing code parses money.
- Trusted timestamp, `Europe/London`, selected scenario and calendar rules remain server-owned.
- The provider cannot choose a user, context, scenario ID, run ID or authoritative `YYYY-MM` for relative timing.
- The simulator remains independent of OpenAI, prompts, HTTP, Next.js, React and Supabase.
- Browser code cannot import provider schemas, prompt definitions, timing resolution or simulator code.
- Diagnostics remain evaluation-only, default-disabled and value-free.
- No raw provider response or user quote is logged or persisted by this correction.

## 12. Known limitations and stop boundary

- The parser is intentionally not a general date interpreter.
- Word-only offsets other than `one` are not supported.
- Dates outside `2000..2200` are rejected by the approved contract.
- Intra-month/payday timing remains unsupported.
- The v3 corpus is local and deterministic; it does not establish live model reliability.
- C1E authorises no live OpenAI request and makes no model recommendation.

After local completion, the proposed but separately gated next action is exactly one canonical Terra smoke at
low reasoning, one logical case, one initial request plus at most the existing repair and a maximum estimated
spend of US$0.10. C1E itself stops before that action. Track C2 and Phase B2 remain paused.

