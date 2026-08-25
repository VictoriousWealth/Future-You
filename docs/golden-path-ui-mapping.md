# Future You — Golden-Path UI Mapping

**Version:** 1.0  
**Status:** Frozen for MVP specification  
**Canonical profile:** Sarah v1  
**Visual source of truth:** The seven supplied 414 × 896 mobile mockups and matching SVGs  
**Depends on:** `employer-provisioned-registration-contract.md`, `simulation-rules-specification.md` and `golden-path-conversation-specification.md`
**Scope:** Screen hierarchy, states, transitions and content  
**Out of scope:** Frontend, backend, database, LLM and deployment architecture

**Registration-flow supersession:** `employer-provisioned-registration-contract.md` is authoritative
for Register and Login. The supplied Company ID concept is now retained and expanded into workplace
details, work-email code verification and personal-account creation before financial onboarding.

## 0. Closure of unresolved golden-path behaviours

None of the five items blocks this UI mapping, provided incomplete and assumption-dependent states remain explicit. They are classified as follows.

| Unresolved behaviour | Classification | Reason |
|---|---|---|
| Season-ticket-loan simulation terms | **MUST resolve before MVP implementation** | The UI can show an Eligibility unknown opportunity and collect missing information now. A numerical “see what changes” result cannot be implemented until eligibility, loan amount, repayment, fees, timing and replaced transport expense are defined. |
| Exact intra-month minimum date | **Safe to defer beyond MVP** | The conservative timing rule already produces the frozen £250 minimum and classification. The MVP should display the month and disclose the timing assumption, but it need not claim an exact day. |
| Replacement target for “I don't care about £900” | **Safe to defer beyond MVP** | There should be no product-selected default. The correct MVP behaviour is to ask Sarah for the safety level she wants to test. Suggested presets or automatic target recommendations can wait. |
| Save-first funding policy | **MUST resolve before MVP implementation** | A UI can offer the idea, but a numerical branch requires an explicit rule for which goal contributions may be redirected, by how much and for how long. A live CTA must not lead to an invented funding plan. |
| Trip-cost composition | **MUST resolve before MVP implementation** | The golden path can display its one-payment/full-cost assumption. Before assumption editing ships, the product must define how deposits, instalments, later trip spending and routine-spending substitution are entered and simulated. |

No unresolved value is selected merely to make the screens easier to design. Where a calculation cannot yet exist, the mapped UI ends in a clearly labelled needs-information state.

## 1. Visual constraints inherited from the supplied UI

The mapping preserves the supplied design rather than redesigning it.

### 1.1 Retained visual language

- Mobile-first 414 × 896 composition
- White background with pale blue-to-pink card gradients
- Deep blue `#004AAD` as the main brand and action colour
- Bright blue `#5271FF`, cyan `#38B6FF`, purple `#8C5BEA` and pink `#DE53AD` accents
- Large rounded cards and pill controls
- Thin blue or lilac outlines
- Bold geometric headings and light body text
- Friendly outline icons
- Fixed four-item navigation: Home, Goals, Ask and Benefits
- Horizontal swipeable prompt and option cards
- Blue gradient hero cards for the highest-priority action

### 1.2 Necessary consistency corrections

These are not visual redesigns:

- Change “Jenny” to Sarah.
- Keep the bottom navigation fixed and outside content cards.
- Remove text overlaps and accidental clipping.
- Give horizontal carousels a visible partial next card or position indicator.
- Use one active-navigation treatment consistently.
- Replace prototype financial values with Sarah v1 values.
- Use accessible text contrast and tap targets while retaining the palette.
- Keep hypothetical labels visible wherever scenario values appear.

### 1.3 Source-of-truth hierarchy

The supplied mockups are the **visual source of truth** for:

- Palette and gradients
- Rounded-card language
- Typography character
- Navigation
- Mobile-first composition
- General visual energy

They are not the behavioural source of truth.

Product behaviour is governed, in order, by:

1. `simulation-rules-specification.md`
2. `golden-path-conversation-specification.md`
3. This frozen UI mapping
4. The approved MVP specification

The first three documents define product meaning and interaction behaviour. The approved MVP specification determines which defined capabilities are included in version one.

An old prototype label, prompt, value or control MUST NOT reintroduce a discarded or undefined capability merely because it appears in a mockup.

## 2. Golden-path screen journey

The journey uses one primary Home screen, one primary Ask screen, the existing Goals screen and one missing Benefits screen. Results and alternatives are states inside Ask rather than separate pages.

```text
Home
  └─ tap “Can I afford something?”
       ↓ navigation transition
Ask — initial state
  └─ submit “Can I afford a £650 trip next month?”
       ↓ changed state on the same screen
Ask — £650 result
  ├─ expand before/after impact
  ├─ expand “How we calculated this”
  └─ compare options
       ↓ changed selection on the same screen
Ask — £500 / £400 option selected
  └─ ask “What if I wait until October?”
       ↓ new saved option on the same screen
Ask — October option selected
  └─ see employer opportunity
       ↓ bottom sheet or Ask clarification state
Trip + season-ticket loan — needs information
  └─ close and select “Your current path”
       ↓ changed state; baseline remains unchanged
```

### 2.1 State and transition classification

| Journey step | UI form |
|---|---|
| Open app as returning Sarah | Home screen |
| Tap “Can I afford something?” | Navigation transition to Ask |
| Enter and submit question | Ask initial state; composer interaction |
| Brief calculation feedback | Changed state within Ask |
| Receive £650 answer | Changed state within Ask |
| View before/after | Expandable section inside the answer |
| Compare £650, £500 and £400 | Expandable comparison section inside Ask |
| Select an amount | Changed selected state within Ask |
| Ask about October | New conversation message and saved option within Ask |
| View scenario list | Bottom sheet from Ask |
| View assumptions | Expandable “How we calculated this” section |
| Edit assumptions | Bottom sheet; save as another option |
| See season-ticket-loan opportunity | Inline card in Ask |
| Explore incomplete benefit | Ask clarification state or bottom sheet; no numeric result |
| View benefit outside the conversation | Navigation transition to Benefits |
| View goal impact from a result | Navigation transition to a hypothetical preview state in Goals |

There is no separate result page, ledger page or alternative page.

## 3. Home

### 3.1 Role

Home answers:

> What are you considering?

It is an entry point into financial decisions, not an account dashboard.

### 3.2 Layout mapped to supplied screens 4 and 5

#### Header

Keep the supplied header:

- “Good morning, Sarah Wonk”
- Notification icon
- Profile image

No bank balance appears in the header.

#### Primary Ask Future You card

Keep the large blue gradient hero card from screen 4.

Content:

> ✨ Ask Future You  
> Can I afford a £650 trip?

The circular arrow starts a new decision in Ask. The example may rotate, but “Can I afford…” remains the primary message.

#### Suggested decisions

Keep the outlined gradient prompt-card carousel, but separate visual concepts from MVP-supported prompts.

**Core MVP prompts backed by specified behaviour**

- Can I afford something?
- What if it cost less?
- What if I waited a month?
- How would a purchase change my goals?

**Future or placeholder concepts—not MVP commitments**

- How am I doing?
- What should I prioritise?
- Future You Wrapped
- Let's amend my goals

Placeholder concepts may remain in design exploration to preserve the carousel composition, but production MVP copy MUST use supported prompts. The first core card receives the strongest ordering and focus, not a radically different visual style.

#### Future right now preview

Screen 5 becomes the lower, scrollable continuation of Home rather than a separate dashboard.

It shows a compact baseline preview:

| Goal | Progress | Current-path completion |
|---|---:|---|
| Emergency fund | £3,300 / £4,500 · 73% | December 2026 |
| House deposit | £7,200 / £25,000 · 29% | June 2029 |
| Holiday | £350 / £1,200 · 29% | May 2027 |

A small status row may show:

> Safety buffer at preferred level · **£900**

