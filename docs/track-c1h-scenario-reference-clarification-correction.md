# Track C1H — Exact Scenario-Reference Clarification Correction

## Status and boundary

Track C1H is a local-only correction to the conversational interpretation boundary. It adds no financial
capability, changes no simulator result and makes no live OpenAI request. Track C2 and Phase B2 remain
paused.

The approved invariant is:

> When one supported follow-up family is proven, its structured value is valid, no unsupported feature is
> present, no selected or explicit scenario can be resolved, and scenario reference is the sole gap,
> `CLARIFY_SCENARIO_REFERENCE` is the only valid interpretation branch.

`AMBIGUOUS` remains valid when the operation itself cannot be reduced safely to an approved exact
clarification category.

## Recovery and versions

The completed C1G state is preserved by the annotated tag:

```text
track-c1g-scenario-reference-diagnostic-complete-2026-08-26
```

It points to commit `b96ffa2c0360d636ef11c166cc268affc61ae87f`. No earlier recovery tag was moved.

Active C1H contracts are:

```text
Interpretation prompt       fy-conversation-interpretation/4.0.0
Interpretation schema       fy-conversation-intent/4.0.0
Interpretation diagnostics  fy-interpretation-diagnostics/3.0.0
Follow-up evidence          fy-supported-follow-up-evidence/1.0.0
Scenario-reference corpus   fy-scenario-reference-corpus/1.0.0
```

Historical v1, v2 and v3 interpretation version constants and schemas remain exported. The v3 timing
policy, v2 clarification-resolution contracts and v1 explanation contracts are unchanged.

## Prompt precedence

Prompt v4 states this order explicitly:

1. `CLARIFY_PURCHASE_AMOUNT`
2. `CLARIFY_PURCHASE_MONTH`
3. `CLARIFY_SCENARIO_REFERENCE`
4. `AMBIGUOUS` only when no exact clarification can be established

It restores the selected/no-selected contrast for `What about £500?` and adds equivalent month and
explanation examples. `Show my current path` remains a selection, not a clarification.

## Bounded server-owned evidence

`follow-up-evidence.ts` implements a deliberately small, deterministic recogniser. It can return only:

- `AMOUNT_CHANGE` with a source-grounded GBP quote and exact decimal-string minor units
- `MONTH_CHANGE` with a timing-contract-v3 semantic object
- `RESULT_EXPLANATION` with an approved target and bounded goal reference
- `SCENARIO_SELECTION` for the explicit current path
- `NONE`
- `MULTIPLE_OR_UNCERTAIN`

Evidence comes from exact GBP parsing, the existing timing parser, approved explanation vocabulary,
bounded follow-up grammar and same-conversation scenario labels. It does not receive financial context,
run results, corpus IDs, answer keys or provider-supplied IDs, and it cannot authorise a simulator call.

The OpenAI adapter sends only the closed evidence family to the provider. Parsed minor units stay on the
server. The current user message remains the source from which a provider must quote the amount or timing.

## Semantic validation and repair

After strict schema validation, the server tests the exact-gap invariant. A non-exact branch in the proven
state fails at:

```text
Stage: BRANCH_SEMANTIC_VALIDATION
Code:  SCENARIO_REFERENCE_CLARIFICATION_REQUIRED
Path:  /interpretation/kind
```

An exact clarification that changes or loses the proven structured value fails with:

```text
Stage: BRANCH_SEMANTIC_VALIDATION
Code:  FOLLOW_UP_EVIDENCE_MISMATCH
Path:  /interpretation/attemptedOperation
```

Diagnostics contain no user text, amount, timing quote, scenario label, financial value or raw provider
output. The existing single repair receives the safe code/path, closed follow-up family, product rule and
minimal prior request state. It does not receive evaluation expectations or the invalid provider object.

If repair repeats the error or changes to another invalid branch, the provider fails closed after attempt
two. No pending state or simulator operation is created.

## Pending-state preservation and resolution

A valid scenario clarification stores:

- original user-message ID
- attempted operation
- current conversation run IDs
- exact parsed amount in integer minor units, where applicable
- timing-contract-v3 semantic timing, where applicable
- approved explanation target and goal reference, where applicable

The historical grounded amount quote remains available for compatibility and traceability, but the new
`amountMinorUnits` value is checked before the amount-change operation executes.

On the next message, the existing narrow scenario-resolution contract resolves only a same-conversation
label/current selection. The application combines that authorised scenario with the preserved structured
follow-up, invokes the existing operation once and clears pending state after success. It does not
reinterpret the original message as a new purchase and does not auto-select a lone unselected scenario.

## Schema impact

The strict provider JSON shape is intentionally unchanged from v3: genuinely ambiguous requests still
need the `AMBIGUOUS` branch. V4 is a semantic-contract version because server-owned conversation state and
evidence now narrow which otherwise-valid branch is authorised. Every provider object remains strict,
requires all declared fields and rejects additional properties.

The application pending-state schema gains optional exact `amountMinorUnits` for historical-record
compatibility. New C1H amount gaps always populate it.

## Corpus and fake modes

`fy-scenario-reference-corpus/1.0.0` contains 19 cases covering selected, explicit, absent, lone-unselected,
multiple-unselected, nonexistent, noisy, unsupported, cross-user, current-path, genuine ambiguity and all
three repair outcomes.

The deterministic fake infrastructure includes selected/no-scenario amount, timing and explanation modes,
genuine ambiguity, correct exact clarifications, repair success, identical repair failure and new repair
failure. Production code contains no corpus ID or complete-message answer-key branch.

## Preserved boundaries

C1H does not change:

- supported intents or unsupported categories
- timing parsing, date resolution or `Europe/London`
- exact money parsing
- simulator mathematics, scenario types or Sarah fixtures
- explanation planning or financial rendering
- Ask UI or visual baselines
- authentication, RLS, ownership, employer or Benefits behaviour

## Proposed live validation — not authorised or run

The proposed next gate is one `gpt-5.6-terra` case at low reasoning:

```text
State:   no pending clarification, scenarios or selection
Message: What about £500?
Expect:  CLARIFY_SCENARIO_REFERENCE / CHANGE_PURCHASE_AMOUNT
Persist: GBP 50000 minor units
Calls:   zero simulator calls
```

Limits would be one logical case, one initial provider request, at most one repair, no more than two
requests and at most US$0.10 estimated spend. It requires separate explicit approval. A pass or failure
must stop immediately without running a corpus, Luna, Sol, Track C2 or Phase B2.

## Known limitations

- The evidence grammar is intentionally conservative. Unrecognised or multi-operation wording can remain
  `AMBIGUOUS` rather than being guessed.
- C1H does not introduce implicit selection when only one unselected scenario exists.
- C1H has local/fake evidence only; Terra v4 behavior is unverified until separately authorised.
- Benefits, pension changes, recurring spending, instalments and other deferred operations remain
  unsupported.
