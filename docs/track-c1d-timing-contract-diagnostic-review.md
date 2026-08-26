# Track C1D — Timing-Contract Diagnostic Review

Date: 26 August 2026  
Status: **LOCAL DIAGNOSTIC REVIEW COMPLETE — CORRECTION NOT IMPLEMENTED**  
Live OpenAI requests in C1D: **0**  
Track C2: **PAUSED**  
Track B Phase B2: **PAUSED**

## 1. Decision summary

The accepted live result remains:

```text
CANONICAL TERRA DIAGNOSTIC — FAILED
Branch: CREATE_ONE_OFF_PURCHASE
Strict structural schema: passed
Failure stage: BRANCH_SEMANTIC_VALIDATION
Safe path: /interpretation/timing
Code: SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION
Repair: IDENTICAL_FAILURE
Provider requests: 2
Simulator calls: 0
Financial-authority violations: 0
Estimated spend: US$0.016542
```

The exact live timing values remain unknown and are not reconstructed in this review. The preserved
artifact deliberately contains no raw arguments. Consequently, C1D can prove the contract mismatch and
every plausible local failure class, but cannot claim which individual live field was wrong.

The primary diagnosis is:

> The v2 provider JSON Schema requires the five timing properties and their broad JSON types, but it does
> not encode the kind-specific combinations enforced by the Zod runtime contract. A response can therefore
> satisfy `strict: true` and still fail the application at `/interpretation/timing`.

The review also found a separate deterministic enforcement defect:

> Source grounding proves only that the timing quote occurs in the message. It does not prove that the
> quote's meaning agrees with the returned timing kind. A canonical `next month` quote paired with a
> runtime-valid `NAMED_MONTH` object currently reaches application eligibility and resolves using the
> model-supplied month number.

This defect is documented and frozen in a test. It is not fixed in C1D.

## 2. Preserved evidence and unknowns

### Preserved recovery and evidence

- C1C recovery tag: `track-c1c-sanitised-diagnostics-ready-2026-08-26`
- Dereferenced recovery commit: `f6d215ae032c1068fe89511571b4480654d2b981`
- Live evidence commit: `2e292cac134fd6bc598852cc5ddfae0d48d3a57f`
- Sanitised artifact SHA-256: `bbb8c83a0a446046bc3e3b294e400a771ba18e21f8ed4a2f7c32ff9442711cab`
- Live report SHA-256: `67bd1c23560eb9084bd3ca1ba5b9f205a26b7f683876e64288d3e512aa426c2d`

Neither the live artifact nor its report was edited during C1D.

### Known from the live attempt

- Terra reached the configured model and returned the expected forced function.
- The root envelope, JSON and `CREATE_ONE_OFF_PURCHASE` discriminator were valid.
- The provider-facing JSON Schema accepted the output.
- The runtime produced a Zod custom issue at the timing-object root.
- The diagnostic mapper converted it to the broad semantic code above.
- The repair produced the same sanitised failure signature.
- Grounding, conversation-state validation and command authorisation were not reached.

### Still unknown

- The actual live timing object.
- Whether `quote`, `monthNumber`, `year`, `offsetMonths`, or several fields caused the live failure.
- Whether the two attempts were value-for-value identical. `IDENTICAL_FAILURE` means the sanitised stage,
  code, path, branch and safe field-presence signature were identical.
- Per-attempt tokens, latency, provider request IDs and cost.

## 3. Complete timing-path trace

