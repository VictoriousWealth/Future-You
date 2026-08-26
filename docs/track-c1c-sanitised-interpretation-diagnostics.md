# Track C1C — Sanitised Interpretation Diagnostics

Date: 26 August 2026

Status: **LOCAL IMPLEMENTATION ONLY — NO LIVE OPENAI REQUEST AUTHORISED**

## 1. Purpose

C1C answers one narrow question:

> At exactly which validation stage did a provider attempt fail, and which non-sensitive contract condition was violated?

The public application error remains the existing sanitised `INVALID_OUTPUT` path. C1C adds an evaluation-only observer; it does not change provider decisions, parsing results, retry count, simulation authority or product behaviour.

The failed C1B state is preserved by annotated tag `track-c1b-terra-v2-invalid-output-2026-08-26` at commit `96ee269`. The original C1B JSON artifact is unchanged.

## 2. Correct interpretation of C1B

```text
Model accessible: Yes
Provider schema accepted: Yes
Forced function accepted: Yes
Provider response received: Yes
Application-valid interpretation: No
Repair application-valid interpretation: No
Simulator invoked: No
Financial-authority violation: No
```

C1B failed at the first live interpretation and application-validation gate. It was not an API schema-rejection failure. Its precise application-validation code was unavailable because raw provider output was deliberately not retained and the sanitised observer did not yet exist.

## 3. Frozen behaviour

C1C does not modify:

- `fy-conversation-interpretation/2.0.0`;
- `fy-conversation-intent/2.0.0`;
- either clarification contract;
- exact identifiers or decision order;
- contrastive prompt examples;
- runtime semantic rules;
- one-repair maximum;
- explanation planning;
- server financial rendering;
- Ask UI;
- simulator mathematics;
- evaluation expectations; or
- the supported product scope.

The OpenAI Responses request still supplies one forced strict function, no built-in tools, `parallel_tool_calls: false` and `store: false`. Official OpenAI documentation describes tool choice, parallel-tool-call control, storage control and the response `output` collection used by the adapter: <https://developers.openai.com/api/reference/cli/resources/responses/methods/create>.

## 4. Validation-stage taxonomy

Diagnostic version: `fy-interpretation-diagnostic/1.0.0`

| Stage | Meaning |
| --- | --- |
| `PROVIDER_RESPONSE_RECEIVED` | A provider response reached the adapter. |
| `TOOL_CALL_SELECTION` | The adapter required exactly one call to the forced tool. |
| `TOOL_ARGUMENT_JSON_PARSE` | Tool arguments were parsed as JSON in process memory. |
| `STRICT_SCHEMA_VALIDATION` | The root and branch shape were checked by the frozen runtime schema. |
| `BRANCH_DISCRIMINATOR_VALIDATION` | The branch discriminator was present and recognised. |
| `BRANCH_SEMANTIC_VALIDATION` | Branch-internal invariants were checked. |
| `IDENTIFIER_VALIDATION` | Exact approved identifiers were checked. |
| `SOURCE_GROUNDING` | Quotes were checked against the current approved source. |
| `CONVERSATION_STATE_VALIDATION` | Selected/explicit scenario state was checked. |
| `APPLICATION_COMMAND_AUTHORIZATION` | The typed branch was observed at the application authority boundary. |
| `REPAIR_REQUEST` | The single existing repair was requested. |
| `REPAIR_RESPONSE_VALIDATION` | The repair response passed or failed the same frozen validation. |
| `FINAL_FAILURE` | The bounded attempt sequence ended without an accepted interpretation. |

A diagnostic includes a chronological stage trace, the deepest completed core stage and a nullable failed stage. A successful attempt has no failed stage.

## 5. Closed diagnostic-code inventory

### Tool and JSON

- `REQUIRED_TOOL_CALL_MISSING`
- `UNEXPECTED_TOOL_NAME`
- `MULTIPLE_TOOL_CALLS`
- `TOOL_ARGUMENTS_NOT_JSON`

### Strict schema and identifiers

- `ROOT_ENVELOPE_INVALID`
- `INTERPRETATION_BRANCH_MISSING`
- `INTERPRETATION_BRANCH_UNKNOWN`
- `BRANCH_REQUIRED_FIELD_MISSING`
- `BRANCH_FORBIDDEN_FIELD_PRESENT`
- `FIELD_TYPE_INVALID`
- `ENUM_IDENTIFIER_INVALID`
- `NULL_NOT_ALLOWED`
- `EXTRA_PROPERTY_PRESENT`

### Semantic contract

- `BRANCH_NOT_ALLOWED_IN_CONVERSATION_STATE`
- `SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION`
- `UNSUPPORTED_BRANCH_CONTAINS_COMMAND_FIELDS`
- `CLARIFICATION_KIND_INCOMPATIBLE`
- `EXPLANATION_TARGET_INCOMPATIBLE`
- `SCENARIO_SELECTION_TARGET_INCOMPATIBLE`
- `UNSUPPORTED_CATEGORY_INCOMPATIBLE`

### Source grounding

- `AMOUNT_QUOTE_NOT_FOUND`
- `AMOUNT_QUOTE_NOT_PARSEABLE`
- `TIMING_QUOTE_NOT_FOUND`
- `SCENARIO_LABEL_QUOTE_NOT_FOUND`
- `MODEL_SUPPLIED_UNTRUSTED_SCENARIO_ID`

### Application authorisation

- `SCENARIO_REFERENCE_UNRESOLVED`
- `CROSS_USER_REFERENCE_REJECTED`
- `UNSUPPORTED_OPERATION_REJECTED`
- `APPLICATION_COMMAND_REJECTED`