This is the only cash figure Home needs. Sarah's £2,750 current-account balance is not a hero number because it does not answer the decision-first question.

Home must not claim that goals are “on track,” because Sarah v1 does not contain user deadlines against which to measure that claim.

#### Opportunity preview

Keep the “Future You spotted” card treatment from screen 5, but use non-fabricated copy:

> **Future You spotted**  
> OniBank lists a season-ticket loan. Your eligibility has not been confirmed.  
> **See details →**

Do not show the prototype's “£50/year” value.

### 3.3 Tap behaviour

When Sarah taps **Can I afford something?**:

1. Navigate to Ask.
2. Start a new decision thread.
3. Focus the composer.
4. Show a lightweight prompt such as “What are you considering, how much is it, and when?”

Sarah is not taken through a form. Her existing context is already available.

## 4. Ask — initial state

### 4.1 Mapping to supplied screen 7

Keep screen 7's structure and visual treatment:

- Small Future You wordmark
- Large “Welcome back, Sarah!” heading
- “What are you thinking about?” prompt
- Swipeable suggestion cards
- Large rounded composer
- Fixed bottom navigation with Ask active

Replace “Jenny” with Sarah.

### 4.2 Initial content

Suggested prompts prioritise decisions:

- Can I afford a £650 trip?
- Can I afford something?
- What if it cost less?
- What if I waited a month?
- How would a purchase change my goals?

“How am I doing?”, “What should I prioritise?” and “Future You Wrapped” remain future concepts until their deterministic behaviour is specified.

Existing conversation history is accessible from the menu, but it does not displace the new-question experience.

### 4.3 Existing-context indication

A small outlined context pill appears above the composer or below the heading:

> Using your current plan · Updated 31 Aug

Tapping it reveals the financial-context summary. It is reassurance that Future You knows Sarah; it is not a compulsory review step.

No assumptions are displayed before Sarah asks a question because no scenario exists yet.

### 4.4 Input

Keep the supplied rounded “Start a new chat” composer with:

- Text entry
- Add/context action
- Optional voice input
- Submit arrow

Sarah can type the canonical question directly. No amount, date or category form blocks submission.

## 5. Ask — £650 result state

### 5.1 Screen behaviour

The result is a changed state within Ask.

- The oversized welcome area collapses into a compact Ask header.
- Sarah's question appears as a user message.
- Future You's answer appears directly beneath it.
- The composer and bottom navigation remain fixed.
- The conversation and result cards scroll vertically.

### 5.2 First visible answer

The first response card uses the supplied deep-blue gradient, rounded corners and white type.

**Headline**

> You can pay for it, but your buffer gets tight.

**Classification pill**

> Affordable · Significant trade-off

**Direct answer**

> The £650 trip would reduce your £900 safety buffer to £250. Your bills stay covered, you don't use your overdraft, and your buffer returns to £900 in November.

### 5.3 Immediate-impact strip

Four compact values appear inside or immediately below the answer card:

| Buffer | Bills | Overdraft | Recovery |
|---|---|---|---|
| **£900 → £250** | **Covered** | **£0 used** | **November** |

These five facts—the classification plus the four metrics—must be visible without opening the ledger.

### 5.4 Future-impact card

Immediately following the answer is a pale gradient card titled:

> **How your future changes**

| Goal | Your current path | With £650 trip |
|---|---|---|
| Emergency fund | Dec 2026 | **Feb 2027 · 2 months later** |
| Holiday | May 2027 | **Jun 2027 · 1 month later** |
| House deposit | Jun 2029 | **Jul 2029 · 1 month later** |

All three future impacts are visible in the result flow. They are not buried inside “How we calculated this.”

### 5.5 Assumption row

Below the result:

> **Assuming:** one £650 payment from your current account before September payday, in addition to normal spending. **Edit**

This uses a slim outlined pill or compact row rather than another dominant card.

### 5.6 Primary actions

- Compare options
- See monthly path
- How we calculated this
- View impact in Goals

