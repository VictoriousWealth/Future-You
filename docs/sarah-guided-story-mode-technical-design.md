# Future You — Sarah Guided Story Mode Technical Design

**Version:** 0.1.0  
**Status:** Proposed for approval; no Track B application code is authorised  
**Prepared:** 2026-08-25  
**Product authority:** `character-led-story-and-human-context-contract.md`  
**Phase:** B1 — explicit deterministic “Play Sarah’s story” demonstration only

## 1. Outcome

Phase B1 adds one explicit guided demonstration in which Sarah explores the frozen £650 trip decision and its existing alternatives.

The emotional movement is:

> Uncertainty → understanding

It is not a recommendation story and does not label one spending choice morally or objectively better.

The experience must work:

- with no OpenAI key or provider call;
- with animation disabled;
- under `prefers-reduced-motion`;
- when every animation is skipped;
- with keyboard and screen-reader navigation; and
- without any new simulator mathematics or scenario type.

## 2. Scope boundary

Phase B1 includes only:

- an explicit “Play Sarah’s story” entry;
- a dedicated Sarah story route/mode;
- deterministic story steps and approved dialogue templates;
- a small avatar state machine for Sarah;
- existing baseline, £650, £500, £400 and October result presentation;
- pause, resume, skip step, skip animation, restart and exit controls;
- reduced-motion static equivalents;
- responsive placement and non-obscuration rules;
- accessibility and visual-regression evidence; and
- offline/no-provider acceptance.

Phase B1 excludes:

- an avatar on Home, Goals, Ask, Benefits or onboarding;
- automatic story playback on normal app entry;
- user avatars, likeness generation, character selection or customisation;
- voice, audio, text-to-speech or lip sync;
- real-user human-context fields or persistence;
- “financial twin” user-facing wording;
- new scenario types, calculations, classifications or recommendations;
- benefit calculations or claims that an opportunity is active;
- live LLM dialogue or provider-generated story text; and
- changes to Sarah’s frozen numbers.

## 3. Entry and route

Recommended route:

```text
/story/sarah
```

Entry is a user-selected action labelled:

> Play Sarah’s story

The action may appear on an approved demonstration entry surface, but Phase B1 must not place an animated Sarah inside the everyday application shell.

### 3.1 Recommended B1 access boundary

The first implementation should expose the route only in the controlled Sarah demonstration environment/account. This avoids using privileged credentials to read Sarah-owned runs for another user and avoids publishing a duplicated financial-result projection.

Broadening the story to every signed-in user or a public landing page would require one separately approved data-delivery choice:

- a sanitised immutable public demo-run projection; or
- a dedicated non-user demonstration store.

Neither is approved in B1. The implementation must not bypass run RLS or use the registration administrative client to serve story data.

If this access restriction is not desired, approval of this design should explicitly select the safe projection model before application code begins.

## 4. Financial authority and story bundle

Story code is a renderer and sequencer, not a calculator.

The server constructs a versioned `SarahStoryBundle` from:

- the canonical Sarah v1 context identity;
- immutable stored baseline and scenario runs created through the existing simulator application use cases;
- existing domain-to-DTO mappers;
- approved scenario labels and assumptions; and
- server-owned dialogue templates.

Conceptual shape:

```ts
type SarahStoryBundle = {
  schemaVersion: "sarah-guided-story/1.0.0";
  storyVersion: "sarah-trip-story/1.0.0";
  contextVersionId: "sarah-v1@2026-09-01";
  baselineRun: BaselineResultDTO;
  scenarios: {
    trip650September: OneOffPurchaseResultDTO;
    trip500September: OneOffPurchaseResultDTO;
    trip400September: OneOffPurchaseResultDTO;
    trip650October: OneOffPurchaseResultDTO;
  };
  steps: readonly SarahStoryStepDTO[];
};
```

The DTO contains JSON-safe presentation values only. Raw `bigint`, domain money, database rows and simulator types cannot enter the browser bundle.

### 4.1 Stored-run prerequisite

The controlled Sarah demo setup must create or retrieve the four scenario runs through existing application operations before story acceptance. Runtime story sequencing reads those immutable runs; it does not fabricate missing outputs.

