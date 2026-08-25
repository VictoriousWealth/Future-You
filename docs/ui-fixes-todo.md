# Future You — UI Fixes To-Do

Status: visual audit; no fixes in this document are approved or implemented by this audit

Audit date: 2026-08-25

Primary review viewport: `414 × 896`

## Purpose

This is the canonical visual-fidelity backlog for comparing the current Future You MVP with the supplied PNG and SVG mockups. We will take these items one at a time, agree the intended treatment, implement it, and add proportionate regression coverage before marking it complete.

The checklist records visual inconsistencies only. It must not be used to introduce a financial capability or interaction that the approved MVP deliberately excludes.

## References reviewed

| Reference | Intended comparison | Current evidence |
|---|---|---|
| `1.png` / `1.svg` | Welcome and authentication entry | `01-welcome-414x896.png` |
| `2.png` / `2.svg` | Login | `02-login-414x896.png` |
| `3.png` / `3.svg` | Signup | `03-signup-414x896.png` |
| `4.png` / `4.svg` | Home upper section | `06-home-upper-414x896.png` |
| `5.png` / `5.svg` | Home goal overview and spotted opportunity | `07-home-lower-414x896.png` |
| `6.png` / `6.svg` | Goal-management concept | Current Goals plus existing financial-context onboarding |
| `7.png` / `7.svg` | Ask initial state | `09-ask-initial-414x896.png` |
| No dedicated supplied screen | Benefits detail state | `16-benefits-canonical-414x896.png`, `17-benefits-no-data-414x896.png` |

The SVG canvases are exactly `414 × 896`. Their recurring palette confirms that Future You already uses the correct core colours: blue `#004AAD`, cyan `#38B6FF`, pink `#DE53AD`, and purple `#8C5BEA`. Colour replacement is therefore not a global priority; the main mismatches are structure, spacing, typography, border treatment, and visual state stability.

## Non-negotiable constraints

- Sarah's frozen balances, goals, dates, classifications, scenarios and assumptions must not change to fit a mockup.
- The server remains authoritative for financial values. UI fixes must not introduce browser recalculation.
- Current accessibility floors remain: 17px default body text, 11px minimum visible text, 17px meaningful icons, and 44px interactive targets.
- Existing ownership, RLS, persistence, immutable-run and conversation boundaries must remain unchanged.
- A visually absent capability must not be added merely because it appears in a mockup.
- Existing visual-regression baselines may be regenerated only after the corresponding fix is explicitly approved.

## Status legend

- `OPEN`: identified and ready to discuss.
- `DECISION`: needs a product choice before implementation.
- `BLOCKED`: cannot be addressed without expanding the approved scope.
- `IN PROGRESS`: implementation is actively underway.
- `DONE`: implemented, visually reviewed, and protected by regression coverage.

## Recommended order

### UI-01 — Fix the clipped Benefits header

Status: `OPEN`
Priority: P0 defect
Screens: Benefits

Current inconsistency:

- In both the stable Benefits baseline and current evidence, the wordmark is reduced to a clipped `FU` at the left edge and only part of the profile image is visible at the right edge.
- Home and Goals render the same shared header correctly, so this is not an intended Benefits variant.

Desired result:

- Render the complete Future You wordmark and complete circular profile image inside the same horizontal padding used by the other primary surfaces.
- Preserve the existing link destinations and accessible names.

Completion check:

- Compare Benefits with Home at `360 × 800`, `414 × 896`, `768 × 1024`, and `1440 × 900`.
- Add a geometry assertion that both header controls are entirely inside the viewport.

### UI-02 — Make the Benefits visual state deterministic before capture

Status: `OPEN`
Priority: P0 defect
Screens: Benefits

Current inconsistency:

- The approved Benefits baseline contains an empty workplace-card body while the evidence screenshot taken moments later contains its text.
- The active pension card is already present in both images, indicating a UI/capture readiness race rather than a deliberately separate loading state.

Desired result:

- A completed Benefits surface should expose one explicit ready condition only after all visible surface content is rendered.
- Loading, loaded, empty, and error states must each be visually stable and distinguishable.

Completion check:

- Repeated no-update screenshots must be pixel-stable.
- The test must wait on a whole-surface ready marker, not one unrelated descendant.

### UI-03 — Establish one reference-aligned border and radius hierarchy

Status: `OPEN`
Priority: P1 system
Screens: All

Current inconsistency:

- The mockups use crisp periwinkle outlines with a small family of repeated corner radii.
- The current app mixes faint translucent blue, cyan, pink, and purple borders with several close but visibly different radii across prompt cards, goal cards, Benefits cards, auth fields, sheets, and panels.
- Some components consequently feel softer or heavier than adjacent components even when they have the same importance.

Desired result:

- Define a small semantic set for field, card, feature-card, and pill radii.
- Define a consistent default outline colour/opacity, reserving pink or cyan borders for a meaningful state rather than incidental component variation.

Completion check:

- Produce a component inventory before changing tokens.
- Recheck every primary screen; do not flatten intentional hierarchy such as the hero card or active navigation state.

### UI-04 — Align the global typography character with the mockups

Status: `DECISION`
Priority: P1 system
Screens: All

Current inconsistency:

- The app uses very heavy weights and tight tracking for many card labels, headings, buttons, and metadata.
- The mockups pair bold display headings with visibly lighter, more open card copy and navigation labels.
- Home and Ask secondary cards are the clearest mismatch: current copy feels compact and emphatic where the reference feels spacious and conversational.

Desired result:

- Keep strong Future You display headings while reducing weight and tightening only where the reference does.
- Create explicit display, section-heading, card-title, body, metadata, and navigation styles instead of locally approximating each one.
- Preserve all Apple-aligned minimum sizes.

Decision needed:

- Confirm whether to keep the current system/Inter stack or introduce an approved bundled web font that more closely matches the reference. No remote font dependency should be added casually.

Completion check:

- Review the same copy at phone, tablet, and desktop widths.
- Rerun the text-floor, zoom, overflow, and visual-regression gates.

### UI-05 — Bring the Welcome screen closer to the full-bleed reference

Status: `OPEN`
Priority: P1 screen
Screens: Welcome

Current inconsistency:

- The reference is a clean full-white canvas with the logo, compact `Login / Or Sign Up` hierarchy, and two actions.
- The current screen places everything inside a large elevated rounded panel on a tinted background and adds a large marketing headline plus trust copy.
- The additional content makes the entry screen feel like a marketing page rather than the sparse app gateway shown in the reference.

Desired result:

- Retain the approved Future You proposition and privacy wording, but reconsider whether they should be visually subordinate, moved, or progressively disclosed.
- Reduce the visual dominance of the outer card and align the logo/action proportions more closely with the reference.

Completion check:

- Do not remove useful privacy information without an explicit content decision.
- Preserve the existing Sign in and Create account destinations.

### UI-06 — Reproduce the Login/Signup curved-header geometry

Status: `OPEN`
Priority: P1 screen
Screens: Login, Signup

Current inconsistency:

- Reference Login and Signup use a full-bleed blue field that meets the top and side edges and terminates in one large asymmetric curve.
- Current Login places a related shape inside an inset panel; current Signup uses a short rectangular gradient header without the defining curve.
- The two current auth screens therefore do not look like members of the same reference family.

Desired result:

- Create one shared auth-header geometry with controlled variants for Login and Signup.
- Keep safe-area padding and responsive desktop composition while matching the mobile silhouette.

Completion check:

- Confirm no clipping at `360 × 800` and no excessive empty blue field at desktop widths.
- Preserve current auth logic and accessible heading structure.

### UI-07 — Match the outlined-field label treatment

Status: `OPEN`
Priority: P1 component
Screens: Login, Signup, onboarding/settings where appropriate

Current inconsistency:

- The reference places each field label into a break in the outline, similar to a `fieldset` legend.
- Current auth labels sit above fully closed rounded rectangles, producing a different rhythm and more vertical separation.

Desired result:

- Implement a robust floating/legend label treatment for auth fields first.
- Do not rely on placeholder-only labels or obscure the label when a value is present.

Completion check:

- Test empty, focused, populated, autofilled, invalid, password-visible, and password-hidden states.
- Preserve label/input programmatic association and the 44px control target.

### UI-08 — Correct the Home hero hierarchy and decorative treatment

Status: `OPEN`
Priority: P1 screen
Screens: Home

Current inconsistency:

- Reference `Ask Future You` is a dominant two-line display element and the purchase question is secondary.
- Current `Ask Future You` is a smaller single line while the purchase question carries nearly all the visual emphasis.
- Reference uses a cluster of yellow spark shapes; current uses one star glyph.
- The recently corrected circular triangle action is aligned and should be preserved.

Desired result:

- Restore the two-level hero hierarchy without changing the supported £650-trip prompt or destination.
- Replace the single text star with a small accessible decorative cluster that matches the mockup geometry.

Completion check:

- Ensure the purchase question still remains understandable and does not overlap the action circle at 200% text scaling.

### UI-09 — Rework Home secondary actions into the reference rail language

Status: `OPEN`
Priority: P1 screen
Screens: Home

Current inconsistency:

- Reference uses an `Or Try:` label and a horizontally continuing rail of tall outlined cards.
- Current Home uses an uppercase micro-label and a fixed two-column grid with a full-width final card.
- Current card copy is bolder and denser than the reference.

Desired result:

- Use the rail/card rhythm from the reference while retaining only approved supported prompts.
- Keep the newly approved action triangles and the current exact destinations.

Completion check:

- Prove horizontal scrolling and focus order are usable with keyboard and touch.
- Do not add the unsupported reference prompts listed later in this document.

### UI-10 — Add the missing grouped overview frame

Status: `DECISION`
Priority: P1 screen
Screens: Home lower section

Current inconsistency:

- Reference groups `Your Future Right Now`, goal cards, and the nearby bottom navigation inside one large outlined pale-gradient frame.
- Current Home renders the section directly on the page with separate cards and a globally fixed navigation bar.
- This loses one of the reference's strongest grouping devices.

Desired result:

- Decide whether to reproduce the outer overview frame while keeping navigation global/fixed, or to use the frame only around the financial content.
- Avoid nesting a fixed navigation control inside scrollable financial content merely for visual imitation.

Completion check:

- The chosen frame must work on phone, tablet, and desktop and must not cause nested scrolling or nav occlusion.

### UI-11 — Simplify the goal-card information hierarchy

Status: `OPEN`
Priority: P1 component
Screens: Home, Goals, stored hypothetical Goals

Current inconsistency:

- The reference overview cards lead with goal name and completion date, with the ring and segmented bar as the main visuals.
- Current cards add status, current/target money, `Expected`, and the date within a relatively compact space.
- On Home, the extra labels compete with the ring and progress bar; on Goals, full-width cards contain substantial unused space between header and balance.

Desired result:

- Establish distinct compact and detailed variants rather than shrinking the same information into both contexts.
- Home should prioritise name, date, ring, and bar. Goals may retain balances but should use a more deliberate alignment and spacing system.
- Preserve the recently approved ring geometry, 1.5× bar height, flat partial end cap, staccato segmentation, gradient, and server-authored values.

Completion check:

- Every displayed value must still come verbatim from the DTO.
- Compare partial, zero, and 100% states plus long goal names and large monetary values.

### UI-12 — Resolve the Goals-screen relationship to the supplied goal-management mockup

Status: `DECISION`
Priority: P1 product/UI boundary
Screens: Goals, financial-context settings

Current inconsistency:

- Reference `6` presents Goals as a simple management list with targets and an `Add another goal` action.
- The approved product presents Goals as a current-path tracking surface, while goal creation/correction belongs to immutable financial-context onboarding/settings.

