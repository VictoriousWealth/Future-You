# Future You — Character-Led Story and Human-Context Contract

**Version:** 1.0.0
**Status:** Approved product direction; Phase B1 technical design authorised, application implementation not authorised
**Prepared:** 2026-08-25
**Scope:** Guided Sarah story mode, optional everyday character treatment and user-owned human-context profile
**Financial authority:** Existing deterministic simulator and immutable stored results remain unchanged

## 1. Product recommendation

Future You should preserve the prototype's warmth through two deliberately separate experiences:

1. **Guided demonstration:** an explicit `Play Sarah's story` mode with the full Sarah character, deterministic narrative steps and the real canonical £650 simulation.
2. **Everyday product:** no continuously walking character. If a lighter companion is approved later, it should be a small, optional, dismissible and permanently disableable presentation aid.

Sarah should remain the canonical demonstration character only. She must not silently become a representation of every real user.

The recommended initial implementation order is:

- build the guided Sarah story as a separate evaluator/demo experience;
- prove identical financial results with animation on and off;
- add the transparent `Your story` profile surface without connecting it to calculations;
- research whether users want an everyday generic companion; and
- defer user-selected or personalised likenesses.

This contract does not authorise implementation.

## 1.1 Locked Phase B1 decisions

- Sarah is the canonical demonstration character only.
- `Play Sarah's story` is an explicit user-selected route or mode; it never starts from opening the normal application.
- The everyday product has no animated avatar by default.
- Phase B1 includes no character selection, customisation, user likeness, uploads or AI-generated avatar.
- Dialogue uses visible text, accessible speech bubbles/story panels and optional static captions; voice, TTS, cloning and automatic audio are excluded.
- Story motion includes pause, resume, skip step, skip all animation, restart, exit, disable animation and a reduced-motion equivalent.
- The emotional arc is uncertainty to understanding, never bad choice to good choice.
- All financial facts come from canonical Sarah context, immutable runs and approved server templates.
- Phase B1 operates without OpenAI or another live provider.
- Real-user human-context persistence is not included and requires another technical design.
- “Financial twin” remains internal language only.

The next authorised output is `sarah-guided-story-mode-technical-design.md`. No Track B application code may begin until that design is approved.

## 2. Product purpose

The character exists to make cause and effect feel human:

> A person is considering something meaningful, Future You shows the trade-off, and the person finishes with clearer understanding.

The emotional arc is:

```text
uncertainty -> exploration -> understanding
```

It is never:

```text
bad choice -> corrected person -> morally good choice
```

The character is a narrative and presentation device. It is not a coach, financial authority, second assistant, behavioural diagnosis or substitute for evidence.

## 3. Three information layers

Future You must formally label every relevant value as exactly one of the following layers.

| Layer | Meaning | Examples | May affect simulator output? |
|---|---|---|---:|
| Simulation facts | Confirmed or explicitly accepted inputs used by deterministic financial rules | Balances, income, bills, routine spending, goals, contributions, dates, desired safety buffer | Yes, only through approved context/version rules |
| Human context | User-owned qualitative information used for bounded relevance or tone | Life stage, aspirations, career stage, living situation, confidence, concerns, preferences, story quote | No |
| Presentation state | Ephemeral UI state controlling how an approved message is shown | Pose, expression, position, bubble, story step, animation, pause state | No |

No value moves between layers implicitly.

### 3.1 Simulation facts

Simulation facts remain governed by the financial-context and simulation contracts. They require the existing evidence, confirmation, exact-money, versioning and ownership rules.

A character, profile fact, aspiration or quote cannot:

- change an amount or date;
- add an obligation;
- reprioritise goals;
- lower a safety buffer;
- alter the affordability classification;
- activate a benefit; or
- create or commit a scenario.

### 3.2 Human context

Human context may only influence explicitly approved presentation decisions, such as:

- choosing from approved tone variants;
- selecting supported example prompts;
- selecting an approved profile detail to reference;
- ordering already trusted information; and
- deciding whether optional explanatory context is relevant.

Human context is not evidence for financial facts. For example:

- “I hope to buy a home” does not create or change a house-deposit goal.
- “I feel nervous about money” does not increase the safety buffer.
- “I live with family” does not change rent.
- “I am early in my career” does not change income or pension assumptions.