If a required run is missing, has the wrong context version, fails schema validation or does not match the frozen scenario identity, the route shows a server-owned unavailable state. It must not recalculate in React, substitute a nearby run or fall back to hard-coded financial numbers.

### 4.2 Invariants

For every animation/motion mode:

- the result DTO IDs and values are identical;
- £650 September remains `£900 -> £250`, bills covered, £0 overdraft, restored November 2026, emergency fund February 2027 and significant trade-off;
- the £500 and £400 outcomes remain their existing frozen siblings;
- October remains the existing timing sibling and does not improve the frozen goal dates;
- baseline selection changes view state only; and
- no context, scenario or run is mutated.

## 5. Deterministic story sequence

The sequence is fixed and versioned. A user may skip motion or steps, but dialogue and financial facts do not branch into new outcomes.

| Step | Purpose | Sarah state | Financial view | Approved meaning |
|---|---|---|---|---|
| 0. Ready | Wait for explicit start | `IDLE` | None/intro | Sarah has a money decision to explore |
| 1. Question | Introduce the trip | `CURIOUS` | Current path summary | “Can I afford a £650 trip next month?” |
| 2. £650 impact | Reveal consequences | `UNCERTAIN` | £650 September run | Affordable, with a significant short-term safety-buffer trade-off |
| 3. Explain trade-off | Make the result understandable | `CONCERNED` | £650 facts | Bills remain covered; buffer falls; emergency fund moves later |
| 4. £500 option | Compare a sibling | `THINKING` | £500 September run | Shows changed consequences without calling it better |
| 5. £400 option | Compare another sibling | `SURPRISED` | £400 September run | Shows the smaller effect using stored facts only |
| 6. Wait until October | Move timing | `THINKING` | £650 October run | Pressure moves month; frozen goal dates do not improve |
| 7. Understanding | Summarise choices | `RELIEVED_TO_UNDERSTAND` | Scenario selector + current path | Sarah understands the trade-offs; no choice is prescribed |
| 8. Complete | Offer restart or exit | `COMPLETE` | Last selected result | User controls what happens next |

Skipping a step selects the next deterministic step. Skipping all animation advances to Step 7 with the complete textual summary and all scenario controls available.

## 6. Story state machine

Story playback state and Sarah’s narrative pose are separate.

```ts
type PlaybackState =
  | "READY"
  | "PLAYING"
  | "PAUSED"
  | "STEP_COMPLETE"
  | "STORY_COMPLETE"
  | "EXITED";

type SarahNarrativeState =
  | "IDLE"
  | "CURIOUS"
  | "UNCERTAIN"
  | "CONCERNED"
  | "THINKING"
  | "SURPRISED"
  | "RELIEVED_TO_UNDERSTAND"
  | "COMPLETE";
```

Allowed transitions:

```text
READY -> PLAYING
PLAYING -> PAUSED | STEP_COMPLETE | STORY_COMPLETE | EXITED
PAUSED -> PLAYING | STEP_COMPLETE | STORY_COMPLETE | EXITED
STEP_COMPLETE -> PLAYING | PAUSED | STORY_COMPLETE | EXITED
STORY_COMPLETE -> READY (restart) | EXITED
EXITED -> route exit only
```

Invalid events are ignored safely and do not advance financial selection. Reload starts at `READY` in B1; story progress persistence is not required.

## 7. Server-owned dialogue templates

Dialogue uses versioned template IDs. The browser receives rendered text plus the template ID for audit/test traceability.

Conceptual template set:

```ts
type SarahStoryTemplateId =
  | "SARAH_QUESTION_TRIP_650"
  | "SARAH_RESULT_650_SIGNIFICANT"
  | "SARAH_EXPLAIN_BUFFER_AND_GOAL"
  | "SARAH_COMPARE_500"
  | "SARAH_COMPARE_400"
  | "SARAH_COMPARE_OCTOBER"
  | "SARAH_UNDERSTANDS_OPTIONS"
  | "SARAH_STORY_COMPLETE";
```

Templates may interpolate only allowlisted fields from the selected trusted DTO, such as formatted purchase amount, safety-buffer presentation, bill coverage, overdraft presentation and stored goal dates.

Templates must not say:

- “Sarah should choose £400.”
- “The £650 trip is irresponsible.”
- “Future You recommends cancelling.”
- “The October choice is better.”
- “A workplace benefit will save money.”

No model writes or reorders dialogue in B1.

## 8. Avatar rendering

Sarah is a story illustration, not an application identity or user avatar.

Each narrative state maps to an approved, finite visual asset/pose set. Animation code may interpolate position or pose only; it cannot select financial content.

Recommended rendering boundary:

```text
Server story bundle
  -> client story controller
  -> deterministic state/step reducer
  -> Sarah visual component + trusted result component
```

The story controller cannot import simulator, mapper, persistence, OpenAI, prompt, Sarah context or calendar fixtures.

## 9. Motion controls

Controls are always visible after story start:

- Pause / Resume
- Skip this animation
- Skip to story summary
- Restart story
- Exit story
- Disable animation

Rules:

- Pause freezes decorative and positional motion immediately.
- Text and result cards remain readable while paused.
- Skip this animation completes only the current visual transition and reveals the same step content.
- Skip to story summary reveals the complete static Step 7 state.
- Restart resets step, selection, announcements and Sarah pose to `READY`; it does not recreate runs.
- Exit uses a normal route transition and never traps the user in full-screen mode.
- Disable animation persists only as a local presentation preference in B1; it is not financial or human-context data.
- No financial claim appears in a partially animated/streamed state.

## 10. Reduced-motion equivalent

When `prefers-reduced-motion: reduce` is true:

- walking and travel-path motion are disabled by default;
- transitions use either no animation or a short opacity change within platform guidance;
- Sarah changes between static poses;
- all dialogue, controls, scenario cards and explanations remain present;
- step advancement remains explicit and keyboard operable; and
- the story starts in the same `READY` state rather than autoplaying.

An explicit user choice to enable motion may be offered, but reduced motion remains the default for that session and no essential meaning depends on motion.

## 11. Keyboard and screen-reader behaviour

- “Play Sarah’s story” is a native button or link with an unambiguous accessible name.
- On start, focus moves to the story heading, not the avatar.
- Dialogue is ordinary document text; it is not continuously announced as an assertive live region.
- Step changes update one polite status region with a concise label such as “Step 3 of 8: Understanding the £650 impact.”
- Result cards retain their existing semantic headings and list structure.
- Playback controls are native buttons, reachable in logical order and operable with Enter/Space.
- Pause/Resume uses `aria-pressed` or a single changing accessible name, not both conflicting patterns.
- The avatar asset is decorative when dialogue conveys the same meaning; otherwise its concise alternative text describes only the approved pose, not an inferred emotion of the real user.
- Focus never moves on timer completion.
- Skip, restart and exit preserve predictable focus: summary heading, story heading and originating entry control respectively.
- Escape may offer/perform Exit only when behaviour is visible and does not override browser conventions.

## 12. Responsive placement and non-obscuration

The result card and controls own layout priority. Sarah never uses an unconstrained viewport overlay.

### Phone

- Single-column document flow.
- Dialogue, result card and controls appear in reading order.
- Sarah occupies a bounded illustration region between dialogue and result content.
- Sticky controls, if used, reserve layout space and respect safe-area insets.

### Tablet

- Two regions may be used when width permits: story/character and financial result.
- Either region collapses to document flow before content overlaps.

### Desktop

- Sarah may move within a bounded story stage beside the result panel.
- The stage cannot cross into navigation, result, assumptions or control regions.

### Mechanical non-obscuration rules

- No `position: fixed` avatar over product content.
- The avatar stage has explicit container bounds and `overflow: clip` only for decorative art, never text.
- Controls and result cards have a higher semantic/layout priority than art.
- At 200% and 400% zoom, the layout becomes single-column before overlap.
- Long text increases container height; it is never clipped to preserve animation timing.
- Tests compare bounding boxes for avatar, navigation, dialogue, result cards, assumptions, scenario controls and playback controls and fail on intersection beyond approved contained regions.

## 13. Failure states

### Missing or invalid stored run

Show:

> Sarah’s story is unavailable right now. No financial result has been changed.

Offer Exit and Retry. Do not show an approximate result.

### Asset failure

Render the static text-and-result experience. Avatar image failure cannot block the story.

### Client controller failure