Desired result:

- Do not copy the reference interaction literally.
- Decide whether Goals should visually borrow the reference's simple row hierarchy and offer a clearly labelled route to financial-context correction, or remain a tracking-only card surface.

Completion check:

- No direct mutable goal edit may bypass context versioning.
- Any route to add/correct a goal must create a new immutable context version through the existing flow.

### UI-13 — Match Ask prompt-card typography and proportions

Status: `OPEN`
Priority: P1 screen
Screens: Ask initial state

Current inconsistency:

- The overall horizontal card rail is close to the reference.
- Reference card copy is larger, lighter, and positioned with more breathing room; current copy is smaller, bold, and broken across more short lines.
- The approved triangle actions now align in form but make the remaining type-scale difference more visible.

Desired result:

- Increase card-title scale and reduce weight while preserving the 17px floor and current supported wording.
- Rebalance icon, title, and triangle positions as one composition.

Completion check:

- Test the longest supported prompt at 360px width and 200% text scaling.
- Preserve the existing click target, submit behaviour, and deterministic conversation flow.

### UI-14 — Standardise the shared wordmark and Ask header chrome

Status: `IN PROGRESS`
Priority: P2 screen
Screens: Login, Signup, Home, Goals, Ask, Benefits

Current inconsistency:

- Reference uses a larger `FUTUREYOUAI` wordmark and a quiet grey three-line history/menu glyph without a surrounding circle.
- The current signed-in wordmark is smaller, and Login/Signup introduce a compact angular symbol-and-copy lockup that is not used elsewhere in the app.
- The current Ask history control is a bordered circular button with strong blue lines.

Desired result:

- Use one larger text wordmark across auth forms and the signed-in shell. Reserve the full angular symbol for the Welcome identity screen rather than introducing a unique compact version on Login/Signup.
- Reduce the Ask history control's visual weight while retaining a 44px hit region, focus state, dialog semantics, and accessible name.

Completion check:

- The visual glyph may be smaller than the hit region, but it must remain legible and scale with the established icon system.

Implementation under review:

- The shared `FUTURE YOU AI` wordmark now renders at 17px in the signed-in shell and on Login/Signup.
- The compact angular symbol was removed from Login/Signup; the full symbol remains on Welcome only.
- The Ask history-control styling remains open within this item.

### UI-15 — Reconcile the bottom-navigation geometry

Status: `OPEN`
Priority: P2 system
Screens: Home, Goals, Ask, Benefits

Current inconsistency:

- Both versions use a floating grey capsule, but the reference uses a smaller blue active treatment with more compact icon/label pairing.
- Current active item is a wide pink-purple-blue gradient block and visually dominates content on shorter screens.
- On Benefits, the fixed nav visibly overlays the start of the Opportunities card in the captured viewport.

Desired result:

- Keep the current palette if preferred, but tune capsule height, active width, shadow, bottom offset, and content clearance to match the reference's lighter footprint.
- Ensure obscured content can always scroll fully above the nav.

Completion check:

- Test four destinations at 360px and 414px widths, browser zoom, keyboard focus, and safe-area insets.
- Keep every navigation target at least 44px.

### UI-16 — Give the Home opportunity/Benefits handoff the reference structure

Status: `DECISION`
Priority: P2 screen
Screens: Home lower section

Current inconsistency:

- Reference uses a large `Future You Spotted` outer panel, an inset blue opportunity card, an explicit value line, and a pink CTA.
- Current no-opportunity handoff is one compact blue card. It communicates the safe numerically inert state correctly, but its structure is much less recognisable as the reference feature.

Desired result:

- Reproduce the outer/inner visual hierarchy without inventing an opportunity, monetary value, eligibility result, or recommendation.
- When no verified opportunity exists, the copy and CTA must remain truthful and informational.

Completion check:

- Test authoritative fact, no workplace, and no verified catalogue states.
- Provider calls must remain zero and benefits must remain numerically inert.

### UI-17 — Review Benefits content density and section spacing

Status: `OPEN`
Priority: P2 screen
Screens: Benefits

Current inconsistency:

- There is no dedicated reference Benefits detail page, but the current surface is visibly denser than the reference language used elsewhere.
- The active pension card contains two contribution boxes, two explanatory paragraphs, a divider, and disclosure within one large saturated panel.
- The next Opportunities panel begins beneath the fixed navigation in the canonical capture.

Desired result:

- Apply the same card hierarchy, spacing, border, and typography system agreed in UI-03/UI-04.
- Improve scan order without converting confirmed facts into recommendations or opportunities.

Completion check:

- Preserve the explicit distinction between confirmed active facts and unverified opportunities.
- Confirm the entire final card can be scrolled above the navigation.

### UI-18 — Standardise small labels and casing

Status: `OPEN`
Priority: P2 polish
Screens: All

Current inconsistency:

- Similar labels alternate among sentence case, title case, and all caps: `Your current path`, `ON TRACK`, `BEFORE AND AFTER`, `WORKPLACE`, `What your plan confirms`, and others.
- Letter spacing and weight also vary between labels that serve the same hierarchical role.

Desired result:

- Define a small-label style and a short list of legitimate semantic variants.
- Keep casing meaningful rather than using all caps to compensate for weak hierarchy.

Completion check:

- Inventory labels before changing copy.
- Do not alter financial meaning, status values, or accessibility labels.

## Explicitly not UI fixes under the current MVP contract

The following mockup differences are intentional scope or authority differences. They must not be implemented through this checklist unless a new product contract explicitly approves them.

- Do not add `What should I prioritise?`; automatic priority recommendations are excluded.
- Do not add `Future You Wrapped`; it is not an approved intent or surface.
- Do not add microphone, voice, file-upload, attachment, web-search, or provider tools to Ask.
- Do not add a notification bell unless a real notification model and accessible destination are separately specified.
- Do not add direct mutable `Add another goal` behaviour to Goals; context changes remain immutable and versioned.
- Do not restore Company ID as a required signup field; workplace information remains optional and separate from account creation.
- Do not copy the mockup's goal amounts, percentages, dates, employer benefit value, or persona name. Sarah's canonical data remains authoritative.
- Do not fabricate pension-match savings or another benefit amount to populate `Future You Spotted`.
- Do not replace the requested eye/eye-off password control with the reference lock icon.
- Do not remove useful loading, error, stale-context, hypothetical, or historical warnings merely because the static mockups omit them.

## Recently corrected and provisionally locked

These items were already reviewed and should not be reopened incidentally while completing another fix:

- Repeated `Current plan` banners were removed from normal primary surfaces.
- The header uses an actual fictional profile portrait.
- Password visibility uses accessible eye/eye-off React icons.
- Goal rings use a solid purple inner disc, white percentage, wider white gap, thin pale track, thick rounded funded arc, and enlarged geometry.
- Horizontal goal bars use the cyan-blue gradient, staccato separators, 1.5× height, and a flat right edge until the server supplies `100%`.
- Interactive arrow glyphs use the mockup-style rotated triangle.
- Visible text and meaningful icons follow the Apple-aligned size floors and scaling checks.

## Working method

For each item:

1. Confirm the desired visual result and whether the item remains UI-only.
2. Change its status to `IN PROGRESS`.
3. Implement the smallest coherent change.
4. Add or update renderer, geometry, accessibility, and visual-regression coverage in proportion to risk.
5. Review the new `414 × 896` evidence beside the supplied PNG/SVG.
6. Check phone, tablet, desktop, zoom, overflow, and keyboard behavior where the shared shell is affected.
7. Mark it `DONE` only after the user approves the result.

The recommended first item is **UI-01 — Fix the clipped Benefits header**, because it is a visible defect in a shared product-shell element rather than a subjective styling preference.
