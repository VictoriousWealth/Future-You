# Slice 7 — MVP release-candidate contract

Status: complete; approved MVP release candidate
Contract approved: 2026-08-24
Release candidate approved: 2026-08-25
Scope: product-wide visual, responsive and accessibility hardening only

> **Historical registration boundary:** This completed slice records the former open-signup UI
> contract. `employer-provisioned-registration-contract.md` now supersedes that product direction.
> Slice 7 did not implement the new Company ID/work-email verification flow.

## Purpose and non-negotiable boundary

Slice 7 presents the existing validated MVP as one coherent release candidate. It does not change simulator mathematics, Sarah, forecast dates, classifications, scenario types, conversational intents, context versioning, immutable runs, RLS, exact money, provider authority or browser/server authority.

The behavioural hierarchy remains the approved specifications and executable acceptance tests. Supplied SVGs govern geometry and proportions; supplied PNGs govern visual hierarchy and colour impression. Superseded prototype copy and behaviour remain excluded.

The live-provider status remains:

> BLOCKED — authorised credential/model configuration unavailable

The approved release classification is:

> MVP RELEASE CANDIDATE — APPROVED FOR CONTROLLED DEMONSTRATION AND EVALUATOR REVIEW

This classification does not mean public launch, public self-registration, live-model approval or production-scale readiness.

## Pre-implementation product audit

The audit was completed before production UI changes.

| Surface/state | Current implementation and reference | Gaps to close in Slice 7 | Behaviour that remains fixed |
|---|---|---|---|
| Welcome/auth choice | No dedicated surface. Supplied Screen 1 defines the centred brand introduction and two actions. | Add a semantic `/welcome` entry, keyboard-visible actions and resilient mobile/wide composition. Do not make it the default redirect because earlier root/login behaviour is approved. | Authentication remains Supabase-backed; auth stays outside the returning-user shell. |
| Login | Functional sanitised sign-in form in a generic glass card. Screen 2 defines the blue corner shape and outlined fields. | Align hierarchy, labels, pending/error states, autofill, focus and responsive frame. Add links to Welcome and Signup. | Existing credentials, safe destination handling and `/login` route behaviour remain unchanged. |
| Signup | Missing. Screen 3 exists but contains superseded Company ID. | Add optional account creation with email, password and confirmation only. Sanitise errors and handle both immediate-session and confirmation-required outcomes. | Company ID/workplace is not part of signup; a signed-in no-context user continues to onboarding. |
| Onboarding | Eight-step functional exact-string form with preview; visually separate from product system. No direct supplied screen. | Apply shared tokens, clearer step navigation/grouping, semantic field errors, sticky-safe actions, responsive two-column field groups and readable review. | No browser finance calculation, no draft persistence, no silent committed-transfer default, no contract change. |
| Home | Visually close to Screens 4–5 at 414 px; decision-first and authoritative. | Long-name wrapping, prompt overflow cue, consistent cards, tablet/desktop composition, skeleton/error polish and focus states. | Current path stays current after what-if exploration; no provider call or invented benefits. |
| Goals | Visually close to Screen 6 while using approved Sarah values and current/hypothetical separation. | Empty/horizon/long-name resilience, progress semantics, date wrapping, wide two-column composition and clearer historical warning. | Server values render verbatim; historical run remains paired to its original context. |
| Ask | Screen 7 visual language is established and deterministic conversation behaviour is complete. | Controlled wide width, clearer message/result spacing, mobile composer resilience, dialog focus trap/restoration, Escape handling, long-thread/history loading and safer neutral processing copy. | No streaming claims, new intents, model-written financial facts or browser recalculation. |
| Benefits | Complete Slice 6 informational surface with no direct supplied screen. | Stronger provenance/status hierarchy, long-employer wrapping, wide card composition, honest empty state and optional context-edit handoff. | No simulation, provider call, numerical effect, inferred availability or eligibility. |
| Financial-context settings | Reuses onboarding form with a small return link. | Add explicit immutable-version framing, current-versus-proposed explanation, accessible preview/confirmation and product-consistent responsive layout. | Creates a successor version only; prior contexts/runs remain unchanged and no scenario is committed. |
| Loading | Route loading and client loading exist; Home proved one settled state. | Consolidate neutral layout-preserving skeleton/state language and distinguish context/run/history loading where the application actually exposes the distinction. Do not invent phases for an atomic turn request. | Never show guessed values, Sarah fallback or stale data as current. |
| Empty | Benefits and conversation-history empty states exist; Goals no-goals is not specialised. | Share the empty-state treatment and add honest no-goal/no-history/no-data copy where DTO shape permits. | Incomplete data never becomes certainty. |
| Error | Sanitised retry cards exist, but auth/onboarding styling and associations differ. | Shared alert treatment, safe retry wording, field associations and network handling. | Never expose Supabase/PostgreSQL/OpenAI details or replace a missing result with prose. |
| Historical context | Goals and Ask warnings exist. | Consolidate banner hierarchy and terminology: “Older version of your financial plan.” | V1/V2 are never mixed or recalculated. |
| Stale conversation | Functional stale card exists. | Strengthen semantics, next action and focus visibility. | New scenario-producing turns remain blocked; old messages/results stay readable. |
| Unsupported request | Server-owned scope message renders as an assistant message. | Give it a distinct but non-alarming state and resilient long copy. | Unsupported intents never invoke the simulator. |
| Provider fallback | Trusted fallback note exists. | Make the fallback and retained deterministic result relationship clearer. | Stored result remains visible; no model-generated replacement fact. |
| Mobile navigation | Four fixed destinations closely match Screens 4–7. | Enforce 44 px targets, safe-area spacing, long-label stability and no covered content at 360/414 widths. | Same four destinations and active state. |
| Tablet layout | Current 31-rem framed phone leaves excessive unused space. | Use centred, bounded content with balanced two-column cards; keep Ask narrower. | Same features and information architecture. |
| Desktop layout | Current app is a floating phone with bottom navigation. | Use a bounded application frame and persistent left navigation derived from the same four destinations. Avoid dashboard additions. | Home stays decision-first and Ask stays central. |