The first two are most prominent. None navigates to a separate generic finance dashboard.

## 6. Before versus after representation

### 6.1 Immediate comparison

Use two visually paired columns within one rounded card:

- **Your current path** — white or pale-blue surface
- **£650 trip · What-if** — pale pink/lilac surface

The comparison uses rows rather than charts:

| Impact | Your current path | £650 trip |
|---|---:|---:|
| Lowest safety buffer | £900 | £250 |
| Bills | Covered | Covered |
| Overdraft | £0 | £0 |
| Buffer restored | Already at target | November |

An arrow or colour change emphasises altered values. Equal outcomes use small confirmation icons and less visual weight.

### 6.2 Future comparison

Goal dates use the same two-column structure directly below the immediate comparison. Avoid progress charts because the central question is date movement, not historical saving performance.

### 6.3 Initially visible versus expandable

**Immediately visible**

- Classification
- Safety-buffer change
- Bills and overdraft status
- Recovery month
- Three goal-date changes

**Expandable: See monthly path**

- September closing account: £2,100, containing £1,850 October reserve and £250 buffer
- October buffer: £850
- November buffer: £900
- Goal contribution changes for each month
- Full six-month baseline and scenario comparison

The ledger is evidence for the answer, not the first thing Sarah sees.

## 7. Alternatives

### 7.1 Presentation

**Compare options** expands a horizontal row of rounded cards using the supplied prompt-card language.

| Option | Status | Lowest buffer | Key future effect |
|---|---|---:|---|
| £650 trip | Significant trade-off | £250 | Emergency fund Feb 2027 |
| £500 option | Significant trade-off | £400 | Emergency fund Jan 2027 |
| £400 option | Noticeable trade-off | £500 | Emergency fund Jan 2027 |

Each card includes a small **What-if** label. The £650 card initially has the selected blue-gradient treatment.

### 7.2 Selection behaviour

Selecting £500 or £400:

- Changes the selected scenario pill
- Updates the result and before/after cards
- Adds a comparison message to the conversation when selected through chat
- Leaves the original £650 option available
- Leaves the other option available
- Keeps **Your current path** pinned as the comparison anchor

The selected card changes; the original scenario is not overwritten.

### 7.3 Meaningful boundary

The £400 card receives a small explanatory marker:

> Moves to a noticeable trade-off

Opening it explains that the £500 option leaves a £400 buffer, below half of Sarah's preference, whereas the £400 option leaves a £500 buffer, above half, and recovers in October. The UI must not say that the £400 trip is objectively the correct choice.

### 7.4 October timing option

After Sarah asks “What if I wait until October?”, a new option appears:

> **Go in October** · £650 · Significant trade-off

Its compact explanation states:

> Shifts the tight month to October. Lowest buffer and goal dates stay the same.

The detailed comparison shows:

- September closing buffer: £900 rather than £250
- October lowest buffer: £250
- October closing buffer: £850
- Buffer restored: November
- Emergency fund: February 2027
- Holiday: June 2027
- House deposit: July 2029

Waiting must not receive a positive “better” badge because it does not improve the frozen goal dates.

## 8. Assumptions

### 8.1 Main result

The compact assumption row is always attached to the selected what-if result. It does not appear as part of Sarah's confirmed profile.

### 8.2 How we calculated this

Tapping **How we calculated this** expands a section within the conversation. It contains:

1. **What we know**
   - Current account £2,750
   - £1,850 spending reserve
   - £900 preferred buffer
   - £2,450 take-home pay
   - Goal balances and allocation plan
2. **What we assumed**
   - £650 is the full additional cost
   - One payment before September payday
   - Paid from the current account
   - No spending substitution
3. **What is hypothetical**
   - Trip and all alternatives
4. **What we did not include**
   - Overdraft as available money
   - Season-ticket-loan effect
   - Additional pension match
5. **Confidence**
   - Medium until the payment assumptions are confirmed

Detailed provenance can sit one level deeper. It should not appear in the primary card.

