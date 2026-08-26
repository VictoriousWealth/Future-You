# Track C1C Canonical Terra Live-Diagnostic Evidence

Date: 26 August 2026

Final status: **CANONICAL TERRA DIAGNOSTIC — FAILED**

Overall Track C live-provider acceptance: **FAILED — unchanged**

Terra approval/recommendation: **None**

Track C2: **PAUSED**

Track B Phase B2: **PAUSED**

## 1. Authorised boundary

Exactly one logical case was run:

```text
Can I afford a £650 trip next month?
```

The run was limited to one initial provider attempt, at most one existing repair attempt and a US$0.10 maximum estimated-spend guard. No corpus, explanation case, Luna, Sol or additional Terra case was run.

Recovery tag `track-c1c-sanitised-diagnostics-ready-2026-08-26` preserves the completed C1C implementation at commit `f6d215ae032c1068fe89511571b4480654d2b981`.

## 2. Preflight

Before the request:

- no Next.js development or production server was running;
- no Next.js build process was running;
- disabled readiness reported the authorised key configured, provider disabled, model not configured, provider unreachable and model inaccessible;
- the configured key was absent from `.env.local`;
- the configured key was absent from tracked files, non-ignored repository files, generated artifacts, `.next` and client chunks;
- client chunks contained no server-only simulator/store identifiers;
- the worktree was clean; and
- `git diff --check` passed.

The disabled readiness check made no provider request.

## 3. Configuration

| Setting | Value |
| --- | --- |
| Provider | OpenAI Responses API |
| Model | `gpt-5.6-terra` |
| Reasoning effort | `low` |
| Interpretation prompt | `fy-conversation-interpretation/2.0.0` |
| Interpretation schema | `fy-conversation-intent/2.0.0` |
| Diagnostic contract | `fy-interpretation-diagnostic/1.0.0` |
| Timeout | 12,000 ms |
| Maximum repair attempts | 1 |
| Maximum provider requests | 2 |
| Maximum estimated spend | US$0.10 |
| Function | Forced `submit_conversation_interpretation_v2` |
| Strict function schema | Enabled |
| Parallel tool calls | Disabled |
| Provider storage | `store: false` |
| Built-in tools | None |
| Provider-side conversation state | None |

OpenAI's model documentation confirms that Terra supports the Responses API, function calling, structured outputs and `low` reasoning. The evidence cost uses the published US$2/M input-token and US$12/M output-token rates: <https://developers.openai.com/api/docs/models/gpt-5.6-terra>.

## 4. Outcome

| Field | Result |
| --- | --- |
| Logical cases | 1 |
| Provider requests | 2 |
| Initial application-valid interpretation | No |
| Repair application-valid interpretation | No |
| Selected approved branch | `CREATE_ONE_OFF_PURCHASE` |
| Deepest completed stage | `STRICT_SCHEMA_VALIDATION` |
| Failed stage | `BRANCH_SEMANTIC_VALIDATION` |
| Safe failing path | `/interpretation/timing` |
| Strict-schema validity | True |
| Semantic-contract validity | False |
| Source-grounding validity | Not reached |
| Conversation-state validity | Not reached |
| Application-command authorised | False |
| Simulator calls | 0 |
| Financial-authority violations | 0 |
| Canonical simulator proof | Not run |

The strict envelope, required function and approved top-level branch all succeeded. The frozen application schema then rejected the timing object at its branch-semantic invariant. Because semantic validation failed, amount/timing grounding and conversation-state validation were correctly not attempted.

The deterministic £650 result was not recalculated or claimed as a result of this failed provider turn.

## 5. Attempt diagnostics

### Attempt 1

```text
Attempt: 1
Repair attempt: No
Tool-call status: EXPECTED
Approved branch: CREATE_ONE_OFF_PURCHASE
Strict schema valid: Yes
Semantic contract valid: No
Deepest completed stage: STRICT_SCHEMA_VALIDATION
Failed stage: BRANCH_SEMANTIC_VALIDATION
Diagnostic code: SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION
Safe path: /interpretation/timing
Repair outcome: REQUESTED
Application command authorised: No
Simulator invoked: No
```

### Attempt 2