## Cross-cutting audit findings

- The product palette is already close to the references, but legacy and Slice 5 token aliases coexist and repeated values remain route-specific.
- Product surfaces share `ProductShell`, `ContextPill`, `GoalCard` and surface states; authentication/onboarding still use separate radii, shadows and actions.
- Two bottom sheets are duplicated inline and have `role="dialog"` but no focus trap, focus restoration or Escape handling.
- Most icon-only controls are labelled and decorative SVGs are hidden. Home lacks a semantic page `h1`; progress exposes an accessible label but should retain server-produced value wording.
- Focus styling is limited to product-shell links/buttons/inputs and does not consistently cover auth, onboarding, selects, summaries or sheet controls.
- Reduced motion disables the two existing animations, but a global motion token and transition override are absent.
- Only one meaningful product breakpoint exists; no intentional tablet/desktop navigation is implemented.
- Fixed mobile navigation and composer need explicit keyboard/safe-area and zoom resilience.
- Existing client-boundary tests are strong and must remain the authority guard during visual refactoring.

## Visual-source mapping

| Supplied screen | Retained | Intentionally changed |
|---|---|---|
| 1 — Welcome | Centred brand moment, white space, blue/purple mark and primary/secondary auth actions. | Product-safe wordmark replaces embedded artwork/font; accessible copy describes financial decisions. |
| 2 — Login | Large blue shape, strong Login heading, outlined floating-label fields and full-width action. | No prefilled real-looking email/password; sanitised validation and navigation are added. |
| 3 — Signup | Same auth geometry and action hierarchy. | Company ID is removed; password confirmation and accessible help are added. |
| 4 — Home upper | Greeting, large blue decision hero, prompt rail and floating navigation. | Sarah replaces old prototype identity; unsupported prioritisation/Wrapped prompts remain absent. |
| 5 — Home lower | Compact current-path goals and opportunity area. | Frozen Sarah values replace prototype values; unverified numerical pension opportunity is removed. |
| 6 — Goals | Large title, rounded goal cards and progress hierarchy. | Current-path dates, balances, hypothetical and historical states follow trusted DTOs; goal editing is absent. |
| 7 — Ask | Large welcome, outlined prompt rail, tall composer and four-item navigation. | Jenny and unsupported prompts are removed; persistent constrained conversation and deterministic result states are retained. |