If a user chooses to turn a qualitative aspiration into a numeric goal, Future You must start the normal explicit financial-context revision flow. The new financial fact then has its own confirmation and provenance; the original human-context value is not silently promoted.

### 3.3 Presentation state

Presentation state is disposable UI state. It can react only to trusted application events, never infer financial meaning.

The same stored deterministic result must be rendered whether the character is:

- animated;
- static;
- paused;
- dismissed;
- permanently disabled; or
- absent because of device/accessibility constraints.

## 4. Guided Sarah story mode

### 4.1 Entry and identity

The experience begins through an explicit action:

> Play Sarah's story

Recommended placement is a separate evaluator/demo route or clearly isolated mode, not an automatic overlay on Home or Ask.

The opening must state that Sarah is a demonstration profile. It must not imply that Sarah is the signed-in user or that her circumstances describe everyone.

### 4.2 Canonical narrative sequence

| Step | Narrative purpose | Trusted source | Character treatment |
|---|---|---|---|
| 1. Meet Sarah | Introduce Sarah and approved demo circumstances | Versioned Sarah demo human-context script + canonical profile | Sarah enters or appears; static equivalent available |
| 2. The decision | Explain the £650 trip Sarah is considering | Approved scripted question | Uncertain/considering pose without moral judgement |
| 3. Run Future You | Invoke or retrieve the real deterministic £650 scenario | Existing application use case and immutable run | Neutral calculating state; no partial claims |
| 4. Understand the result | Show safety-buffer, bills, borrowing, recovery and goal effects | Stored run DTO | Result-aware pose; evidence cards remain primary |
| 5. Explore alternatives | Select £500, £400 and October siblings | Existing stored/retrieved scenarios | Curious/comparing state, not “good” versus “bad” |
| 6. Check opportunities | Optionally show an authoritative informational employer opportunity | Verified membership + authoritative opportunity record | Informational discovery state only |
| 7. Finish | Return to current path and summarise understanding | Stored baseline and approved script | Resolved/clear pose; no recommendation or commitment |

The story must use the frozen Sarah values and existing deterministic results. A scripted claim cannot repair, round or replace a stored result.

### 4.3 Dialogue authority

Dialogue is divided into:

- **Approved narrative script:** stable non-financial connective wording.
- **Trusted fact templates:** server-rendered wording populated from stored DTO values.
- **Optional bounded explanation ordering:** existing explanation-plan boundary, if used.

Financial amounts, dates, coverage and classifications come only from trusted result templates. The character cannot speak free-form model-generated numbers.

Example:

```text
Script: "I want to join my friends on a trip next month."

Trusted template:
"The £650 trip leaves Sarah with a £250 safety buffer. Her bills remain covered and no overdraft is required."
```

### 4.4 Employer-opportunity step

The opportunity step is conditional. It appears only when an authoritative opportunity record is available for the demo membership.

If no authoritative record exists, the story either:

- skips the step; or
- explains that Future You will not invent an opportunity from an employer name.

Registration or verified employer membership never proves benefit eligibility or uptake. No opportunity changes the story's financial results without a separately approved deterministic scenario.

### 4.5 Story controls

The guided mode requires:

- Play
- Pause/resume
- Previous/next step
- Skip animation
- Exit story
- Restart story
- Disable animation

The user controls progression. Story completion never commits a scenario or changes the current path.

## 5. Everyday product design

The full walking Sarah character must not appear automatically throughout normal Future You use.

Potential lightweight placements for future evaluation:

- onboarding introduction;
- waiting-for-a-question empty state;
- non-financial calculating indicator;
- major informational discovery;
- recoverable error or no-data state; and
- optional contextual speech bubble attached to a known result.

Everyday rules:

- the feature is optional;
- dismissal is immediate;
- `Disable character` persists across sessions;
- reduced motion takes precedence over product animation preferences;
- the character has a reserved layout region and never floats over critical content;
- no continuous walking or idle loop by default;
- no essential information appears only in a bubble or expression;
- the character cannot start speaking or playing audio automatically; and
- the application remains complete when the component is not loaded.

## 6. Avatar identity options

| Option | Strength | Risk | Recommendation |
|---|---|---|---|
| Sarah only in guided demo | Strong canonical storytelling; already has approved scenario | Could be mistaken for the real user if poorly labelled | Approve as the first use |
| Generic Future You companion | Reusable without claiming to depict the user | May feel like a financial authority or childish mascot | Research before everyday adoption |
| User-selected character | Offers agency without claiming physical likeness | Asset, representation and preference complexity | Defer |
| Personalised user representation | Potentially high emotional connection | Privacy, bias, likeness and misrepresentation risk | Do not build without a separate contract |
| No avatar in normal use | Lowest distraction and authority risk | Less warmth | Default everyday baseline for now |