| Layer | Current contract | Authority and divergence |
| --- | --- | --- |
| 1. TypeScript types | `TimingInterpretation` has six kinds and nullable fields. `CompleteTimingInterpretation` has four complete kinds, a required string quote and three nullable numeric properties. | Types describe shape only; they do not enforce the kind-specific value relationships at runtime. |
| 2. Runtime/Zod | `completeTimingInterpretationSchema` requires a 1–120 character quote, bounded integers/nulls and four `superRefine` predicates. | This is the actual accepted semantic timing contract. |
| 3. Provider JSON Schema | All five properties are required; quote is any string; kind is one of four; each numeric field is any integer or null. | It has no length/range constraints and no kind-specific null/value relationship. This is the primary live gap. |
| 4. Interpretation prompt | Requires preservation of exact timing quotes and says the server resolves relative dates. | It does not define `offsetMonths=1`, required nulls, or a valid complete timing object. |
| 5. Contrastive examples | Covers missing amount, missing month and several branch decisions. | It contains no successful timing-object example and no kind-specific field example. |
| 6. Branch semantic validator | The nested timing `superRefine` runs while parsing the selected branch. | Four different timing predicates all emit an unpathed custom issue and become one broad diagnostic code. |
| 7. Source grounding | `sourceContainsQuote` performs case-insensitive substring matching against the current or specifically allowed prior message. | It proves provenance of text, not semantic agreement between quote and kind. |
| 8. Trusted resolver | `resolvePaymentPeriod` uses the trusted date, London timezone output, selected scenario period and timing kind. | The model never returns the authoritative resolved period, but `monthNumber`, `year` and `offsetMonths` influence server resolution. |
| 9. Month clarification | `RESOLVE_PURCHASE_MONTH` reuses `completeTimingInterpretationSchema` and the same provider `completeTiming` shape. | Initial purchase, month clarification and timing follow-up agree at runtime and share the same provider/runtime mismatch. |
| 10. Bounded repair | Sends minimal state, the transient invalid structured output, broad safe path/code and permitted identifiers through the same prompt/schema. | It does not identify the failed invariant, required field, forbidden field, expected kind, or server-only field rule. |
| 11. Fake provider | Deterministic parser emits the intended four valid complete shapes and carries `MISSING`/`AMBIGUOUS` only as application-owned partial state. | Existing valid fixtures encode the runtime contract correctly; C1D adds invalid local fixtures without changing production fake behavior. |
| 12. Frozen C0 corpus | Retains 33 historical messages/expectations. | It asserts branch outcomes, not exact timing objects for every case. |
| 13. Expanded v2 corpus | Covers next month, named month, one-month-later, missing/ambiguous month, noisy month and unsupported intra-month timing. | It has no explicit year-month case and does not directly assert every timing field. |
| 14. Command construction | The application resolves a `YYYY-MM` period before constructing the existing one-off purchase request. | No timing object is passed to the simulator; only the server-resolved payment period and approved assumptions cross that boundary. |

## 4. Current timing types

### Complete provider-facing timing

```ts
type CompleteTimingInterpretation = {
  quote: string;
  kind:
    | "NEXT_MONTH"
    | "MONTHS_AFTER_SELECTED"
    | "NAMED_MONTH"
    | "EXPLICIT_YEAR_MONTH";
  monthNumber: number | null;
  year: number | null;
  offsetMonths: number | null;
};
```

All five fields must be present in provider output. Nullable does not mean optional.

### Legacy/pending partial timing

`TimingInterpretation` additionally allows `MISSING` and `AMBIGUOUS`, a null quote and otherwise nullable
fields. The active v2 provider does not return those two kinds inside a complete command. It returns an
explicit `CLARIFY_PURCHASE_MONTH` or `AMBIGUOUS` branch instead. The legacy form remains useful for persisted
pending state and frozen v1 comparison.

## 5. Normative timing matrix

