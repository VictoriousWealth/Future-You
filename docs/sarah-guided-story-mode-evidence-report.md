# Future You — Track B Phase B1 Evidence Report

**Feature:** Sarah Guided Story Mode
**Story contract:** `sarah-guided-story/1.0.0`
**Story ID/version:** `sarah-trip-story/1.0.0`
**Narrative templates:** `sarah-trip-narrative/1.0.0`
**Implementation date:** 2026-08-25
**Scope:** B1 only; Phase B2 has not started

## 1. Outcome

Future You now has an explicit `Play Sarah’s story` action for the canonical Sarah demonstration identity. `/story/sarah` presents a deterministic uncertainty-to-understanding journey using Sarah’s existing immutable £650, £500, £400 and October what-if runs.

The feature does not add simulator behaviour, calculate money in the browser, call a conversation/model provider, persist story progress, or place Sarah on ordinary Home, Goals, Ask, Benefits or onboarding screens.

## 2. Recovery boundary

Before B1 application code, the registration-compliant Track A state was preserved at:

- Commit: `ba5a83c` — `feat(registration): complete employer-provisioned access`
- Annotated tag: `mvp-rc-employer-registration-2026-08-25`

The earlier controlled-demo reference remains `mvp-rc-controlled-demo-2026-08-25`.

## 3. Implementation map

### Application and contract

- `src/application/story/contracts.ts` — JSON-safe story, scenario, step and load-result contracts.
- `src/application/story/application.ts` — stored-run validation, allowlisted template interpolation and minimum story projection.
- `src/server/sarah-story-contract.ts` — versioned server-only manifest, exact run identities and frozen expected facts.
- `src/server/sarah-story-application.ts` — authenticated Sarah entitlement, owner-scoped persistence adapters and story composition.

### Route and presentation

- `src/app/story/sarah/page.tsx` — dynamic server route and fail-closed access boundary.
- `src/app/story/sarah/not-found.tsx` — non-enumerating anonymous/foreign-user response.
- `src/ui/features/story/sarah-story-machine.ts` — explicit presentation-only reducer.
- `src/ui/features/story/sarah-story-character.tsx` — decorative inline SVG Sarah poses.
- `src/ui/features/story/sarah-story-experience.tsx` — story renderer, controls, result cards and static equivalents.
- `src/app/globals.css` — bounded story stage, responsive flow, motion and reduced-motion treatment.

### Entry, fixtures and enforcement

- The Home surface schema is `home-surface/1.1.0` and contains a server-authoritative `guidedStory` availability union.
- Only the exact Sarah demo identity, demo flag and Sarah v1 current context make the Home story action available.
- `src/proxy.ts` applies private/no-store and no-index headers to the story route.
- The generated local seed creates the four story runs through existing application use cases before serialising their immutable persistence rows.
- No database migration or story-progress table was added.
- Dependency tests prohibit story presentation imports from simulator, fixtures, infrastructure, server, provider and mapper modules.

## 4. State-machine report

The controller states are:

```text
NOT_STARTED
INTRODUCTION
MEET_SARAH
DECISION_SETUP
QUESTION
CALCULATING
TRIP_RESULT
ALTERNATIVES
TIMING_ALTERNATIVE
OPPORTUNITY_INFORMATION
SUMMARY
COMPLETE
PAUSED
ERROR
```

`START`, `NEXT`, `SKIP_STEP`, `SKIP_ANIMATION`, `SKIP_TO_SUMMARY`, `PAUSE`, `RESUME`, `RESTART`, `SET_ANIMATION_DISABLED` and `FAIL` are explicit reducer events. Pause retains the exact resume state. Restart returns to `NOT_STARTED`. Refresh also returns to `NOT_STARTED`; B1 progress is intentionally ephemeral.

Scenario selection inside the story is derived from the current server-authored step. Motion timing never changes a run or financial selection.

## 5. Sarah-data provenance

Only these profile facts are shown:

| Fact | Value | Provenance | Simulation effect |
|---|---|---|---|
| Name | Sarah Wonk | Canonical demonstration identity | None |
| Age | 25 | Existing canonical demographic/context fact | None |
| Location | Manchester | Existing canonical demographic/context fact | None |
| Work | Customer Insights Analyst at OniBank | Existing canonical demographic/context fact | None |

The supplied HTML prototype was audited but its additional biography was not imported. Education, living arrangements, career history, additional loans, spending habits, financial confidence, personal quotes, personality and aspirations remain unsupported/unverified for B1.

## 6. Financial-authority report

The server requires:

| Story option | Scenario ID | Run ID | Payment month |
|---|---|---|---|
| £650 trip | `scenario-d3cae357a08bfdfb` | `run-19b9e20a1ed382dc` | 2026-09 |
| £500 option | `scenario-2fe8f14464ecd680` | `run-3b1f93a202af641a` | 2026-09 |
| £400 option | `scenario-d3ba6039de278c53` | `run-84e655ad5797d8d2` | 2026-09 |
| Go in October | `scenario-cb9d2532d9a6a729` | `run-3728df098b2960e5` | 2026-10 |

Every run must also match:

- Sarah context `sarah-v1@2026-09-01`
- Baseline `baseline-ec13101a3fe66f17`
- Rules `fy-sim/1.0.0`
- Calendar `govuk-england-and-wales-2026-2028@2026-08-23`
- Its exact scenario amount/month/classification and frozen display facts

Missing, altered or incompatible facts return the server-owned unavailable result. Story playback reads runs and does not create or update them. The browser receives display-ready strings, story metadata and presentation state only; it receives neither the Sarah ledger nor raw money/minor-unit/domain objects.

Sentinel renderer tests prove server-returned values are displayed verbatim. Animation, reduced motion, skipping and restart all retain an identical scenario payload.

## 7. Access-control report

Access requires all of:

- authenticated principal ID `11111111-1111-4111-8111-111111111111`;
- `profiles.is_demo = true`;
- current context `sarah-v1@2026-09-01`; and
- ordinary active-account enforcement.

Anonymous and non-Sarah users receive the same 404/not-found presentation. The browser cannot supply an owner or context ID. Runs are loaded through the request-scoped Supabase client and existing owner-scoped run store, so ordinary processing has no administrative credential or RLS bypass. Tests also prove that knowing Sarah’s run ID does not allow Alex to retrieve it.

The route is dynamic, has revalidation disabled, emits `Cache-Control: private, no-store, max-age=0`, and emits `X-Robots-Tag: noindex, nofollow`.

## 8. Character-asset inventory

| Asset | Source and approval | Format | States/poses | Treatment | Responsive suitability |
|---|---|---|---|---|---|
| Sarah prototype vector | User-supplied `/Users/efeon/Downloads/index_3.html`; use approved for this repository as part of B1. No separate third-party attribution or licence notice was present in the supplied file. | Repo-native inline SVG React component | Idle, curious, uncertain/concerned, thinking, surprised, relieved and complete face states; bounded position states and walk-cycle limbs | Decorative, `aria-hidden`, non-focusable and `pointer-events: none`; all meaning is duplicated in ordinary text | SVG scales without raster loss and is constrained to a layout-owned stage at 360, 414, 768 and 1440 widths |

The prototype is not embedded as a page. Its visual warmth, flat vector Sarah, limited expressions and positional movement were retained. Its unsupported profile copy, full-page layout, implicit autoplay assumptions and any unverified financial claims were intentionally excluded.

Because the character is compiled as inline product vector markup rather than fetched as a runtime image, there is no remote/missing-image dependency. Browser evidence also removes the character node and verifies the complete summary and controls remain usable.

## 9. Motion and accessibility report

- Playback begins only after the native `Play Sarah’s story` control is activated.
- Pause/resume, skip step, skip animation, skip to summary, restart, disable/enable animation and exit are visible native controls.
- Controls wrap in normal document flow; they are not sticky overlays.
- Start, restart and summary operations move focus to the relevant heading; step progression has a concise polite live announcement.
- Sarah is decorative, cannot receive focus, and cannot intercept pointer input.
- `prefers-reduced-motion` removes walking/limb motion while keeping every step and result.
- The locally stored animation preference contains no financial/profile/story-progress data.
- A removed character, reduced motion and disabled animation retain complete text and financial evidence.
- The skip link, semantic headings, regions, lists and native controls provide an equivalent keyboard/screen-reader path.

## 10. Responsive report

Automated geometry checks cover 360×800, 414×896, 768×1024 and 1440×900. They fail when Sarah, playback controls or the trusted evidence region overlap, and they enforce no horizontal page overflow.

The same checks cover 200% text, the 360 CSS-pixel reflow width corresponding to a 1440-pixel display at 400% browser zoom, and a deliberately long dialogue fixture. Story controls wrap instead of scrolling sideways, long content grows vertically and result cards remain in document flow.

## 11. Visual evidence and prototype comparison

Review captures are in `artifacts/track-b1-visual/`. They include entry, Meet Sarah, decision setup, pause, £650 result, amount alternatives, October timing, opportunity boundary, summary, reduced motion, all four approved viewport widths, 200% text, 400% reflow-equivalent width and long dialogue.