### 8.3 Edit assumptions sheet

Tapping **Edit** opens a rounded bottom sheet consistent with the supplied UI.

It shows:

- Payment timing: before September payday
- Payment pattern: one payment
- Funding source: current account
- Cost treatment: additional to normal spending

Saving edits uses the action:

> **Compare as another option**

It creates another what-if and keeps both Sarah's baseline and the original £650 result unchanged.

The exact instalment and spending-substitution controls remain an MVP-implementation prerequisite; this mapping does not invent their financial behaviour.

## 9. Goals

### 9.1 Default state

The supplied Goals screen remains Sarah's confirmed plan by default.

Each goal card shows:

| Goal | Current / target | Current-path completion |
|---|---|---|
| Emergency fund | £3,300 / £4,500 | December 2026 |
| House deposit | £7,200 / £25,000 | June 2029 |
| Holiday | £350 / £1,200 | May 2027 |

The progress indicators show approximately 73%, 29% and 29% respectively.

The add-goal row and fixed navigation remain as supplied.

### 9.2 Hypothetical preview state

Sarah enters this state only by selecting **View impact in Goals** from a scenario result.

A persistent banner at the top of the goal list states:

> **Previewing: £650 trip · Hypothetical**  
> Your current plan has not changed.  
> **Return to current path**

Each affected card shows both dates:

**Emergency fund**

- Your current path: December 2026
- With £650 trip: February 2027
- 2 months later

**House deposit**

- Your current path: June 2029
- With £650 trip: July 2029
- 1 month later

**Holiday**

- Your current path: May 2027
- With £650 trip: June 2027
- 1 month later

The current balances remain £3,300, £7,200 and £350 because the trip is hypothetical and has not happened.

### 9.3 Navigation rule

Tapping Goals normally from the bottom navigation opens **Your current path**. Scenario preview occurs through the explicit **View impact in Goals** action, preventing a hypothetical forecast from looking like Sarah's real plan.

Ask remembers the previously selected what-if even when Goals defaults back to the current path.

## 10. Benefits

### 10.1 Base Benefits screen

The supplied mockups contain a Benefits navigation item and opportunity card but no complete Benefits screen. One primary screen is required.

It reuses:

- The screen 5 “Future You spotted” card style
- Pale gradient containers
- Blue outlined status pills
- Fixed Benefits-active bottom navigation

### 10.2 Season-ticket-loan card

The main golden-path opportunity card shows:

> **Season-ticket loan**  
> Offered by OniBank  
> **Eligibility unknown**  
> Not included in your current plan

Supporting copy:

> We need a few details before we can calculate what this would change.

Required information:

- Eligibility confirmation
- Loan amount
- Disbursement/start date
- Payroll repayment amount and schedule
- Fees, if any
- Which transport expense it replaces or changes

Actions:

- **Explore in Ask**
- **Why we need this**

No potential saving or annual value appears.

### 10.3 Opportunity exploration from Ask

From the trip result, **See what changes** creates:

> Trip + season-ticket loan · Needs information

Future You asks for the missing terms in conversation. A bottom sheet may summarise the missing checklist, but the conversation remains the primary interface.

Until sufficient information exists:

- No numeric result card appears.
- The £650 result remains unchanged.
- The current path remains unchanged.
- The opportunity does not become Active or Simulated.

### 10.4 Other benefit context

The Benefits screen may also show the pension-match opportunity using Sarah's confirmed 3% and OniBank's available match up to 5%, but no spendable-income value or numeric scenario appears until the take-home-pay effect is quantified.

## 11. Scenario identity

### 11.1 User-facing convention

The interface never uses “branch,” B0, S1 or similar internal identifiers.

It uses:

| User-facing label | Status label |
|---|---|
| Your current path | Current |
| £650 trip | What-if |
| £500 option | What-if |
| £400 option | What-if |
| Go in October | What-if |
| Trip + season-ticket loan | Needs information, then Simulated |

### 11.2 Persistent viewing pill

Ask displays a compact pill below its header:

> Viewing: **£650 trip** · What-if

Tapping it opens the scenario bottom sheet.

### 11.3 Scenario bottom sheet

The sheet groups:

1. **Your current path** — always first and pinned
2. **Trip options** — £650, £500, £400 and Go in October
3. **With opportunities** — Trip + season-ticket loan, marked Needs information

Selecting an item changes the viewed result. It does not change current context.

### 11.4 Visual distinction

- Current path: white/pale-blue surface with blue outline
- Selected what-if: blue gradient or blue-filled pill
- Unselected what-if: pale gradient with lilac outline
- Opportunity scenario: pink/purple accent
- Needs information: outline treatment with an explicit status label

Colour is reinforced by text; it is not the only indicator.

## 12. Confidence and detailed calculation

### 12.1 Main result placement

Confidence does not compete with the answer headline. The main result shows only the compact assumption row.

### 12.2 How we calculated this hierarchy

The expandable section presents, in order:

1. Plain-language explanation of the buffer and goal delays
2. Assumptions used
3. Confidence: Medium
4. Current financial context used
5. Excluded values and opportunities
6. Monthly ledger
7. Input provenance and last-confirmed dates

The first three items should be readable without financial expertise. The ledger remains available for trust and verification.

### 12.3 Confidence changes

If Sarah confirms the payment timing, pattern and source, the selected scenario may show High confidence. That confirmation applies to the selected what-if only; it does not turn the trip into a real transaction.

## 13. Existing mockup mapping

> **Post-B1 correction:** `sarah-employer-and-benefits-correction-contract.md` supersedes the historical
> sparse Slice 6 Sarah state. Explicit OniBank records now support informational additional-match and
> season-ticket-loan cards on Home/Benefits, with unknown eligibility, inactive uptake and no numerical
> effect. The no-inference and no-Ask-branch rules remain unchanged.

| Supplied screen | Classification | Mapping and required change |
|---|---|---|
| 1 — Welcome/login choice | **Keep almost unchanged** | Retain brand, proportions, buttons and palette. It is outside the returning-Sarah golden path. |
| 2 — Login form | **Keep almost unchanged** | Retain the authentication layout. It is not shown because Sarah is already signed in. |
| 3 — Signup/company ID | **Keep and expand** | Register begins with Company ID + provisioned work email, continues to work-email code verification, then requests personal email + chosen password. The verified employer association is established before financial onboarding and is not re-entered there. |
| 4 — Greeting, Ask hero and prompt cards | **Keep but modify content/layout** | This is Home's upper section. Preserve composition; fix text overlap, use Sarah consistently and keep navigation fixed. |
| 5 — Future right now and opportunity | **Repurpose** | This becomes Home's lower scroll section, not a separate dashboard. Replace prototype progress, dates and fabricated benefit value with Sarah v1 data. |
| 6 — Goals list | **Keep but modify content/layout** | Preserve the goal-card structure. Add current balance, correct target/date values and a clearly labelled hypothetical-preview state. |
| 7 — Ask start | **Keep but modify content/layout** | This is Ask's initial state. Change Jenny to Sarah, add current-plan context pill, and support conversation/result states in the same shell. |

No supplied screen is discarded. The existing set lacks result, scenario and Benefits states required by the golden path.

## 14. Minimum missing screens and states

### 14.1 One missing primary screen

**Benefits** is the only new primary navigation screen required. Its content and visual system derive from screen 5's opportunity card.

### 14.2 Missing states inside existing screens

1. Ask — brief calculating state
2. Ask — £650 result
3. Ask — before/after expanded
4. Ask — alternatives expanded and selected-option variants
5. Ask — October timing option
6. Ask — opportunity needs-information state
7. Goals — hypothetical preview

### 14.3 Missing sheets/expanders

1. Scenario selector bottom sheet
2. Edit assumptions bottom sheet
3. How we calculated this expandable section
4. Opportunity missing-information summary

These are states, not additional destination screens.