```text
Attempt: 2
Repair attempt: Yes
Tool-call status: EXPECTED
Approved branch: CREATE_ONE_OFF_PURCHASE
Strict schema valid: Yes
Semantic contract valid: No
Deepest completed stage: STRICT_SCHEMA_VALIDATION
Failed stage: BRANCH_SEMANTIC_VALIDATION
Diagnostic codes:
  - SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION
  - REPAIR_OUTPUT_IDENTICAL_FAILURE
  - REPAIR_OUTPUT_INVALID
  - REPAIR_EXHAUSTED
Safe path: /interpretation/timing
Repair outcome: IDENTICAL_FAILURE
Application command authorised: No
Simulator invoked: No
```

The repair repeated the same safe shape, stage, path and failure signature. No raw timing values were retained, so the evidence does not infer which individual timing member violated the frozen invariant.

## 6. Operational evidence

| Metric | Total |
| --- | ---: |
| End-to-end provider latency | 11,406 ms |
| Input tokens | 4,695 |
| Output tokens | 596 |
| Total tokens | 5,291 |
| Estimated input cost | US$0.009390 |
| Estimated output cost | US$0.007152 |
| Total estimated cost | **US$0.016542** |
| Authorised ceiling | US$0.10 |

The existing provider telemetry aggregates the bounded attempt sequence. Per-attempt latency, tokens, request IDs and cost were not retained, so they are reported as unavailable rather than estimated or fabricated. This does not affect the exact validation-stage evidence, but it is an operational-observability limitation to retain for the next review.

The run stopped after this one logical case. It made no explanation or additional evaluation request.

## 7. Sanitised artifact

Artifact:

```text
artifacts/track-c1c-live-diagnostic/terra-canonical-smoke.json
```

The artifact contains two `fy-interpretation-diagnostic/1.0.0` records and approved aggregate evaluation telemetry.

Automated post-run inspection confirmed it contains none of:

- the original user-message text;
- amount, timing or purpose values;
- raw tool arguments or raw provider output;
- unknown provider strings;
- financial context or account balances;
- work or personal email;
- Company ID;
- API-key bytes or request headers;
- prompts, hidden instructions or provider reasoning.

The pre-existing request-shape summary retains only the literal placeholder `<synthetic corpus message>`; it does not retain the message.

## 8. Post-run containment and security

Immediately after the stopped run:

```text
Provider enabled: no
Selected model: not configured
Evaluation diagnostics: disabled
Provider reachable: no
Model accessible: no
```

The live process ended, removing its runtime secret injection. Post-run checks proved:

- diagnostic prohibited-content scan: pass;
- configured key in tracked files: no;
- configured key in repository files: no;
- configured key in generated artifacts or `.next`: no;
- configured key in client chunks: no;
- Next.js development/production processes retaining the key: 0;
- active Next.js build processes: 0;
- keyless production build: pass;
- client dependency/bundle boundary: pass;
- `git diff --check`: pass before the documentation append.

The replacement key was not revoked because it did not enter an unintended artifact and no revocation instruction was given.

## 9. Interpretation

This result narrows the live failure substantially:

```text
Provider/model/schema transport: Passed
Forced tool selection: Passed
JSON parsing: Passed
Approved branch discrimination: Passed
Strict structural schema: Passed
Timing branch-semantic invariant: Failed
Bounded repair: Repeated the identical failure
Source grounding: Not reached
Application command authorisation: Not reached
Simulator containment: Passed
```

The local frozen timing validator requires a `NEXT_MONTH` interpretation to contain only the approved one-month offset shape. The sanitised artifact intentionally does not retain the returned timing values, so changing the contract based on a guessed offending member would be inappropriate.

## 10. Recommendation — one next step only

Recommend a separately approved **local-only timing-contract diagnostic review** before any further live request.

That review should:

- map each frozen timing semantic invariant to a more specific non-sensitive diagnostic subcode;
- add per-attempt latency/token/cost capture without retaining provider content;
- reproduce the observed `/interpretation/timing` failure classes through deterministic fixtures; and
- propose, but not automatically implement, the smallest prompt/schema/repair change justified by that evidence.

Do not rerun Terra, run a corpus, approve a model or begin Track C2 until that local review is approved and assessed.

## 11. Final roadmap status

```text
Track C0:
Complete — LIVE_PROVIDER ACCEPTANCE FAILED

Track C1A:
Complete — locally ready contract v2

Track C1B:
Complete — LIVE_PROVIDER ACCEPTANCE FAILED at first interpretation gate

Track C1C:
Complete — local diagnostics and one canonical live diagnostic

Canonical Terra diagnostic:
FAILED — timing branch-semantic invariant; identical repair failure

Overall Track C live-provider acceptance:
FAILED — unchanged

Track C2:
Paused

Phase B2:
Paused
```