Until separately approved:

> Sarah is the canonical demonstration character only; normal use has no personalised avatar.

## 7. “Your story” profile surface

Recommended user-facing structure:

### Your story

Optional qualitative details the user has chosen to share.

### What Future You uses

All values that influence calculations, personalisation or presentation, grouped by information layer.

### Workplace access

Verified employer identity, work email and membership status from registration, explicitly separated from personal and financial profile data.

Every displayed fact must include:

- value;
- layer (`Simulation fact`, `Human context` or `Presentation preference`);
- provenance;
- when added or last confirmed;
- why Future You uses it;
- whether it affects calculations;
- verification/evidence state;
- edit action where allowed; and
- remove action where allowed.

Example:

```text
Living situation: Renting with friends
Source: You told Future You
Last confirmed: 25 August 2026
Used for: Optional wording and relevant supported examples
Calculations: Does not affect them
[Edit] [Remove]
```

There are no hidden inferred profile facts.

## 8. Proposed human-context fields

All fields below are optional proposals. None is approved as a required onboarding question.

| Field | Input form | Allowed use | Calculation effect | Provider default |
|---|---|---|---:|---|
| Life stage | User-selected approved options + `Prefer not to say` | Supported prompt relevance and approved wording | None | Send only a coarse approved label when needed |
| Aspirations | User-selected topics or short user text | Explain why an existing supported feature may be relevant | None | Do not send free text by default |
| Career stage | User-selected approved options | Tone/example relevance | None | Coarse label only if explicitly useful |
| Living situation | User-selected approved options | Avoid irrelevant examples; contextual copy | None | Server-only by default |
| Financial confidence | User-selected scale/description | Explanation depth and terminology | None | Send bounded level, never raw narrative |
| Current concerns | User-selected supported topics | Supported prompt ordering | None | Topic keys only |
| Explanation preference | `Brief`, `Balanced`, `Detailed` | Amount of approved explanatory content | None | Enum may be sent |
| Tone preference | `Clear`, `Supportive`, `Direct` | Approved template/tone selection | None | Enum may be sent |
| Personal story/quote | Optional short user text | Display back to user or approved scripted reference | None | Never send by default |
| Character preference | `Off`, `Static`, `Animated where allowed` | Presentation only | None | Never sent |
| Motion preference | System/user preference | Disable or minimise motion | None | Never sent |

Explicitly excluded unless separately justified:

- inferred race, ethnicity, religion, sexuality, health or disability;
- personality or behavioural scoring;
- emotional-state inference;
- creditworthiness labels;
- hidden “spender/saver” archetypes;
- job title inferred from employer;
- salary inferred from job, location or employer;
- living situation inferred from spending; and
- aspirations inferred from conversations without explicit save/confirm action.

## 9. Progressive profiling

The collection order should be:

```text
Employer-provisioned registration
  -> minimum financial onboarding
  -> usable deterministic Future You experience
  -> optional progressive human-context prompts
  -> editable Your story surface
```

Human-context questions must not delay the first trustworthy simulation.

Progressive prompts:

- are optional and individually skippable;
- explain why the detail could help;
- never bundle consent for unrelated uses;
- do not reappear aggressively after dismissal;
- provide `Not now` and remove controls; and
- are not framed as necessary for accuracy unless the value is actually a simulation fact collected through financial context.

## 10. Provenance model

Every fact has structured provenance.

Proposed source categories:

- `USER_PROVIDED`
- `USER_CONFIRMED`
- `VERIFIED_EMPLOYER_MEMBERSHIP`
- `FINANCIAL_CONTEXT_VERSION`
- `DETERMINISTIC_RUN`
- `SYSTEM_PREFERENCE`
- `CANONICAL_DEMO_SCRIPT`

Prohibited source category:

- `MODEL_INFERRED_PROFILE_FACT`

Required metadata:

- fact key;
- information layer;
- source category;
- source record/version reference where applicable;
- created time;
- last confirmed time;
- allowed use keys;
- calculation effect boolean;
- verification state;
- retention state; and
- user-visible explanation.