| Kind | Valid branches | Quote | `monthNumber` | `year` | `offsetMonths` | Selected scenario | Server resolution | Provider authority | Invalid combinations | Incomplete outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `NEXT_MONTH` | Create; change month; clarify amount with preserved timing; resolve month; nested pending month change | Required, non-empty, source-grounded | Must be null | Must be null | Must equal `1` | No for create; a change branch independently needs a scenario | Add one month to trusted request date | Classify the quoted phrase as next month and return the fixed semantic shape; not the final `YYYY-MM` | Any explicit month/year, null offset, `0`, or offset other than `1` | Use month clarification when timing is missing/ambiguous |
| `MONTHS_AFTER_SELECTED` | Change month; nested pending month change; technically accepted by complete schema elsewhere | Required, non-empty, source-grounded | Must be null | Must be null | Integer `1..120` | Yes in application behavior | Add offset to selected scenario's payment period | Classify relative-to-selected meaning and count; not final `YYYY-MM` | Missing/non-positive/out-of-range offset; explicit month/year; initial create without selected period | Scenario clarification/state rejection if no scenario |
| `NAMED_MONTH` | Create; change month; clarify amount with preserved timing; resolve month; nested pending month change | Required, non-empty, source-grounded | Integer `1..12` required | Must be null | Must be null | Only for change branches | Choose trusted current year when month has not passed, otherwise next year | Identify named month number; not authoritative year | Missing/out-of-range month; explicit year; any offset | Month clarification when the month phrase is missing/ambiguous |
| `EXPLICIT_YEAR_MONTH` | Same complete-timing branches | Required, non-empty, source-grounded | Integer `1..12` required | Integer `2000..2200` required | Must be null | Only for change branches | Format supplied explicit year/month after validation | Extract explicit year and month from quoted text; not infer relative date | Missing/out-of-range year/month; any offset | Month clarification when incomplete/ambiguous |
| `MISSING` | Legacy/pending partial timing only | May be null | Nullable | Nullable | Nullable | No command authority | None | No complete command authority | Invalid in every complete v2 timing position | Deterministic `CLARIFY_PURCHASE_MONTH` |
| `AMBIGUOUS` | Legacy/pending partial timing only; top-level v2 ambiguity has its own branch | May be null | Nullable | Nullable | Nullable | No command authority | None | May classify unresolved ambiguity, but not produce a command | Invalid in every complete v2 timing position | Deterministic clarification/approved ambiguity response |

`MONTHS_AFTER_SELECTED` is the one complete semantic kind with an additional state dependency. The Zod timing
schema itself cannot establish that a selected scenario exists.

## 6. Canonical “next month” representation

For:

```text
Can I afford a £650 trip next month?
```

the exact current intended object is:

```json
{
  "quote": "next month",
  "kind": "NEXT_MONTH",
  "monthNumber": null,
  "year": null,
  "offsetMonths": 1
}
```

Answers to the frozen questions are:

- `quote` must reproduce the exact source substring `next month` for this canonical spelling.
- `kind` must be `NEXT_MONTH`.
- `offsetMonths` must be the integer `1`; null is invalid even though the kind also carries the meaning.
- `monthNumber` must be null.
- `year` must be null.
- The provider must not return the authoritative resolved year-month.
- The server applies the trusted date `2026-08-24` and resolves the payment period to `2026-09`.
- The simulator receives `2026-09`, not the provider timing object.

The current exact predicate is:

```ts
value.kind === "NEXT_MONTH" &&
  (value.monthNumber !== null || value.year !== null || value.offsetMonths !== 1)
```

When true, Zod adds one custom issue to the timing object. Any of these would satisfy the predicate instead:

```text
monthNumber = null
year = null
offsetMonths = 1
```

The live artifact does not identify which member differed.

## 7. Provider-schema versus runtime contract

### Provider predicate

The current strict provider schema accepts a timing object exactly when:

- it has exactly `quote`, `kind`, `monthNumber`, `year`, and `offsetMonths`;
- `quote` is any JSON string, including empty or arbitrarily long strings;
- `kind` is one of the four complete kinds; and
- each numeric field is either null or any JSON integer.

That value space is mathematically infinite because strings and integers are unbounded. Literal enumeration
of every value is impossible. C1D therefore provides both:

1. a complete analytic classification through the predicates in this document; and
2. an exhaustive test of all 32 kind/nullability patterns plus representative lower, valid and upper range
   equivalence classes for quote, month, year and offset.

### Test-only equivalence enumeration

The local enumerator produces 3,024 provider-valid synthetic representatives:

```text
4 timing kinds
× 3 quote classes
× 6 month-number classes
× 6 year classes
× 7 offset classes
= 3,024
```

It includes empty, grounded and non-grounded quotes; null; below-range; boundary; ordinary valid; and
above-range integer representatives. It imports the actual provider JSON Schema and actual Zod/runtime,
grounding, diagnostic and resolver functions.