No source image, embedded font or full reference asset will ship in production.

## Consolidated design system

One root token set will cover:

- palette: `#004AAD`, `#5271FF`, `#38B6FF`, `#8C5BEA`, `#DE53AD`, semantic ink/muted/surface/border/success/warning/error colours;
- spacing: a shared 4 px-derived scale from compact inline gaps through section spacing;
- radii: pill, field, card, hero and sheet values;
- elevation: low card, floating navigation/composer and dialog values;
- typography: system geometric sans fallback, bounded fluid headings, body/label/caption scales and readable line heights;
- controls: 44 px minimum interactive target, shared focus ring and disabled/pending treatment;
- layout: phone/tablet/desktop content constraints, navigation sizes and safe-area values;
- motion: fast/base/slow durations and easing, removed under `prefers-reduced-motion`.

Legacy aliases may remain temporarily when removing them would create risky churn, but their values must resolve to the canonical tokens.

## Component decisions

Consolidation is limited to demonstrated value:

- retain and harden `ProductShell`, `ProductHeader`, `ProductNavigation`, `GoalCard` and surface states;
- retire the repeated top-of-screen `ContextPill`; current-plan state is the normal default, while material historical/stale state continues to use explicit warnings;
- introduce shared auth framing, brand mark, field/action/error primitives through semantic components/classes;
- introduce one reusable accessible modal-sheet primitive with focus trap, Escape close and trigger-focus restoration;
- reuse one warning/empty/status visual language across product routes;
- keep financially specialised result and onboarding components separate rather than hiding authority behind generic abstractions.

## Responsive contract

Acceptance viewports are `360 × 800`, `414 × 896`, `768 × 1024` and `1440 × 900`.

- Under 768 px: fixed safe-area-aware bottom navigation; single-column content; horizontally scrollable prompt/scenario rails with visible overflow cue; fixed Ask composer above navigation.
- 768–1099 px: bounded application frame, persistent left navigation, two-column Home/Goals/Benefits card layouts where content supports it, and a controlled Ask column.
- 1100 px and above: centred maximum-width frame, persistent left navigation, deliberate whitespace and route-specific balanced columns. No extra dashboard widgets or charts.
- Authentication and onboarding use their own bounded responsive frame outside product navigation.

No breakpoint changes data, features, provider use or financial operations.

## Accessibility contract

- Exactly one logical `h1` per settled route state.
- Native landmarks, labels, fieldsets and details are retained or improved.
- Every interactive control has an accessible name and at least a 44 px target.
- Error text uses `role="alert"` or associated `aria-describedby`; loading and result changes use restrained live regions.
- Navigation continues to expose `aria-current="page"`; current/hypothetical/historical state is written in text, not colour alone.
- Modal sheets trap focus, close on Escape, restore the opener and prevent background pointer interaction.
- Progress keeps the complete server-produced accessible label; client arithmetic is forbidden.
- Focus indicators apply across auth, forms, navigation, dialogs, links, details and controls.
- Layout must survive 200% browser zoom, large text, long names/labels and negative/large money strings without required information clipping.
- Motion is decorative only and disabled under reduced-motion preference.

Automated browser checks supplement—not replace—keyboard, focus, contrast, zoom and visual inspection.

## Authentication decision

`/login` remains the existing sign-in route and prior redirects remain valid. Slice 7 adds:

- `/welcome` for the supplied Screen 1 auth choice;
- `/signup` for email/password account creation without Company ID.