The UI must be able to answer:

> Why does Future You know this, and what did it do with it?

## 11. User control and deletion

Users must have separate controls to:

- edit a human-context fact;
- remove one fact;
- disable use of human context for personalisation while retaining selected facts;
- disable the character;
- disable animation;
- clear the complete human-context profile; and
- delete the whole account through the future account-deletion process.

Removing a human-context fact removes its value from active and provider-eligible storage. A minimal audit event may retain the fact key, action and timestamp, but not the deleted value.

Removing human context does not delete financial context. Deleting or revising a simulation fact continues through the financial-context version rules and must not be disguised as a profile edit.

## 12. Privacy and ownership

The user owns the human-context profile.

The employer receives no read, write, analytics or export access to:

- human-context facts;
- financial confidence;
- concerns;
- aspirations;
- living situation;
- personal story/quote;
- avatar preferences;
- personal email;
- financial context;
- goals;
- conversations;
- scenarios;
- runs; or
- explanations.

Verified employer membership supplies only:

- employer identity;
- verified work email;
- membership/access state; and
- authorised opportunity catalogue linkage where separately available.

It does not supply job title, salary, career stage, confidence, circumstances, aspirations or benefit uptake.

Recommended persistence boundary:

- human-context records are separate from financial-context payloads;
- authenticated owner access uses forced RLS and narrow grants;
- employers have no database policy or API for these records;
- presentation state is ephemeral unless the user explicitly saves a preference;
- demo Sarah context is a versioned read-only fixture, not copied into real-user profiles; and
- logs contain only fact keys/event categories, never human-context values.

## 13. Retention and minimisation

- Collect only a field with an approved visible use.
- Do not retain abandoned progressive-profile drafts longer than necessary.
- Retain active human context until user removal, policy expiry or account deletion.
- Remove deleted content rather than preserving it in ordinary event history.
- Do not put human-context values in analytics event names, URLs, cache keys or error reports.
- Do not duplicate profile text into conversation messages merely for convenience.
- Do not save generated interpretations as new profile facts.
- Reconfirm stale qualitative details rather than assuming they remain true.

Exact retention periods require privacy/legal approval and remain unresolved.

## 14. Bounded personalisation rules

Personalisation is a server-owned mapping from an approved fact to an approved action.

Example rule:

```text
Input fact:
  explanation_preference = DETAILED

Allowed effect:
  include approved secondary explanation sections

Forbidden effects:
  change result, add warnings, recommend a decision, disclose another fact
```

Every rule needs:

- rule ID and version;
- allowed fact key/value set;
- allowed output/action set;
- human-readable “why used” text;
- no-calculation-effect assertion; and
- automated comparison showing identical simulator input/output with the rule enabled and disabled.

There is no general-purpose “use everything we know” instruction.

## 15. Provider-data boundary

The deterministic story must work with the fake provider and with no provider at all.

When an existing bounded model provider is used for tone or ordering, it receives only the minimum allowlisted symbolic values needed for that call, for example:

```json
{
  "tonePreference": "SUPPORTIVE",
  "explanationDepth": "DETAILED",
  "availableFactKeys": ["BUFFER_REDUCTION", "BILLS_COVERED"]
}
```

It does not receive by default:

- the complete human profile;
- user story/quote;
- living situation;
- work or personal email;
- employer identity;
- raw aspirations or concerns;
- financial context;
- conversation archive; or
- character history.

Provider output cannot create/update profile facts, choose financial values, infer emotion, select an unapproved recommendation or control animation directly. The server validates an approved presentation/explanation plan and renders trusted facts.

Provider calls retain the existing `store: false`, no provider-owned conversation state, strict schema, no built-in tools and sanitised logging policies.

## 16. Avatar presentation state machine

```text
HIDDEN
  -> INTRODUCTION
  -> WAITING_FOR_QUESTION
  -> INTERPRETING
  -> RESULT_AVAILABLE
      -> TRADEOFF_SIGNIFICANT
      -> TRADEOFF_NOTICEABLE
      -> TRADEOFF_MINIMAL
  -> EXPLANATION
  -> INFORMATIONAL_OPPORTUNITY
  -> COMPLETION

Any visible state
  -> PAUSED
  -> STATIC
  -> DISMISSED
  -> DISABLED

Any processing state
  -> ERROR
```

### State authority