Render the server-provided static story summary where possible. Financial cards remain the trusted server output.

### Provider unavailable

No effect. B1 makes zero provider calls.

## 14. Security and privacy

- Sarah is labelled as a demonstration character.
- Story mode receives no real user's financial context or human-context profile.
- No employer can view story interaction or use it to access personal financial data.
- The route must not use registration administrative credentials.
- Story events may record coarse local/test telemetry only after a separate analytics approval; B1 does not require analytics persistence.
- No hidden reasoning, model response, voice data, uploaded image or biometric data exists.
- Sarah assets and dialogue are committed/versioned product assets, not generated per user.

## 15. Test strategy

### Contract/unit

- Story manifest schema rejects unknown steps, states, templates, runs and fact keys.
- State reducer permits only the transition table above.
- Every step references an approved template and stored run identity.
- Dialogue interpolation rejects unavailable facts.
- Restart and skip never create/recalculate a run.
- Animation preference changes presentation only.
- No story module imports simulator, OpenAI, persistence or context fixtures into the client.

### Stored-run authority

- All five required stored results share Sarah v1 context ancestry.
- £650, £500, £400 and October identities map to the expected immutable runs.
- Sentinel server values render verbatim in the story UI.
- Reloading and restarting do not recalculate or duplicate runs.
- Corrupt/missing run metadata produces the unavailable state.

### Accessibility

- Complete story using keyboard only.
- Pause, skip, restart and exit maintain specified focus.
- Screen-reader landmarks, headings, control names and polite step announcement are stable.
- Reduced-motion mode contains the complete story with no walking animation.
- Animation-disabled mode and reduced-motion mode produce identical financial text/results.
- 200% and 400% zoom retain content and controls without two-dimensional scrolling at narrow widths where WCAG reflow applies.

### Responsive/non-obscuration

- Phone: 390×844 and 414×896.
- Tablet: 768×1024 and 1024×1366.
- Desktop: 1280×800 and 1440×900.
- Long dialogue, largest supported dynamic type and translated-length fixtures.
- Bounding-box assertions prove Sarah never covers navigation, dialogue, result, assumptions, scenario selector or playback controls.

### No-AI and no-new-math

- Provider spy count is zero for story creation, playback, every control and reload.
- Story works with all provider credentials absent.
- Client bundle contains no provider, prompt, simulator, mapper or server-store identifiers.
- Mutation spies prove no financial context, scenario or stored run is written during playback.

## 16. Required visual evidence

Capture at minimum:

- ready state before explicit start;
- £650 result step;
- £500 and £400 comparison steps;
- October timing step;
- paused state with controls;
- complete static summary;
- reduced-motion equivalent;
- animation-disabled equivalent;
- missing-run safe failure;
- phone, tablet and desktop non-obscuration layouts;
- 200%/400% zoom; and
- keyboard focus states.

Visual baselines may be created only with explicit approval under the repository's existing visual-regression policy.

## 17. Completion gate

Phase B1 is complete only when:

- the user explicitly starts Sarah’s story;
- Sarah remains absent from everyday product screens;
- every financial fact comes from the approved stored Sarah runs and server templates;
- all frozen results remain unchanged;
- no story code calculates money, dates, delays or classifications;
- no provider call is made;
- full text/result equivalence exists with motion disabled and reduced motion enabled;
- pause, resume, skip, restart and exit work by keyboard and pointer;
- Sarah cannot obscure product/story controls at supported widths, zoom or long-content fixtures;
- missing assets/runs fail safely without fabricated finance;
- all Slice 1–7 and Track A regressions remain green;
- no human-context persistence is added; and
- no test is skipped.

## 18. Approval decisions requested

Before Track B code begins, approve or amend:

1. The recommended B1 route `/story/sarah`.
2. The controlled-Sarah-demo-only access boundary for B1.
3. The eight-step deterministic sequence and narrative-state names.
4. Runtime reading of pre-created immutable runs with a fail-closed missing-run state.
5. Local-only animation preference with no story-progress persistence.
6. The visual-evidence matrix and explicit approval requirement for new baseline PNGs.

Approval of this document would authorise only Phase B1 implementation. It would not authorise an everyday avatar, public demo projection, human-context schema, voice, customisation or AI-generated dialogue.