| Classification | Representative count |
| --- | ---: |
| Provider-schema valid | 3,024 |
| Runtime timing-contract valid | 32 |
| Reported strict-schema failure | 73 |
| Reported branch-semantic failure | 2,919 |
| Source-grounding failure after runtime acceptance | 16 |
| Resolver/conversation-state failure | 3 |
| Initial-create application eligible | 13 |
| Eligible and canonical meaning correct | 1 |
| Eligible but canonical quote/kind meaning inconsistent | 12 |
| Diagnostic authorised but resolver rejected state | 3 |

The counts are representative-equivalence results, not a claim that the infinite literal space contains
only 3,024 objects.

### Kind-specific semantic gap

| Kind | Provider permits | Runtime accepts |
| --- | --- | --- |
| `NEXT_MONTH` | Any null/integer mix | Only month null, year null, offset exactly `1` |
| `MONTHS_AFTER_SELECTED` | Any null/integer mix | Only month null, year null, offset `1..120` |
| `NAMED_MONTH` | Any null/integer mix | Only month `1..12`, year null, offset null |
| `EXPLICIT_YEAR_MONTH` | Any null/integer mix | Only month `1..12`, year `2000..2200`, offset null |

All four permit an empty quote and out-of-range integers at the provider layer. No current provider-schema
condition can prevent the exact semantic failure seen live.

The OpenAI Responses API accepts a JSON Schema for custom function inputs and `strict: true` constrains the
model to that supplied schema. It cannot enforce invariants absent from the supplied schema. The official
API reference also exposes the controls Future You retains: forced `tool_choice`, `parallel_tool_calls` and
`store` ([OpenAI Responses API reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)).

## 8. Exact semantic failure and diagnostic breadth

The failure originates in `completeTimingInterpretationSchema.superRefine` in
`src/application/conversation/schemas.ts`. Four separate custom predicates share one diagnostic mapping:

- invalid `NEXT_MONTH` field combination;
- invalid `MONTHS_AFTER_SELECTED` field combination;
- invalid `NAMED_MONTH` field combination; and
- invalid `EXPLICIT_YEAR_MONTH` field combination.

`runtimeValidationDiagnostic` delegates Zod issues to `issueCodes` in
`src/infrastructure/ai/openai/interpretation-diagnostics.ts`. For a custom issue on a supported branch other
than the special explanation/selection cases, it emits:

```text
SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION
```

The same broad code can also represent non-timing supported-branch refinements, including a non-GBP command
or a scenario strategy/quote disagreement. It therefore does not mean literally that a field was absent.

The path is `/interpretation/timing` because the custom issue is attached to the timing-object root. It is
privacy-safe but not precise enough to distinguish:

- a required value missing/null;
- a forbidden value present;
- a value present but incompatible with its kind; or
- several simultaneous violations.

Field names can be reported safely without reporting values. A future diagnostic revision could emit the
approved codes proposed by the C1D contract: `TIMING_QUOTE_REQUIRED`, `TIMING_OFFSET_REQUIRED`,
`TIMING_OFFSET_FORBIDDEN`, `TIMING_MONTH_REQUIRED`, `TIMING_YEAR_REQUIRED`, and
`TIMING_FIELDS_INCOMPATIBLE`. C1D does not add them.

There is an additional diagnostic limitation: when one value produces both a range/type issue and a custom
semantic issue, the current loop can finish with `BRANCH_SEMANTIC_VALIDATION` as the reported stage. The
record may therefore call strict structure valid while retaining a `FIELD_TYPE_INVALID` code. This does not
weaken runtime rejection, but a future observer should define deterministic precedence for mixed failures.

## 9. Source grounding and quote/kind consistency

The current source check is deliberately simple:

```text
lowercase(user message) contains lowercase(provider quote)
```

It correctly rejects a provider-invented timing quote and allows only a current-message or specifically
preserved prior quote. It does not parse the quote and compare its meaning to `kind`.

The test-only canonical case demonstrates the defect:

```json
{
  "quote": "next month",
  "kind": "NAMED_MONTH",
  "monthNumber": 10,
  "year": null,
  "offsetMonths": null
}
```

Current behavior:

```text
Provider schema: pass
Runtime timing semantics: pass
Quote source grounding: pass
Diagnostic command authorisation: pass
Trusted resolver: 2026-10
Canonical meaning check: fail
```

The server remains the component formatting the final period, but it acts on a semantically inconsistent
model classification. This is a deterministic validator defect/gap, not evidence about the unknown live
object. Per the C1D boundary it is documented, tested and left unchanged.

## 10. Conversation-state validation

A runtime-valid `MONTHS_AFTER_SELECTED` object requires a selected scenario period. In an initial
`CREATE_ONE_OFF_PURCHASE` branch there is no selected period, so `resolvePaymentPeriod` raises
`SCENARIO_REFERENCE_REQUIRED`.

The evaluation-only `successfulInterpretationDiagnostic` checks selected/explicit scenario strategies but
does not check this kind-specific dependency. It can mark the command authorised before the actual resolver
rejects it. Three representative canonical-grounded `MONTHS_AFTER_SELECTED` objects expose this observer
gap. The application still fails closed and no simulator is called; only diagnostic completeness is wrong.

## 11. Repair analysis

The repair request receives:

- the original minimal user/state request;
- the transient invalid interpretation;
- the same v2 provider schema;
- the same v2 interpretation prompt;
- permitted identifiers; and
- for the live-shaped failure, only:

```json
{
  "path": "/interpretation/timing",
  "code": "SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION"
}
```

It is told that timing failed broadly. It is not told:

- which timing field failed;
- whether a field was missing, forbidden or incompatible;
- which kind-specific invariant applies;
- that `NEXT_MONTH` requires `offsetMonths=1`;
- that `monthNumber` and `year` must be null for that kind;
- that the quote must be source-grounded; or
- that the provider must not resolve the final year-month.

The invalid object remains visible transiently to the same provider, but neither the provider schema nor the
prompt explains how to transform every provider-valid timing object into the narrower runtime shape. The
identical repair failure is therefore explainable without attributing a capability failure to Terra.

Local fixtures prove:

- repeating the same invalid timing signature becomes `IDENTICAL_FAILURE`;
- a different invalid range/semantic signature becomes `NEW_FAILURE`; and
- the exact canonical timing object becomes `SUCCEEDED`.

All three retain two calls maximum and `simulatorInvoked: false` at the provider diagnostic boundary.

## 12. Clarification contract comparison

The initial create branch, a timing-change branch, the nested scenario-clarification timing, optional timing
preserved while asking for amount, and `RESOLVE_PURCHASE_MONTH` all reuse the same complete Zod timing
schema. They agree on:

- the four complete kinds;
- required non-empty quote;
- `NEXT_MONTH` offset representation;
- named-month and explicit-year representation; and
- server-owned period resolution.

They also reuse the same under-constrained provider `completeTiming` JSON Schema. The clarification prompt
requires an exact quote and rejects authoritative calendar resolution, but does not state the kind-specific
fields. Thus there is no initial-versus-clarification runtime disagreement; the provider/runtime divergence
is duplicated consistently across both provider operations.

## 13. Corpus audit

| Case class | Current expected representation |
| --- | --- |
| Canonical/natural `next month` | Complete `NEXT_MONTH`, null month/year, offset `1` |
| Noisy `nxt month` | Same `NEXT_MONTH` shape; exact noisy quote retained |
| Named `October` | Complete `NAMED_MONTH`, month `10`, null year/offset |
| Noisy timing follow-up `w8 till october` | `CHANGE_PURCHASE_MONTH` with the same named-month shape |
| `one month later` follow-up | Complete `MONTHS_AFTER_SELECTED`, null month/year, offset `1`, selected scenario required |
| Missing month | `CLARIFY_PURCHASE_MONTH`; no fabricated complete timing |
| Ambiguous `October or November` | `CLARIFY_PURCHASE_MONTH`; no fabricated complete timing |
| Pending month answer `October` | `RESOLVE_PURCHASE_MONTH` with named-month shape |
| Current-path selection mentioning no purchase timing | Selection branch; no timing object |
| Unsupported intra-month `after payday` | `UNSUPPORTED / INTRA_MONTH_PAYMENT_TIMING`; no timing object |