| State | Trigger | Scripted or data-driven? | Financial authority |
|---|---|---|---|
| `INTRODUCTION` | User starts story | Scripted demo step | None |
| `WAITING_FOR_QUESTION` | Story/app ready | Scripted | None |
| `INTERPRETING` | Server accepted question but no result yet | Data-driven application status | No partial financial claim |
| `RESULT_AVAILABLE` | Stored result DTO returned | Data-driven | Reads trusted result only |
| Trade-off states | Stored deterministic classification | Data-driven mapping | Cannot alter classification |
| `EXPLANATION` | Stored result explanation selected | Data-driven + approved template | Reads stored facts only |
| `INFORMATIONAL_OPPORTUNITY` | Authoritative opportunity record exists | Data-driven eligibility-to-display rule | No cash effect |
| `ERROR` | Sanitised application/provider error | Data-driven | No fabricated fallback result |
| `COMPLETION` | User reaches final scripted step | Scripted | No commitment |
| `PAUSED`/`STATIC`/`DISABLED` | User/system motion preference | Presentation state | None |

The state machine may choose an approved pose, expression, position and script/template ID. It cannot call the simulator, database or model by itself.

## 17. Positioning and obstruction rules

- Character geometry lives in a reserved story-stage region.
- It never overlaps global navigation, composer, result values, assumptions, errors, dialog controls or focus indicators.
- On insufficient viewports, switch to a static portrait or remove the character.
- Speech bubbles participate in document layout; they are not arbitrary overlays on evidence.
- Zoom to 200% and responsive reflow must not hide controls or facts.
- The character cannot intercept pointer events outside its explicit controls.
- Layout remains usable if the image/animation fails to load.

## 18. Accessibility and motion contract

The character experience must satisfy the intent of WCAG controls for moving content and animation:

- automatically moving content lasting more than five seconds requires pause, stop or hide control: [WCAG 2.2.2 guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html);
- non-essential interaction-triggered animation can be disabled and should respect reduced-motion preferences: [WCAG 2.3.3 guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html);
- content must not flash more than the allowed threshold: [WCAG 2.3.1 guidance](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold).

Required behaviour:

- honour `prefers-reduced-motion: reduce` on first render;
- provide an explicit persistent animation preference;
- replace walking/transitions with immediate static-state changes under reduced motion;
- provide pause/resume and skip controls in guided mode;
- use semantic buttons operable with keyboard;
- never move focus merely because the character moves or a story step advances;
- announce essential story text through normal document structure, not animation;
- use a polite live region only after user-triggered state changes and avoid repeated announcements;
- treat purely visual poses/expressions as decorative;
- provide text equivalents for every meaningful bubble;
- deliver no information solely by colour, pose, expression or movement;
- include no autoplay audio;
- include no flashing/strobing effect; and
- ensure the full story is understandable with images, motion and AI disabled.

## 19. Relationship to registration

Employer-provisioned registration contributes only verified workplace-access facts:

- employer identity;
- verified work email; and
- membership state.

These remain in the registration/membership layer. They are not automatically copied into human context.

The character/profile experience must not:

- show the Company ID after activation unless needed for account support;
- expose work email in story dialogue;
- infer career stage, salary, role or aspirations from employer identity;
- let employer membership personalise financial advice; or
- give the employer access to profile/story data.

Registration should finish before progressive human-context enrichment. The registration flow itself should remain focused on access and identity proof.

## 20. Relationship to financial onboarding

Financial onboarding continues to collect only the minimum context required for trustworthy simulation.

Human-context prompts:

- do not become additional mandatory onboarding steps;
- appear after a usable financial context exists, unless a single optional preference has an immediate accessibility benefit;
- are visually labelled optional;
- can be skipped without reducing financial accuracy; and
- do not create new financial-context versions.

The verified employer is shown read-only where relevant and is not requested again.

## 21. Relationship to the deterministic simulator

The simulator remains independent from:

- character assets;
- avatar state;
- story scripts;
- human-context profile;
- personalisation rules;
- animation libraries;
- React/Next.js;
- model-provider types; and
- registration or employer-membership data except through already approved explicit simulation inputs.

Required invariant:

```text
simulate(financialContext, scenario, rules, calendar)
  is byte-for-byte identical
whether character/personalisation is enabled, disabled or absent.
```

Story mode retrieves or creates scenarios only through existing application use cases and references immutable runs. It never reconstructs a financial result in the browser.

