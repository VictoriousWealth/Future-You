# Track C1G Scenario-Reference Clarification Diagnostic

Date: 27 August 2026  
Status: **LOCAL DIAGNOSTIC — CORRECTION NOT IMPLEMENTED**  
Live OpenAI requests: **PROHIBITED / 0 MADE**  
Track C2: **PAUSED**  
Track B Phase B2: **PAUSED**

## 1. Accepted C1F failure

Track C1F stopped on its fourth critical case. Terra returned a structurally and semantically valid
`AMBIGUOUS / UNCLEAR_SUPPORTED_ACTION` branch where the frozen product contract required
`CLARIFY_SCENARIO_REFERENCE`.

The result was application-safe but contract-incorrect:

- the simulator was not authorised or invoked;
- no cross-user reference was accepted;
- no model-authored financial value crossed the boundary;
- no repair occurred; and
- fail-fast prevented every later critical, frozen-corpus and expanded-corpus request.

The C1F report and four sanitised artifacts are unchanged. Annotated tag
`track-c1f-terra-v3-clarification-failure-2026-08-26` preserves the exact accepted C1F state at commit
`5e8b709d6356f1787d782c313ee42183854c3cc1`.

## 2. Exact synthetic case and provider state

The case is repository-owned synthetic evaluation data, not user financial data.

| Field | Exact value |
| --- | --- |
| Corpus version | `fy-conversation-evaluation/2.0.0` |
| Case ID | `missing-active-scenario` |
| Origin/category | `FROZEN_C0` / `CLARIFICATION` |
| User message | `What about £500?` |
| Provider method | `INTERPRET` |
| Pending clarification | None |
| Available scenarios | Empty array |
| Available user-facing labels | None |
| Selected scenario | No |
| Selected scenario type | `null` |
| Trusted date | `2026-08-24` |
| Timezone | `Europe/London` |
| Expected branch | `CLARIFY_SCENARIO_REFERENCE` |
| Expected clarification identifier | `SCENARIO_REFERENCE` |
| Expected source-grounded amount | `£500` |
| Simulator invocation allowed | No |

The live evaluation harness supplied exactly this interpretation request:

```ts
{
  userMessage: "What about £500?",
  pendingClarification: null,
  availableScenarios: [],
  selectedScenarioType: null,
  trustedDate: "2026-08-24",
  timezone: "Europe/London"
}
```

The initial Responses API call serialises this full request. It did not use the repair-only `minimalState`
projection. No raw live provider arguments are reconstructed or retained here.

## 3. Normative distinction

### `CLARIFY_SCENARIO_REFERENCE`

This branch applies when all of the following hold:

1. The apparent operation is supported: amount change, month change, stored-result explanation or scenario
   selection.
2. The operation requires an existing scenario or run.
3. No selected scenario and no valid explicit scenario reference can be resolved.
4. The only material gap is which purchase/scenario/result the user means.

It must preserve the attempted operation and any already source-grounded amount, timing or explanation target
so the next turn resolves only the missing scenario reference.

Examples include:

```text
What about £500?
What if I wait until October?
Why did it delay my goal?
```

when no selected or explicitly referenced scenario is resolvable.

### `AMBIGUOUS`

This branch applies only when the operation itself remains unclear and the uncertainty cannot be reduced to
one of the three exact product gaps:

- `PURCHASE_AMOUNT`;
- `PURCHASE_MONTH`; or
- `SCENARIO_REFERENCE`.

For example, `Could you compare that somehow?` with no usable operation or parameter evidence is genuinely
ambiguous. `AMBIGUOUS` is not a generic safe fallback for a recognised scenario-dependent follow-up.

During resolution of an already pending scenario-reference clarification, an unrecognised reply may validly
return `AMBIGUOUS / UNRECOGNISED_SCENARIO_REFERENCE`; that preserves the existing pending gap. This is distinct
from the initial interpretation failure in C1F, where the server had not yet created the exact pending gap.

## 4. Provider-context completeness

The request provides enough authoritative scenario state to answer:

- whether a selected scenario exists, through `selectedScenarioType` and each scenario's `selected` flag;
- whether any scenario exists, through `availableScenarios.length`;
- which user-facing labels may be referenced, through `availableScenarios[].label`; and
- whether the user is answering a pending clarification, through `pendingClarification`.

For the failed case these values unambiguously say that no scenario exists. The failure is therefore **not**
caused by omitted or incorrect scenario-state data.

The request does not contain a server-owned symbolic field saying that the message appears to be an amount
follow-up. That classification remains provider work derived from the raw message and prompt. Consequently:

- Terra had enough information to choose the correct branch; but
- after Terra chose generic ambiguity, the server had no independent operation-family evidence attached to
  that branch with which to prove the more exact clarification.

Adding balances, goals, employer data, simulation results or full financial context would not help and would
violate data minimisation.

## 5. State-by-branch matrix

| Message type | Active/selected scenario | Valid explicit reference | Expected result |
| --- | --- | --- | --- |
| Amount follow-up | Yes | No | `CHANGE_PURCHASE_AMOUNT` |
| Amount follow-up | No | Yes | `CHANGE_PURCHASE_AMOUNT` |
| Amount follow-up | No | No | `CLARIFY_SCENARIO_REFERENCE` |
| Month follow-up | Yes | No | `CHANGE_PURCHASE_MONTH` |
| Month follow-up | No | Yes | `CHANGE_PURCHASE_MONTH` |
| Month follow-up | No | No | `CLARIFY_SCENARIO_REFERENCE` |
| Explanation request | Yes | No | `EXPLAIN_SELECTED_RESULT` |
| Explanation request | No | Yes | `EXPLAIN_SELECTED_RESULT` |
| Explanation request | No | No | `CLARIFY_SCENARIO_REFERENCE` |
| Explicit current-path selection | Any | `CURRENT_PATH` | `SELECT_EXISTING_SCENARIO` |
| Scenario selection with unresolvable label | No | Invalid/ambiguous | `CLARIFY_SCENARIO_REFERENCE` |
| Pending scenario-reference answer with recognised label/current path | As persisted | Yes | `RESOLVE_SCENARIO_REFERENCE` |
| Pending scenario-reference answer with no recognisable reference | As persisted | No | `AMBIGUOUS / UNRECOGNISED_SCENARIO_REFERENCE` |
| Genuinely unclear operation | Any | None | `AMBIGUOUS / UNCLEAR_SUPPORTED_ACTION` |
| Unsupported or security-sensitive operation | Any | Any | Exact `UNSUPPORTED` category |

An available but unselected scenario without a label in the current message is not an implicit active
scenario. It therefore follows the same exact-clarification rule as an empty scenario list.

## 6. Layer-by-layer trace