The expanded v2 corpus contains no explicit `YYYY-MM` case. The fake provider implements that kind, and C1D
tests its runtime representation, but it is an evaluation-coverage gap. C1D does not alter the frozen corpus.

The corpus also checks branch and source-quote expectations more strongly than exact timing fields. The new
C1D test audits the actual fake outputs for every existing timing-bearing case without changing any expected
branch.

## 14. Local reproduction matrix

| Synthetic case | Current outcome | Safe stage/code | Simulator eligibility |
| --- | --- | --- | --- |
| `NEXT_MONTH` missing quote property | Provider and runtime structural rejection | `STRICT_SCHEMA_VALIDATION` / `BRANCH_REQUIRED_FIELD_MISSING` | No |
| `NEXT_MONTH` null offset | Provider accepts; runtime semantic rejection | `BRANCH_SEMANTIC_VALIDATION` / broad supported-intent code | No |
| `NEXT_MONTH` offset other than `1` | Provider accepts; runtime semantic rejection | Same broad result | No |
| `NEXT_MONTH` with explicit month | Provider accepts; runtime semantic rejection | Same broad result | No |
| `NEXT_MONTH` with explicit year | Provider accepts; runtime semantic rejection | Same broad result | No |
| Correct kind, non-grounded quote | Provider/runtime pass; grounding rejection | `SOURCE_GROUNDING` / `TIMING_QUOTE_NOT_FOUND` | No |
| Correct quote, runtime-valid wrong kind | All current checks pass | No current failure code; deterministic guard missing | Yes under current implementation |
| Complete canonical object | All current checks pass; server resolves `2026-09` | No failure | Yes |
| Runtime-valid `MONTHS_AFTER_SELECTED` initial create | Diagnostic authorises; resolver rejects state | Application `SCENARIO_REFERENCE_REQUIRED` | No |
| Identical invalid repair | Second sanitised signature identical | Repair identical/invalid/exhausted | No |
| Different invalid repair | Second sanitised signature differs | Repair new-failure/invalid/exhausted | No |
| Valid repair | Runtime/grounding diagnostics pass | `SUCCEEDED` | Provider layer only; simulator not present in test |

## 15. Ranked correction strategies

### 1. Option E — smallest coherent combined correction (recommended)

Use a deliberately narrow combination:

1. Option A: make provider timing alternatives kind-specific and equivalent to the current runtime fields.
2. Add a deterministic quote/kind compatibility guard for the explicitly supported timing grammar so a
   grounded phrase cannot authorise a contradictory kind.
3. Option D: add precise timing-invariant diagnostic codes/paths to the bounded repair.
4. Add one concise successful timing-shape description/example to the tool contract or prompt so repair is
   not dependent on reverse-engineering nullable fields.

Why the combined option is justified rather than automatic: C1D proves three independent gaps—provider
shape, quote/kind enforcement and repair precision. Schema-only correction closes the observed cross-field
failure but still permits a wrong-kind canonical interpretation. Repair-only correction leaves every first
attempt under-constrained. Prompt-only correction remains probabilistic.

This option must remain local until the replacement schema has passed an authorised schema-access test.

### 2. Option A — tighten provider schema only

Strongest single change for the accepted live failure. It makes strict provider acceptance materially closer
to runtime acceptance. It does not prove that a grounded quote agrees with the chosen kind, and it does not
make repair diagnostics explain failures outside schema expressiveness. Nested-alternative compatibility must
be tested with the selected model before a live canonical case.

### 3. Option D — precise repair diagnostics

Improves the existing one bounded retry while preserving fail-closed behavior. It is useful even with a
tighter schema. It cannot prevent the first invalid output and cannot correct a wrong-kind object that current
runtime accepts.