### Repair

- `REPAIR_OUTPUT_IDENTICAL_FAILURE`
- `REPAIR_OUTPUT_NEW_FAILURE`
- `REPAIR_OUTPUT_INVALID`
- `REPAIR_EXHAUSTED`

The TypeScript tuple is the authoritative closed inventory. Tests prove uniqueness and prove that deterministic fake attempts can produce every code.

## 6. Sanitised record

An evaluation record contains:

```ts
type SanitisedInterpretationDiagnostic = {
  diagnosticVersion: "fy-interpretation-diagnostic/1.0.0";
  evaluationCaseId: string;
  modelId: string;
  promptVersion: string;
  schemaVersion: string;
  attempt: 1 | 2;
  repairAttempt: boolean;
  repairOutcome:
    | "NOT_APPLICABLE"
    | "REQUESTED"
    | "SUCCEEDED"
    | "IDENTICAL_FAILURE"
    | "NEW_FAILURE"
    | "EXHAUSTED";
  selectedToolNameStatus: "EXPECTED" | "MISSING" | "UNEXPECTED" | "MULTIPLE";
  selectedBranchKind: ApprovedDiagnosticBranchKind | "UNKNOWN" | null;
  presentFieldNames: string[];
  stageTrace: { stage: ValidationStage; outcome: "COMPLETED" | "FAILED" }[];
  deepestCompletedStage: ValidationStage;
  failedStage: ValidationStage | null;
  diagnosticCodes: InterpretationDiagnosticCode[];
  jsonPointerPaths: string[];
  strictSchemaValid: boolean;
  semanticContractValid: boolean;
  sourceGroundingValid: boolean | null;
  conversationStateValid: boolean | null;
  applicationCommandAuthorized: boolean;
  simulatorInvoked: false;
};
```

`selectedBranchKind` records only an approved application enum. An unknown provider branch becomes `UNKNOWN`; its text is discarded. Field names are restricted to a fixed allowlist. JSON pointers retain only approved path segments and numeric indexes. Unknown property names are not copied.

No fingerprint of free-text values is produced.

## 7. Deliberately excluded data

Neither a diagnostic record nor its artifact may contain:

- user-message text;
- raw tool arguments or raw model output;
- amount, timing, purpose or scenario-label quotes;
- financial context, balances or goals;
- work/personal email or Company ID;
- prompts or hidden instructions;
- API keys, headers, cookies or authentication data;
- provider prose or reasoning; or
- arbitrary unknown enum/property text.

Raw output may exist transiently in the adapter process for JSON parsing, frozen schema validation and the existing repair. It is not logged, persisted or returned through public DTOs.

## 8. Evaluation-only gate

Diagnostics require both:

```text
OPENAI_EVALUATION_DIAGNOSTICS_ENABLED=true
```

and explicit construction of an evaluation collector by the server-only evaluation harness. The flag defaults to `false` and is documented only as a server/evaluation variable.

The flag:

- is not `NEXT_PUBLIC_*`;
- is not read from a browser request;
- is not exposed by an API route;
- does not alter provider input or model behaviour;
- does not change validation decisions or retries; and
- is insufficient on its own to make ordinary production turns persist diagnostics.

The ordinary application retains only its existing failure category, attempt count and correlation metadata.

## 9. Repair integration

The repair policy remains one attempt with the same model and the same strict v2 schema. Its machine-readable validation-error list now uses only the closed diagnostic codes and safe JSON-pointer paths.

The repair continues to exclude expected evaluation answers, full corpus definitions, financial context, simulator results and secrets. It does not create a conversation message or simulation run. The evaluation diagnostic distinguishes:

- repair requested;
- repair succeeded;
- identical failure;
- new failure; and
- exhausted invalid repair.

## 10. Deterministic fake coverage

Low-level fake provider fixtures cover:

- missing, unexpected and multiple tool calls;
- invalid JSON;
- invalid/missing root and branch discriminators;
- missing, null, mistyped, extra and forbidden fields;
- invalid exact identifiers;
- incompatible branch semantics and clarification kinds;
- incompatible explanation/selection identifiers;
- ungrounded/unparseable amount, timing and scenario-label quotes;
- invented scenario IDs;
- unresolved or state-incompatible scenario references;
- cross-user and unsupported-operation rejection;
- successful repair;
- identical repair failure;
- different repair failure; and
- exhausted invalid repair.

Additional schema-valid synthetic outputs represent plausible live failure classes without claiming to reproduce the unknown C1B output.

## 11. Proposed one-case diagnostic smoke — not authorised

After C1C local approval, request separate human authorisation for exactly one Terra diagnostic smoke:

```text
OPENAI_MODEL=gpt-5.6-terra
OPENAI_REASONING_EFFORT=low
OPENAI_EVALUATION_DIAGNOSTICS_ENABLED=true
Maximum estimated spend: US$0.10
```

Question:

> Can I afford a £650 trip next month?

Permit one initial request and the existing one repair only. Capture the sanitised stage/code/path/shape metadata, token use, latency and estimated cost. Capture no raw text, values, prompts or reasoning.

If it passes, stop. If it fails, report the precise sanitised diagnostic and stop. Do not run a corpus and do not change the prompt or schema during the smoke.

## 12. Roadmap stop

```text
Track C0:
Complete — LIVE_PROVIDER ACCEPTANCE FAILED

Track C1A:
Complete — locally ready contract v2

Track C1B:
Complete — LIVE_PROVIDER ACCEPTANCE FAILED at first interpretation gate

Track C1C:
Approved — local sanitised diagnostics only

Track C2:
Paused

Phase B2:
Paused
```