| Layer | Information/definition | Current enforcement and finding |
| --- | --- | --- |
| 1. Interpretation policy | Defines exact intents and says `AMBIGUOUS` is only for a request that is not a defined missing-field or unsupported case. | Normative distinction is correct. |
| 2. Intent enum | Contains both `CLARIFY_SCENARIO_REFERENCE` and `AMBIGUOUS`. | Vocabulary is closed, but enum membership cannot express precedence. |
| 3. Clarification enum | Includes exact `SCENARIO_REFERENCE`; branch-to-template mapping is canonical. | Correct and enforceable after the exact branch is selected. |
| 4. Ambiguity identifiers | Includes `UNCLEAR_SUPPORTED_ACTION` and `UNRECOGNISED_SCENARIO_REFERENCE`. | Both are closed; no rule prevents the former when an exact initial gap exists. |
| 5. Runtime/Zod schema | Discriminated union accepts both complete branch shapes. | Both C1F outputs are structurally valid. |
| 6. Provider JSON Schema | Static `anyOf` includes both branches for every initial interpretation request. | Both are provider-valid regardless of conversation state. |
| 7. Interpretation prompt v3 | Lists exact IDs and says amount/month changes without a selected or explicit scenario should clarify the scenario reference. | Direction is present but does not explicitly repeat the exact branch in a contrastive example. |
| 8. Prompt decision order | Unsupported → selection → explanation → amount/month scenario rule → new purchase → help/greeting. | Scenario precedence appears before generic fallback, but v3 has no final explicit “exact clarification beats ambiguity” rule. |
| 9. Contrastive examples | V3 contains timing-shape examples. | The v2 `What about £500?` active/no-active contrast and explicit ambiguity exclusion were dropped in v3. |
| 10. Provider context summary | Sends raw message, pending state, available labels/selection, trusted date and timezone. | Scenario state is complete; no symbolic operation-family evidence is supplied. |
| 11. Selected-scenario representation | Selected flag plus `selectedScenarioType`. | Correctly represents no selected scenario in C1F. |
| 12. Available-scenario representation | User-facing label, symbolic type and selected flag only. | Empty list correctly represents no existing scenario; no IDs or financial results are exposed. |
| 13. Branch semantic validator | Validates branch fields, timing, identifiers and source-grounded quotes. | `AMBIGUOUS` has no exact-clarification precedence invariant. |
| 14. Application-command authorisation diagnostic | Rejects unsupported, invalid timing and unresolved selected/explicit references. | Marks every valid non-unsupported branch—including `AMBIGUOUS`—as authorised. |
| 15. Pending-clarification creation | Exact branch stores `SCENARIO_REFERENCE`, attempted operation and grounded details. | Generic ambiguity creates no new pending gap when none existed. |
| 16. Server clarification templates | Exact branch renders `What purchase would you like me to compare?`; ambiguity renders a generic supported-action question. | Both are safe, but only the exact template preserves the intended continuation. |
| 17. Evaluation corpus | Frozen C0 expects exact branch, exact identifier, grounded amount and no simulator. | Corpus matches the approved product contract; it is not the defect. |
| 18. Fake-provider behavior | Normal deterministic fake routes the three recognised no-scenario follow-ups to the exact branch. | Correct path exists; C1G test fixtures additionally reproduce the currently accepted generic branch. |
| 19. Repair eligibility | Repair occurs only for `INVALID_OUTPUT` from tool/schema/runtime or deterministic timing validation. | Generic ambiguity passes all validators, so no repair is eligible. Evaluation mismatch is detected after provider return. |

## 7. Schema-valid overlap analysis

C1G test-only fixtures enumerate amount, timing and explanation follow-ups across four scenario states:

1. selected scenario;
2. available unselected scenario with a valid explicit label;
3. available unselected scenario without an explicit label; and
4. no scenarios.

For all 12 message/state combinations, both candidate outputs currently pass provider branch availability,
runtime schema and the sanitised semantic/state pipeline:

```text
CLARIFY_SCENARIO_REFERENCE
AMBIGUOUS / UNCLEAR_SUPPORTED_ACTION
```

Both reach `APPLICATION_COMMAND_AUTHORIZATION` with `applicationCommandAuthorized: true`. This overlap is
wider than the C1F failure:

- in states 3 and 4, the exact clarification is normative and generic ambiguity is wrong;
- in states 1 and 2, a supported follow-up is normative, so both clarification and ambiguity are wrong.

The same static schema also permits other branches. Representative enumeration proves:

- a supported follow-up with a selected scenario is accepted;
- the exact clarification is accepted without a scenario;
- generic ambiguity is accepted without a scenario;
- exact unsupported output is safely non-authorised;
- a supported follow-up claiming `SELECTED_SCENARIO` without one is rejected at conversation-state validation;
- explicit current-path selection is accepted; and
- explanation with a selected scenario is accepted.

The validator therefore enforces scenario-reference *claims* when a supported branch is selected, but does not
enforce which high-level branch must win for the message and state.

## 8. Local reproduction and application consequence

Test-only fixture coverage reproduces:

- amount follow-up without a scenario → generic `AMBIGUOUS` accepted;
- timing follow-up without a scenario → generic `AMBIGUOUS` accepted;
- explanation request without a run → generic `AMBIGUOUS` accepted;
- the same three messages → correct `CLARIFY_SCENARIO_REFERENCE` accepted; and
- a genuinely unclear message → generic `AMBIGUOUS` accepted correctly.