These files are review evidence, not `toHaveScreenshot` visual-regression baselines. No B1 baseline was silently accepted or updated.

Preserved from the prototype:

- the warm, flat vector Sarah treatment;
- a visible character-led story rather than a static dashboard walkthrough;
- finite expression changes and movement between narrative positions; and
- the uncertainty-to-understanding emotional arc.

Intentionally changed:

- real stored-run result cards replace prototype-only financial display values;
- the avatar stays inside a bounded semantic layout rather than roaming over the viewport;
- explicit playback and accessibility controls precede the story content in document flow;
- all profile details are provenance-audited; and
- opportunities are described only as unconfirmed information, never calculated cash.

## 12. Provider-zero report

B1 imports no OpenAI adapter, conversation provider, prompt or fake provider. The server story path composes owner-scoped stored-run readers only. The browser journey observes no conversation API request while opening, completing, restarting and reloading the story. Repository dependency gates prevent client imports of provider and server orchestration code.

Live OpenAI evaluation remains:

> BLOCKED — authorised credential/model configuration unavailable

It is irrelevant to B1 operation and has not been represented as passed.

## 13. Verification results

Final clean-state verification:

| Gate | Discovered | Passed | Failed | Skipped/not run | Result |
|---|---:|---:|---:|---:|---|
| Vitest unit/regression | 29 files / 262 tests | 29 files / 262 tests | 0 | 0 | Pass |
| Supabase integration | 5 files / 15 tests | 5 files / 15 tests | 0 | 0 | Pass |
| PostgreSQL/pgTAP | 5 files / 213 assertions | 5 files / 213 assertions | 0 | 0 | Pass |
| Conversation evaluation corpus | 1 file / 34 cases | 1 file / 34 cases | 0 | 0 | Pass |
| Fake-provider modes | 1 file / 8 tests | 1 file / 8 tests | 0 | 0 | Pass |
| Playwright mobile Chromium | 31 tests | 31 tests | 0 | 0 | Pass |
| Focused B1 Playwright subset | 4 tests | 4 tests | 0 | 0 | Pass |

Additional gates:

- TypeScript: pass, zero errors.
- ESLint: pass, zero errors.
- Production build: pass; `/story/sarah` is dynamic server-rendered output.
- Coverage: pass — 73.54% statements, 58.47% branches, 76.88% functions and 76.31% lines overall; story application coverage is 94.28% statements and 96.72% lines.
- Generated seed/database-type drift: pass.
- Client-bundle dependency boundary: pass; no server-only simulator/store identifiers in built client chunks.
- `git diff --check`: pass.
- Local database resets: pass from committed migrations and generated seed only; migrations `20260824140000`, `20260824170000`, `20260824210000` and `20260825120000` applied in order with no dashboard or undocumented manual edit.
- Fixture proof: Sarah and Alex authenticated after reset; the exact four Sarah story runs were present and owner-isolated.
- Provider calls during the story browser journey: zero conversation API requests; story code has no provider import.

One intermediate pgTAP invocation followed the state-mutating integration suite and therefore saw dirty test records. After the target was reverified as local-only and the database was rebuilt from committed sources, all 213 assertions passed. This was a suite-order/environment-state issue, not a migration, seed, RLS or product defect.

The prior Slice 7 Home baseline changed only because the newly approved Sarah-only story entry is now present. The expected/actual/diff images were inspected, the existing explicit baseline-update approval was applied to that single snapshot, and all 31 tests then passed. No unrelated baseline was accepted.

No Slice 1–7 or Track A expectation was weakened, no frozen Sarah number changed, and no test was skipped.

## 14. Remaining limitations and B2 recommendation

- B1 is intentionally available only to the controlled Sarah identity; there is no public or all-user Sarah data projection.
- Story position is not persisted across refresh.
- The story is text and decorative vector animation only: no audio, voice, lip sync or user avatar.
- Sarah’s profile remains deliberately shallow because unverified prototype biography was excluded.
- Employer opportunities remain informational and numerically inert.
- There is no live-provider dependency or generated dialogue.

Any Phase B2 proposal should begin with a separate design and privacy review. The next useful candidate is not a more autonomous avatar; it is a narrowly scoped review of whether an optional, permanently disableable everyday companion adds value without obscuring the decision simulator. Real-user human-context persistence, if considered, needs its own provenance, purpose, RLS, retention, export, deletion and opt-out contract before schema or UI work.