## 22. Acceptance criteria

Any future implementation must prove:

1. The same deterministic result appears with or without the character.
2. Disabling animation changes no simulator request, stored run or classification.
3. Reduced-motion mode has no walking, parallax or non-essential transition and remains fully usable.
4. Pause, skip, previous, next, exit and disable controls are keyboard accessible.
5. The character never obscures navigation, composer, result evidence, errors or focus indicators at supported viewports and zoom.
6. Every financial claim in dialogue comes from a trusted stored result or approved financial template.
7. Human context never silently changes a financial input or output.
8. Every profile fact displays provenance, purpose, calculation effect and edit/remove controls.
9. Removed human-context values disappear from active/provider-eligible storage.
10. Employer membership grants no human-profile or financial-data visibility.
11. No profile fact is inferred from employer identity.
12. Story mode runs with the deterministic fake/no model provider.
13. Provider requests contain only explicitly allowlisted symbolic profile values.
14. Direct model output cannot control animation or create financial dialogue.
15. The complete experience remains understandable with animation, images, audio and AI unavailable.
16. Story completion does not commit a scenario or alter current financial context.
17. Sarah is clearly labelled as a demonstration character.
18. A real user's avatar/likeness is never generated or implied without a separately approved contract.

## 23. Recommended implementation phases

### Phase B1-A — Static guided story proof

- separate demo route/mode;
- Sarah static illustrations;
- scripted narrative steps;
- real stored £650/£500/£400/October results;
- no live provider;
- no human-profile persistence.

### Phase B1-B — Accessible animation

- bounded story-stage motion;
- pause/skip/disable;
- reduced-motion/static equivalent;
- obstruction, zoom and keyboard tests.

### Later separate track — Transparent Your story profile

- separate human-context persistence;
- provenance, use explanation, edit/remove and disable-personalisation controls;
- employer isolation and RLS proof;
- no simulator connection.

### Later separate track — Bounded everyday experiments

- optional static/generic companion variants;
- user research and accessibility review;
- no default continuous movement;
- no user likeness.

### Later separate track — Provider-assisted tone only if justified

- strict symbolic schema;
- allowlisted fact keys;
- data-minimisation tests;
- identical deterministic results and server-rendered financial wording.

Each phase requires separate approval. Later phases are not implied by approval of earlier ones.

## 24. Locked Phase B1 decisions and later unresolved scope

| Decision | Approved Phase B1 position | Status |
|---|---|---|
| Is the avatar only Sarah in demo mode? | Yes | Locked for Phase B1 |
| Is there a generic everyday companion? | No everyday avatar | Deferred |
| Is animation enabled by default? | Only after the user explicitly starts story mode | Locked for Phase B1 |
| Can users choose/customise a character? | No | Deferred |
| Does the character speak, use bubbles or both? | Visible text/bubbles/panels and captions only | Locked for Phase B1 |
| Is voice included? | No | Deferred |
| Which human-context fields ship? | No real-user human-context persistence in Phase B1 | Deferred to separate technical design |
| Which fields are optional? | Future human-context fields must be optional | Concept locked; implementation deferred |
| When are fields collected? | Not in Phase B1 | Deferred |
| Does human context affect AI tone? | Only through approved enum rules | Unresolved |
| Which details may reach a provider? | Tone/depth enums and topic keys only by default | Unresolved |
| How does the user disable personalisation? | One global control plus per-fact removal | Unresolved UI design |
| How is profile information deleted? | Hard-remove values, retain value-free audit event | Unresolved retention/legal review |
| Is “financial twin” user-facing language? | No | Locked |
| Does story mode live inside the product or a separate route? | Explicit route or mode, never automatic normal-app behaviour | Locked; exact route awaits technical design |
| How long is human context retained/reconfirmed? | Define per field after privacy review | Unresolved |
| Are Sarah's non-financial details a fixture or script? | Versioned demo human-context fixture linked to script | Unresolved technical choice |

## 25. Phase B1 design gate

Before Phase B1 implementation, `sarah-guided-story-mode-technical-design.md` must define and receive approval for the story route/mode, deterministic steps, state mapping, trusted templates, controls, responsive geometry, reduced motion, screen-reader behaviour, obstruction proof, no-AI operation and visual/test evidence.

Human-context persistence, everyday avatars, voice and character customisation remain outside Phase B1 regardless of that future approval.