The mocked OpenAI Responses adapter returns each generic branch in one response. With the existing maximum of
one repair configured, each result completes after exactly one provider attempt and records
`repairOutcome: NOT_APPLICABLE`.

At the application layer:

- exact clarification renders the scenario-reference template, stores a structured pending clarification and
  preserves the attempted operation;
- generic ambiguity renders `SUPPORTED_ACTION`, stores no new pending clarification and loses the grounded
  follow-up continuation; and
- neither path invokes the one-off-purchase simulator.

These are tests of current behavior only. No production prompt, schema, validator, application or provider
behavior changed in C1G.

## 9. Why no repair occurred

The OpenAI adapter repairs only after a typed `INVALID_OUTPUT` failure. The C1F output passed:

1. forced-tool selection;
2. JSON parsing;
3. strict provider/runtime schema;
4. branch discriminator and identifiers;
5. branch semantic validation;
6. source grounding as not applicable;
7. conversation-state validation; and
8. application-command authorisation.

`successfulInterpretationDiagnostic` contains no rule that compares generic ambiguity with a deterministically
available exact clarification. It returned no failed stage or diagnostic code. The evaluation runner then
noticed the frozen branch mismatch, outside the provider's repair loop.

A code such as `GENERIC_AMBIGUITY_WHEN_EXACT_CLARIFICATION_AVAILABLE` is appropriate only if server-owned
logic can prove both the supported operation family and that scenario reference is its sole missing field.
`SCENARIO_REFERENCE_CLARIFICATION_REQUIRED` could then be a narrower companion or user-facing internal reason.
Neither code should use corpus IDs or expected answers.

## 10. Root-cause conclusion

The failure has four contributing causes:

1. **Prompt regression in specificity:** v3 retained the general decision rule but dropped v2's exact active/no-
   active `What about £500?` contrast and its explicit restriction on `AMBIGUOUS`.
2. **Static branch overlap:** provider and runtime schemas always expose both generic ambiguity and exact
   clarification.
3. **Missing production invariant:** runtime semantics do not reject generic ambiguity when an exact gap is
   provable.
4. **No independent operation-family proof:** when the provider returns `AMBIGUOUS`, the branch carries no
   source-grounded follow-up details, and production code has no bounded server-owned recogniser to establish
   that the message is an amount, timing or explanation continuation.

The conversation-state payload itself is correct and sufficient about scenario existence/selection. The
frozen corpus expectation matches the approved product contract. The model's choice exposed a contract gap;
it is not sound to classify the model alone as the root cause.

## 11. Ranked correction strategies

| Rank | Option | Assessment |
| ---: | --- | --- |
| 1 | **E — small combined correction** | Recommended: restore explicit prompt precedence/examples and add a narrow server-owned runtime invariant plus precise repair diagnostic. This makes the rule testable and model-independent without pre-routing a result. |
| 2 | **C — runtime semantic invariant only** | Strong authority boundary, but incomplete until the server has safe, bounded operation-family evidence and repair guidance. |
| 3 | **A — prompt precedence/examples only** | Smallest textual change and likely improves Terra, but leaves the application accepting the same wrong branch. Not sufficient for the product invariant. |
| 4 | **B — state-specific provider schema** | Scenario state alone cannot distinguish a recognised follow-up from genuine ambiguity. Multiple schema variants add maintenance cost without eliminating this overlap. |
| 5 | **D — deterministic routing before the model** | Can remove model choice, but risks growing an ad hoc second intent classifier and bypasses useful structured interpretation. |

## 12. Recommended minimal correction

Use a narrowly scoped Option E in a separately approved correction slice:

1. Restore explicit prompt precedence: exact missing-field branches take precedence over `AMBIGUOUS`.
2. Restore contrastive amount, timing and explanation examples with and without a selected/explicit scenario.
3. Add a bounded, application-owned follow-up-evidence function for only the three approved scenario-dependent
   families. It may use existing exact amount/timing parsers, approved follow-up cues and explanation cues; it
   must return `UNKNOWN` whenever evidence is not decisive.