### 4. Option B — prompt clarification only

Small and useful as supplemental guidance. It cannot make a provider-valid invalid shape impossible and is
not an authority boundary. OpenAI's current model guidance recommends Structured Outputs for automatic
schema adherence rather than duplicating the output schema in prose
([official model guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.5)).

### 5. Option C — relax semantic validation

Not recommended. Removing `offsetMonths=1` could remove duplicate encoding for `NEXT_MONTH`, but would alter
the accepted contract and leave other kind-specific null/value combinations unresolved. Relaxing month/year
rules risks transferring more date authority to the provider.

## 16. Version recommendation

No version is changed by C1D. Current versions remain:

```text
fy-conversation-interpretation/2.0.0
fy-conversation-intent/2.0.0
fy-clarification-resolution-prompt/1.0.0
fy-clarification-resolution-schema/1.0.0
fy-interpretation-diagnostic/1.0.0
```

Recommended versions for a separately approved correction:

| Change | Recommended version treatment |
| --- | --- |
| Provider timing schema narrowed to match already-enforced runtime contract | `fy-conversation-intent/2.1.0` if applied alone |
| Interpretation prompt gains explicit timing-shape guidance without meaning change | `fy-conversation-interpretation/2.1.0` |
| Clarification provider timing schema/prompt aligned similarly | clarification schema/prompt `1.1.0` |
| Precise diagnostic codes and precedence | `fy-interpretation-diagnostic/1.1.0` |
| New deterministic quote/kind compatibility rejection | Treat as a semantic-contract breaking change: interpretation intent `3.0.0`; align prompt and clarification contracts to the same major decision |
| A separately named repair instruction is introduced | create `fy-conversation-interpretation-repair/1.0.0` rather than hiding it under “latest” |

The implementation slice should decide one coherent version set before code changes; it must not publish
`2.1.0` and then silently add the breaking guard under that same version.

## 17. Proposed next local implementation slice

Proposed name: **Track C1E — Timing Contract Alignment**.

It would require separate approval and should:

1. preserve a C1D recovery point;
2. freeze a machine-readable timing-invariant table shared by provider-schema generation and runtime tests;
3. replace generic nullable timing with kind-specific provider alternatives;
4. add deterministic quote/kind compatibility for the finite supported timing grammar;
5. add precise safe timing diagnostic codes and mixed-failure precedence;
6. make repair receive those exact codes without values or evaluation answers;
7. add one explicit year-month corpus case and exact field assertions without rewriting frozen C0 history;
8. version prompt/schema/diagnostic contracts explicitly;
9. rerun the full fake, application, database, browser, build and security gates; and
10. stop before any live request.

It must not change date resolution, simulator behavior, supported scenario types, UI, financial context or
the one-repair maximum.

## 18. Proposed future one-case live validation

Only after C1E is approved and locally complete:

```text
Model: gpt-5.6-terra
Reasoning: low
Case: Can I afford a £650 trip next month?
Initial request: 1
Existing repair: at most 1
Maximum estimated spend: US$0.10
Corpus: none
Luna: none
Sol: none
```

Required gates before the request:

- provider disabled/key/model readiness with no network call;
- clean secret and client boundaries;
- selected schema accepted by a separately approved minimal schema-access gate if required;
- local canonical timing object, quote/kind guard and exact £650 simulator proof pass;
- provider enabled only in the isolated evaluation process;
- `store: false`, forced function, no built-in tools and no provider-side state retained.

Stop after the one logical case whether it passes or fails. Do not continue to a corpus automatically.

## 19. Roadmap

```text
Track C0:
Complete — LIVE_PROVIDER ACCEPTANCE FAILED

Track C1A:
Complete — contract v2 locally ready

Track C1B:
Complete — LIVE_PROVIDER ACCEPTANCE FAILED

Track C1C:
Complete — sanitised diagnostics implemented

Canonical Terra diagnostic:
FAILED — timing semantic requirement

Track C1D:
Complete — local timing-contract diagnostic review; correction not implemented

Track C2:
Paused

Phase B2:
Paused
```