Detailed onboarding screens remain a broader product requirement, but they are not added here because Sarah already has complete frozen context and the golden path does not traverse onboarding.

## 15. End-to-end UI walkthrough

| Step | Screen | Sarah's action | Main visible content | Viewed state | What changes | What remains unchanged |
|---|---|---|---|---|---|---|
| 1 | Home | Opens Future You | Greeting, Ask hero, decision prompts, compact current-path goal preview | Your current path | Nothing | Sarah v1 context and all balances |
| 2 | Home → Ask | Taps “Can I afford something?” | Ask initial state with focused composer and current-plan pill | Your current path | Navigation and active tab | Baseline |
| 3 | Ask | Types “Can I afford a £650 trip next month?” and submits | User message followed by brief calculating state | £650 trip being evaluated | New hypothetical option | Baseline and confirmed context |
| 4 | Ask | Reads result | Affordable · Significant trade-off; £900 → £250; bills covered; £0 overdraft; restored November | £650 trip | Selected what-if | Baseline |
| 5 | Ask | Scrolls to future impact | Emergency Dec → Feb; Holiday May → Jun; House Jun 2029 → Jul 2029 | £650 trip | Detail visibility only | Calculation and all branches |
| 6 | Ask | Opens Compare options | £650, £500 and £400 cards with deterministic impacts | £650 trip selected | Alternative states become visible | Original result and baseline |
| 7 | Ask | Selects £500, then £400 | Result cards update; £400 shows Noticeable trade-off and £500 buffer | Selected amount option | Viewed option | Other options and baseline |
| 8 | Ask | Asks “What if I wait until October?” | Go in October option; £250 low and same goal dates explained | Go in October | New timing option | £650, £500, £400 and baseline |
| 9 | Ask | Reviews assumptions | No employer opportunity is presented because none is authoritatively persisted | Go in October or reselected £650 | Detail visibility only | All calculations |
| 10 | Ask | Opens the scenario selector | Current path and every evaluated trip option remain available | Previous evaluated option | Selector opens | Nothing financial changes |
| 11 | Ask | Selects “Your current path” | Baseline goal dates and £900 buffer; no trip effects | Your current path | Viewed state returns to baseline | Hypothetical options remain saved and Sarah's real context has never changed |

## 16. Product checks

| Constraint | Check |
|---|---|
| Simulation remains the core product | Pass — the central content is a before/after decision result and alternatives |
| Conversation remains the interface | Pass — Sarah asks, follows up and supplies missing opportunity details through Ask |
| Financial context remains input | Pass — it appears only as a compact context indicator and calculation detail |
| Goals remain destinations | Pass — goal dates express the future effects of decisions |
| Benefits remain opportunities | Pass — the season-ticket loan never affects the baseline automatically |
| Baseline and scenarios remain distinct | Pass — Current, What-if, Simulated and Needs information labels remain persistent |
| AI does not invent numbers | Pass — every displayed amount/date comes from Sarah v1 or a calculated scenario; the benefit has no fabricated value |
| Experience avoids budgeting-dashboard drift | Pass — Home leads with questions and does not feature transaction categories or a large balance |
| Sarah v1 remains unchanged | Pass — all profile, goal, buffer and scenario values match the frozen fixtures |
| Existing visual identity is preserved | Pass — screen composition, palette, gradients, rounded cards, typography character and navigation remain the reference |
| Mockups do not define behaviour | Pass — unsupported prototype prompts and values do not become MVP commitments |

### 16.1 UX requirements that still expose missing rules

- **Edit assumptions:** exact deposit, instalment and spending-substitution behaviour must be specified before the sheet can produce every possible recalculation.
- **Save first:** the UI may offer the idea, but it cannot calculate until Sarah selects which contributions can be redirected.
- **Season-ticket-loan comparison:** the Benefits and Ask states can collect information, but no numeric comparison exists without terms.
- **Exact low-balance date:** the MVP can show £250 and “during September,” not an unsupported exact day.

These limitations remain visible and do not alter the mapped core journey.