4. Use that evidence only to reject `AMBIGUOUS` when the server proves that scenario reference is the sole gap.
   Do not directly simulate or silently rewrite the provider result.
5. Emit `GENERIC_AMBIGUITY_WHEN_EXACT_CLARIFICATION_AVAILABLE` and permit the existing single bounded repair.
6. If repair still fails, return the existing typed interpretation failure; never guess or route by corpus ID.
7. Keep genuine ambiguity and pending-clarification ambiguity valid.

The evidence recogniser must be general and source-grounded. It must not contain literal corpus messages,
case IDs, simulator values or evaluation answers.

## 13. Required version changes if approved

Recommended versions for a correction:

| Contract | Current | Proposed |
| --- | --- | --- |
| Interpretation prompt | `fy-conversation-interpretation/3.0.0` | `fy-conversation-interpretation/4.0.0` |
| Interpretation schema/runtime contract | `fy-conversation-intent/3.0.0` | `fy-conversation-intent/4.0.0` |
| Sanitised diagnostic | `fy-interpretation-diagnostic/2.0.0` | `fy-interpretation-diagnostic/3.0.0` |
| Scenario-reference diagnostic corpus | None | `fy-scenario-reference-clarification/1.0.0` |
| Timing policy | `fy-conversation-timing-policy/1.0.0` | Unchanged |
| Clarification-resolution prompt/schema | `2.0.0` | Unchanged |
| Explanation prompt/schema | `1.0.0` | Unchanged |

The structural provider JSON Schema may remain shape-compatible, but the interpretation schema/runtime version
should still advance because branch acceptance semantics change. Historical C1E/C1F artifacts remain bound to
v3 and diagnostic v2.

## 14. Proposed local correction slice

A separately approved C1H-style local correction should:

1. freeze the C1G diagnostic state;
2. define the bounded follow-up-evidence contract and false-positive cases before code;
3. implement prompt v4, semantic contract v4 and diagnostic v3;
4. add the new diagnostic to repair guidance without including an evaluation answer;
5. prove exact amount, timing and explanation scenario gaps;
6. prove genuine ambiguity, unsupported requests, new purchases and pending clarifications remain unchanged;
7. prove wrong generic ambiguity is rejected even if the model selects it;
8. prove one repair can return the exact branch and repeated ambiguity fails closed;
9. rerun frozen C0, expanded v2/v3, fake evaluation and the full regression gate; and
10. make zero live provider requests.

No simulator, Ask UI, Sarah data, employer/Benefits data or supported capability should change.

## 15. Proposed later one-case live validation

After a local correction is separately approved and completed, propose one Terra case only:

```text
What about £500?
```

Use the exact C1F no-scenario state, `gpt-5.6-terra`, low reasoning, one initial request, at most one existing
bounded repair, no explanation request and no simulator call. Acceptance requires the final exact
`CLARIFY_SCENARIO_REFERENCE` branch, `SCENARIO_REFERENCE` template/pending state, preserved source-grounded
`£500`, no financial-authority violation and clean post-run containment.

Proposed maximum estimated spend: **US$0.10**. This is a proposal only; no live request is authorised by C1G.

## 16. Roadmap state

```text
Track C0: Complete — LIVE_PROVIDER ACCEPTANCE FAILED
Track C1A: Complete — interpretation contract v2
Track C1B: Complete — LIVE_PROVIDER ACCEPTANCE FAILED
Track C1C: Complete — sanitised diagnostics
Track C1D: Complete — timing diagnosis
Track C1E: Complete — timing contract v3
Canonical Terra v3 timing smoke: PASSED
Track C1F: Complete — TERRA V3 LIVE ACCEPTANCE FAILED at exact scenario-reference clarification gate
Track C1G: Complete — local scenario-reference clarification diagnostic; no correction or live request authorised
Track C2: Paused
Phase B2: Paused
```

The official OpenAI Responses API documents the custom function, `tool_choice`, strict-function,
`parallel_tool_calls` and `store` controls retained by Future You:
<https://developers.openai.com/api/reference/cli/resources/responses/methods/create>.