Signup uses the public Supabase browser client. It never accepts owner/context/workplace identity. Immediate authenticated signup continues to `/onboarding`; confirmation-required environments show a neutral confirmation state. Raw provider errors are never rendered.

The approved Slice 3 local security configuration keeps public registration disabled. Slice 7 does not weaken that global Auth setting merely to exercise a presentation route. The release-candidate browser journey therefore proves the Signup UI and deterministic client validation, then uses the committed no-context Alex identity to prove the authenticated account-to-onboarding path. Environments that deliberately enable public registration can use the same provider boundary without changing the onboarding or ownership rules.

## Loading and performance decisions

- Route loading uses light shared structure; client fetch loading uses one settled in-surface state.
- Passive Home, Goals and Benefits retain zero provider calls.
- A conversation turn is an atomic HTTP operation, so the UI uses honest neutral processing language instead of fabricating provider/simulator phase timing.
- Existing private/no-store rules remain. No cross-user cache, analytics, session replay or new infrastructure is added.
- Reference images are audit inputs only and are absent from client bundles.

## Visual regression and release journey process

Deterministic Chromium evidence covers the seven highest-value visual states: Login, onboarding review, Home current path, Goals current path, Ask initial, Ask £650 result and Benefits canonical. Explicit baseline updates require a review note; generated IDs/timestamps are excluded or normalised.

Responsive smoke and evidence capture run at all four acceptance viewports. Chromium is required. Additional engines are attempted only when locally installed and do not block Slice 7.

The release-candidate suite covers new user, returning Sarah, context revision and failure handling without allowing a failure state to fabricate a result.

## Explicit deferrals and remaining limitations

All post-MVP features listed in the approved Slice 7 contract remain deferred. An authoritative benefit catalogue is still absent, and live-provider quality is not verified while the authorised credential/model configuration remains unavailable.

## Operational verification

The Slice 7 browser file writes deterministic evidence to `artifacts/slice-7-visual/` and compares the seven stable states in `tests/e2e/slice-7-release-candidate.spec.ts-snapshots/`:

```text
npx playwright test tests/e2e/slice-7-release-candidate.spec.ts
```

The responsive and accessibility cases can be isolated with Playwright `--grep` using their test names. They cover the four accepted viewports, overflow, heading structure, keyboard skip navigation, sheet focus trap/restoration, Escape, reduced motion, long content, 200% root text size and 44 px targets. Visual inspection remains required for hierarchy, contrast impression and reference alignment.

Baseline replacement is never part of an ordinary pass. After an intentional visual change has been reviewed and explicitly approved, use:

```text
npx playwright test tests/e2e/slice-7-release-candidate.spec.ts --update-snapshots
```

Then rerun the same test without `--update-snapshots` and review both the PNG diff and the evidence captures. This Slice 7 baseline generation was explicitly authorised by the user on 2026-08-25.

The complete local release sequence is:

```text
npm run db:reset
npm run db:test
npm run test:integration
npm test
npm run test:evaluation
npm run test:coverage
npm run typecheck
npm run lint
npm run build
npm run build:boundary:check
npm run db:artifacts:check
npx playwright test
git diff --check
```

Before `db:reset`, verify that `SUPABASE_URL` is loopback, `supabase/config.toml` identifies this local repository project, the command uses `--local`, and no hosted project reference is active. Stateful suites intentionally create immutable data, so pgTAP runs immediately after a reset and browser acceptance begins from another reset. No dashboard or manual SQL correction belongs in the process.

The client-bundle check inspects the production output for server-only simulator/store identifiers. An authorised live-provider evaluation remains separate: set server-only `OPENAI_API_KEY` and an explicitly approved `OPENAI_CONVERSATION_MODEL`, then run `npm run test:evaluation:live`. Do not run or claim this gate without that separate authority.

## Completion gate

Slice 7 completes only after the responsive, accessibility, visual, authority, security and clean-reset gates in the approved contract pass with no skipped tests; every Slice 1–6 regression remains green; the release evidence and evolution history are appended; and post-MVP work remains unstarted.
