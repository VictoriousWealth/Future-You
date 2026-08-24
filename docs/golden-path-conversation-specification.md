# Future You — Golden-Path Conversation Specification

**Version:** 1.0-draft  
**Canonical profile:** Sarah v1  
**Canonical request:** “Can I afford a £650 trip next month?”  
**Depends on:** `simulation-rules-specification.md`  
**Scope:** User experience and conversation behaviour  
**Out of scope:** Frontend, backend, database, LLM and deployment architecture

**Slice 5 scoped amendment:** The approved `conversational-orchestration-slice-5.md` contract supersedes
this document only where it narrows clarification, benefit exploration, intra-month/funding treatments,
or explanation generation. All other conversation rules remain active.

## 0. Purpose

This document defines how Sarah experiences the deterministic simulator through conversation. It does not change the simulation contract or Sarah v1.

The conversation has four responsibilities:

1. Interpret Sarah's request without asking for information Future You already knows.
2. Make scenario assumptions explicit when a safe, conservative assumption avoids an unnecessary question.
3. Present the simulator's result as an understandable future trade-off.
4. Preserve the baseline and every explored branch so Sarah can compare possibilities without confusing them with reality.

The conversation MUST NOT calculate, repair, round or reinterpret simulator results.

## 1. Starting state

### 1.1 What Future You already knows

When Sarah asks the canonical question, Future You has the frozen Sarah v1 context.

#### Identity and pay cycle

- Sarah Wonk, age 25, lives in Manchester.
- She is a Customer Insights Analyst at OniBank.
- Her confirmed take-home pay is £2,450 monthly.
- She is paid on the last working day of each month.
- Each spending cycle is funded by the salary received at the end of the previous month.
- Her take-home amount is already after her current 3% pension contribution and student-loan deduction.

#### Cash and spending

- Actual current-account balance at the start of the September cycle: £2,750.
- £1,850 is reserved for September's normal spending.
- £900 is her preferred unallocated safety buffer.
- Her overdraft limit is £500, but it is excluded from available cash and must not be used silently.
- Her normal monthly spending is £1,850.
- No additional confirmed one-off commitment exists in the six-month canonical baseline.

#### Goals and contribution plan

| Goal | Current | Target | Normal slot |
|---|---:|---:|---:|
| Emergency fund | £3,300 | £4,500 | Up to £300 after house and holiday slots |
| House deposit | £7,200 | £25,000 | £200, plus eligible rollover |
| Holiday | £350 | £1,200 | £100 |

- Normal goal-contribution budget: £600 per monthly cycle.
- Future buffer restoration occurs before uncommitted goal contributions.
- Sarah's September £600 goal transfers are already committed.
- Unused emergency-fund and holiday allocations roll into the house deposit.

#### Employer opportunities

- Sarah's current 3% employee and 3% employer pension contributions are active.
- The additional pension match up to 5% is Available, not Active.
- OniBank's season-ticket loan has Eligibility unknown status.
- Neither opportunity changes the baseline.

### 1.2 What Future You must not ask again

Future You MUST NOT ask Sarah for:

- Her current-account balance
- Her normal income
- Her normal spending
- Her payday
- Her existing goal balances or targets
- Her current goal contributions
- Her preferred £900 safety buffer
- Whether she has an overdraft
- Her current pension percentage
- Her employer

It may offer an **Update my details** action, but it must not turn known context into conversational friction.

### 1.3 Relevant unknowns before the trip scenario

The sentence does not directly confirm:

- The exact payment date
- Whether £650 is the complete additional cost
- Whether it is paid in one transaction or instalments
- Which account or financing method Sarah intends to use
- Whether any normal spending would be substituted by the trip

For the golden path, these can be handled by conservative, disclosed assumptions under section 3. They do not require a blocking question.

## 2. Initial user question

Sarah says:

> Can I afford a £650 trip next month?

### 2.1 Directly known from the request

| Field | Interpreted value | Evidence |
|---|---|---|
| Decision type | One-off spending | Directly stated/intended by the request |
| Amount | £650 | Directly stated |
| Currency | GBP | Symbol and Sarah's profile |
| Approximate timing | September 2026 spending cycle | “Next month” relative to the August 2026 snapshot |
| Purpose | Trip | Directly stated |
| Decision status | Hypothetical | Sarah is asking “can I,” not reporting a completed purchase |

### 2.2 Golden-path interpretation

The canonical scenario uses:

- One £650 payment
- Paid from Sarah's current account
- Additional to the full £1,850 normal-spending envelope
- Paid during the September cycle before September payday
- No credit, overdraft or withdrawal from goal savings
- September's committed £600 goal transfers unchanged

These are scenario assumptions, not changes to Sarah's confirmed context.

## 3. Clarification policy

### 3.1 Core policy

Future You asks the fewest questions needed to avoid a materially misleading calculation.

It follows this order:

1. Reuse applicable confirmed context.
2. Resolve explicit details from the user's sentence.
3. Use a conservative disclosed assumption when one interpretation is reasonable and does not make the result look safer.
4. Ask a concise clarification when plausible interpretations materially diverge.
5. Return insufficient information when no defensible calculation is possible.

### 3.2 MUST ask

Future You MUST ask a clarification when:

- The amount or currency cannot be determined.
- The decision date cannot be placed in a funding cycle.
- A supported one-off purchase is missing its amount or purchase month, or a supported follow-up has a
  missing/ambiguous scenario reference.
- Two plausible interpretations cross a hard-consequence boundary or produce different affordability classes and neither is safely conservative.
- The user asks to change a numeric policy without supplying the new value, such as lowering the £900 safety target without saying to what amount.
- A benefit scenario lacks a material eligibility or repayment term required for calculation.

For Slice 5, instalments, split/mixed payments, credit or overdraft funding, goal-savings funding,
spending substitution and before/after-payday branching within one month are unsupported. They produce a
server-rendered scope response, no clarification intended to construct that scenario, no simulator call
and no complete or incomplete branch. The older clarification behavior remains future product context,
not Slice 5 behavior.

### 3.3 SHOULD ask

Future You SHOULD ask when:

- The wording strongly suggests £650 may be a deposit rather than total cost.
- The travel date and payment date are likely different and that difference changes the result.
- The user appears to expect routine-spending substitution, but no amount is given.
- An existing profile value looks stale or conflicts with the user's message.
- A user-provided estimate has no defensible range and could change the class.

### 3.4 MAY proceed with a disclosed assumption

Future You MAY proceed when:

- The user supplies a month but no exact day and the conservative timing rule produces a stable class.
- “A £650 trip” can reasonably be treated as one £650 additional payment.
- The primary current account is the conservative funding source and the user has not mentioned credit or savings.
- Normal spending remains unchanged because no substitution was stated.
- Currency follows unambiguous profile and message context.

The assumption MUST be visible and editable.

### 3.5 MUST return insufficient information

Future You MUST decline to give a numerical affordability result when:

- Current cash is materially unknown.
- Required bills or repayments are materially unknown.
- No usable income amount or timing exists.
- The proposed amount remains unknown.
- A required payment schedule cannot be resolved or conservatively bounded.
- Unknowns create both a hard-failure and non-hard-failure possibility with no defensible primary case.

The response should identify the minimum missing information needed. This is not a generic refusal.

### 3.6 Decision for Sarah's exact payment date

Future You does **not** ask Sarah for an exact date in the golden path.

Reason:

- “Next month” resolves to the September spending cycle.
- The simulator already defines a conservative month-only timing rule.
- The £250 minimum and affordability class are stable for a payment before September payday.
- Asking for an exact day adds friction without changing the primary answer.

The primary answer states:

> I modelled this as one £650 payment from your current account before your September payday, on top of your usual spending.

Sarah may change the supported purchase month or amount. In Slice 5, an after-payday treatment within the
same month or an instalment request returns the supported-scope response and creates no branch.

## 4. Baseline calculation moment

### 4.1 Conversation-to-simulation handoff

Once the request is sufficiently specified, the conversation performs these product operations:

1. **Read B0:** retrieve Sarah v1's unchanged current-path projection.
2. **Create S1:** clone B0 and add the hypothetical £650 September debit.
3. **Evaluate S1:** run the deterministic ledger, goal allocation and classification rules.
4. **Compare S1 with B0:** calculate immediate, safety and future deltas.
5. **Render:** explain the returned values without changing them.

### 4.2 Required returned result

| Result | Current path B0 | £650 trip S1 |
|---|---:|---:|
| Preferred/lowest safety buffer | £900 | £250 |
| September closing current account | £2,750 | £2,100 |
| Bills covered | Yes | Yes |
| Overdraft used | £0 | £0 |
| Safety buffer restored | Already at target | November 2026 |
| Emergency fund complete | December 2026 | February 2027 |
| Holiday complete | May 2027 | June 2027 |
| House deposit complete | June 2029 | July 2029 |
| Classification | Current path | Affordable — significant trade-off |

The £2,100 closing current-account balance consists of £1,850 reserved for October spending and a £250 unallocated safety buffer.

## 5. Primary answer

### 5.1 Information hierarchy

The first answer uses this order:

1. Direct answer
2. Classification
3. Immediate safety consequence
4. Most important future consequence
5. Compact before-and-after comparison
6. Editable assumptions
7. Expandable detail

### 5.2 Canonical first response

**Headline**

> You can pay for the trip, but your buffer would get tight.

**Direct answer**

> You can pay the £650 without missing bills or using your overdraft, but your £900 safety buffer would fall to £250.

**Classification**

> **Affordable — significant trade-off**

**Most important future consequence**

> Rebuilding your buffer would move your emergency-fund completion from December to February. Your holiday and house-deposit dates each move back by one month.

### 5.3 Initially visible

The first view shows:

- Headline and direct answer
- Classification badge
- Safety buffer: £900 → £250
- Bills: covered
- Overdraft: not used
- Emergency fund: December 2026 → February 2027
- A one-line assumption summary
- Actions: **Compare options**, **Change assumptions**, **See full impact**

### 5.4 Expandable detail

**See full impact** reveals:

- Holiday: May 2027 → June 2027
- House deposit: June 2029 → July 2029
- September closing current account: £2,750 → £2,100
- Buffer recovery path: £250 in September, £850 in October, £900 in November
- Month-by-month goal balances and contributions
- Why the classification is Significant

**How we calculated this** reveals:

- Confirmed context used
- Estimated values used
- System assumptions
- Hypothetical changes
- Excluded credit and benefits
- Confidence and unresolved timing detail

The primary answer MUST NOT begin with the full ledger or all three goal dates.

## 6. Before-and-after simulation

### 6.1 Main comparison

| Impact | Current path | £650 trip | Change |
|---|---:|---:|---|
| Lowest safety buffer | £900 | £250 | £650 lower |
| Bills covered | Yes | Yes | No missed bill |
| Overdraft used | £0 | £0 | No borrowing |
| Emergency fund | Dec 2026 | Feb 2027 | 2 months later |
| Holiday | May 2027 | Jun 2027 | 1 month later |
| House deposit | Jun 2029 | Jul 2029 | 1 month later |

The visual hierarchy should emphasise the changed values, not repeat equal values with equal visual weight.

### 6.2 Recovery explanation

The comparison may expand into:

| Period | Current-path buffer | Trip buffer | What changes |
|---|---:|---:|---|
| Sep 2026 | £900 | £250 | £650 trip is paid; committed savings still transfer |
| Oct 2026 | £900 | £850 | £600 goal budget restores the buffer instead |
| Nov 2026 | £900 | £900 | £50 finishes restoration; £550 resumes goal funding |

The UI should use “buffer restored in November,” not imply that Sarah's total bank balance is £250.

## 7. Alternatives

### 7.1 Branch behaviour

Changing the amount creates a sibling branch from B0. It does not edit S1.

- S1: £650 in September
- S1-A500: £500 in September
- S1-A400: £400 in September

All retain the same payment-source, timing and spending assumptions unless Sarah explicitly changes one.

### 7.2 Deterministic amount comparison

| Scenario | Lowest buffer | Buffer restored | Emergency fund | Holiday | House deposit | Classification |
|---|---:|---|---|---|---|---|
| £650 | £250 | Nov 2026 | Feb 2027 | Jun 2027 | Jul 2029 | Affordable — significant trade-off |
| £500 | £400 | Oct 2026 | Jan 2027 | Jun 2027 | Jun 2029 | Affordable — significant trade-off |
| £400 | £500 | Oct 2026 | Jan 2027 | Jun 2027 | Jun 2029 | Affordable — noticeable trade-off |

All three cover bills and use £0 overdraft.

### 7.3 Why the classifications differ

#### £500

- September buffer falls to £400.
- £500 of October's normal goal budget restores the buffer.
- £100 goes to the house deposit in October.
- The buffer recovers in one allocation event.
- £400 is below half of Sarah's £900 preferred buffer, so safety severity remains Significant.

#### £400

- September buffer falls to £500.
- £400 of October's normal goal budget restores the buffer.
- £200 goes to the house deposit in October.
- The buffer recovers in one allocation event.
- The buffer stays above half its preferred level, so safety severity is Noticeable.

Future You should highlight the meaningful boundary:

> At £400, the result moves from a significant to a noticeable trade-off under your current safety preference.

### 7.4 Interaction

Sarah may select a comparison card without replacing the original result. The selected card updates the detailed comparison, while all evaluated alternatives remain available as scenario tabs or chips.

The explanation MUST state the numeric reason for a classification difference. It must not imply that £400 is universally “better.”

### 7.5 Timing alternative: October

“What if I wait until October?” is interpreted as moving the same one-off £650 payment into the October spending cycle. That interpretation is disclosed.

It creates sibling branch S1-TOCT from B0.

| Impact | £650 in September | £650 in October |
|---|---:|---:|
| September closing buffer | £250 | £900 |
| October lowest buffer | £250 carried into cycle | £250 after October spending and trip |
| October closing buffer | £850 | £850 |
| Buffer fully restored | Nov 2026 | Nov 2026 |
| Emergency fund | Feb 2027 | Feb 2027 |
| Holiday | Jun 2027 | Jun 2027 |
| House deposit | Jul 2029 | Jul 2029 |
| Classification | Significant trade-off | Significant trade-off |

The answer should explain:

> Waiting until October shifts the tight month, but it does not improve the £250 low point or your goal dates under your current savings plan. September's £600 is still transferred to your goals rather than set aside for the trip.

If Sarah wants waiting to improve affordability, Future You offers a separate **save first** scenario and asks how much of her goal budget she wants to redirect. It does not assume permission to pause goals.

## 8. Opportunity surfacing

### 8.1 Placement and wording

An opportunity appears only after the core trip result and alternatives. It is visually secondary and explicitly excluded from the current calculation.

Canonical card:

> **Future You spotted something**  
> OniBank lists a season-ticket loan. If you're eligible, it may change the timing or cost of the transport spending in your current plan. It is not included in the trip result above.  
> **Check what changes →**

The card MUST NOT say Sarah has the loan or claim a saving amount.

### 8.2 Branch progression

**Slice 5 amendment:** the `S1-O1` progression below is deferred. Ask may acknowledge that the
informational opportunity exists, but “use the season-ticket loan” is unsupported and creates no branch,
clarification checklist or numerical result in Slice 5.

The visible path is:

1. **B0 — Current path:** no loan assumed.
2. **S1 — £650 trip:** trip only; no loan assumed.
3. **S1-O1 — £650 trip + season-ticket-loan exploration:** child of S1.

When Sarah selects **Check what changes**, Future You says:

> I can model that as a separate what-if. I don't yet know whether you're eligible or what repayment would come from your pay. Are you eligible, and what loan amount and repayment schedule would apply?

Until those details are supplied:

- S1-O1 is a draft/incomplete child branch.
- No numeric result is shown.
- The benefit remains Eligibility unknown, not Simulated or Active.
- B0 and S1 remain unchanged.

Once Sarah supplies or explicitly accepts sufficient terms, S1-O1 becomes Simulated and receives its own comparison against both S1 and B0.

### 8.3 Required three-way display

After a benefit can be simulated, the comparison labels are:

- **Your current path**
- **£650 trip**
- **£650 trip + simulated season-ticket loan**

The word **simulated** remains visible. Only S1-O1 contains the hypothetical benefit cash flows.

The current specification does not contain season-ticket-loan eligibility or repayment terms, so a numeric S1-O1 result cannot yet be designed honestly.

## 9. Assumptions and confidence

### 9.1 Main-answer disclosure

The primary result includes one compact line:

> **Assuming:** one £650 payment from your current account before your September payday, on top of your usual spending. **Edit**

This keeps the answer readable while preventing assumptions from being hidden.

### 9.2 Expandable calculation panel

**What Future You knows**

- Current account: £2,750
- September spending reserve: £1,850
- Preferred buffer: £900
- Monthly take-home: £2,450
- Goal balances and £600 contribution policy
- September goal transfers are committed

**What was estimated**

- None in the canonical fixture; Sarah v1 values are fixed test inputs.

**What was assumed**

- £650 is the total trip cost.
- It is paid once from the current account.
- It is paid before September payday.
- It is additional to normal spending.
- No goal savings or credit are used.

**What is hypothetical**

- The trip
- £500 and £400 amount alternatives
- Any timing alternative
- Any benefit-uptake branch

**What was not included**

- The £500 overdraft limit as available money
- Additional pension matching
- Season-ticket-loan effects
- Spending substitution

### 9.3 Confidence

The golden-path result is shown as:

> **Confidence: Medium** — Sarah's financial context is fixed, but the payment date, single-payment treatment and funding source are disclosed scenario assumptions.

If Sarah confirms those assumptions, confidence becomes High for the fixture. Confidence does not change the deterministic class for the assumed setup.

## 10. Follow-up conversation

| Follow-up | State operation | Clarification | Behaviour |
|---|---|---|---|
| “What about £500?” | Create sibling S1-A500 from B0 | None | Reuse timing and funding assumptions; evaluate £500 independently |
| “What if I wait until October?” | Create sibling S1-TOCT from B0 | Usually none | Move the payment into October and disclose that travel/payment timing interpretation |
| “Why does my emergency fund move back two months?” | Reuse and explain S1 | None | Read S1 ledger; do not create a branch |
| “What if I don't care about keeping the full £900 buffer?” | Create child policy branch from selected scenario after clarification | **Required:** new desired buffer | Change the buffer target in the child only and rerun allocation/classification |
| “What if I use the season-ticket loan?” | No branch in Slice 5 | None | Return the approved scope response; defer benefit exploration |

### 10.1 £500 follow-up

Future You responds:

> At £500, your bills are still covered and you still avoid the overdraft. Your buffer would fall to £400 and recover in October. Your emergency fund would move to January, your holiday to June, and your house deposit stays on its June 2029 path. It is still a significant trade-off because £400 is less than half your preferred £900 buffer.

### 10.2 October follow-up

Future You responds:

> Moving the £650 payment to October shifts when the pressure happens, but the lowest buffer is still £250 and your goal dates stay the same. Under your current plan, September's £600 goes to your goals instead of being held for the trip.

Then it may offer:

> Want me to model saving towards the trip during September instead?

That offer does not run a simulation until Sarah confirms which contributions may be redirected.

### 10.3 Emergency-fund explanation

Future You responds:

> On your current path, you add £300 to your emergency fund in October and £300 in November. After the trip, October's £600 saving capacity rebuilds your safety buffer instead, and £50 of November's capacity finishes that recovery. Your emergency fund is therefore £350 behind at the end of December: £4,150 instead of £4,500. January brings it to £4,450, and the final £50 lands in February.

This reuses S1. It does not calculate a new scenario.

### 10.4 Lower-buffer-policy follow-up

Future You asks:

> What safety level would you like me to test instead of £900?

It MUST NOT infer £0, £250 or another target from “I don't care about the full £900.”

The answer creates a child branch with a scenario-only safety target. It does not change Sarah's confirmed £900 preference.

### 10.5 Season-ticket-loan follow-up

Future You asks for the minimum missing terms and keeps the branch visibly incomplete. It does not imply that eligibility is guaranteed or that the loan reduces transport costs.

## 11. Conversation state

### 11.1 Persistent scenario set

During exploration, Future You retains:

| Friendly label | Branch | Relationship | Status |
|---|---|---|---|
| Current path | B0 | Confirmed baseline | Current |
| £650 trip · September | S1 | Child of B0 | Hypothetical, evaluated |
| £500 trip · September | S1-A500 | Sibling of S1 | Hypothetical, evaluated |
| £400 trip · September | S1-A400 | Sibling of S1 | Hypothetical, evaluated |
| £650 trip · October | S1-TOCT | Sibling of S1 | Hypothetical, evaluated |
| Trip + season-ticket loan | S1-O1 | Child of S1 | Draft until terms exist |

### 11.2 Selection behaviour

- B0 remains pinned as the comparison anchor.
- One hypothetical branch may be selected for detailed viewing.
- Selecting another branch changes the detail view, not the baseline.
- Previous branches remain available as tabs, chips or entries in a comparison drawer.
- Explanatory questions reuse the selected branch.
- Parameter changes create new branches unless Sarah explicitly asks to replace an unneeded draft.
- A branch is always labelled Current, Hypothetical, Simulated opportunity or Incomplete.

### 11.3 Context memory

Within this decision thread, Future You remembers:

- The decision family is a trip.
- The original amount is £650.
- The original timing is September.
- The assumed funding source is the current account.
- The trip is additional to normal spending.
- Which branch Sarah currently has selected.
- Which alternatives have already been evaluated.
- Which assumptions Sarah has confirmed or edited.

Therefore, “What about £500?” does not trigger questions about purpose, account or timing again.

### 11.4 Confirmed-context changes

If Sarah updates a real balance or says the trip has actually been purchased, Future You must distinguish that from exploration. A real update creates a new current-context version; existing scenarios remain attached to the earlier baseline until explicitly recalculated.

## 12. Golden-path transcript

The operation notes are product semantics, not technical implementation instructions.

### Stage 1 — Initial request

**Sarah**

> Can I afford a £650 trip next month?

**Operation**

- Read B0.
- Interpret “next month” as September 2026.
- Create S1 with one additional £650 current-account debit before September payday.
- Keep September's committed £600 goal transfers.
- Evaluate S1 and compare it with B0.
- No blocking clarification is required.

### Stage 2 — Primary result

**Future You**

> **You can pay for the trip, but your buffer would get tight.**
>
> You can pay the £650 without missing bills or using your overdraft, but your £900 safety buffer would fall to £250.
>
> **Affordable — significant trade-off**
>
> Rebuilding your buffer moves your emergency fund from December 2026 to February 2027. Your holiday moves from May to June 2027, and your house deposit from June to July 2029.
>
> **Current path → £650 trip**  
> Safety buffer: **£900 → £250**  
> Bills: **covered → covered**  
> Overdraft: **£0 → £0**  
> Emergency fund: **Dec 2026 → Feb 2027**
>
> **Assuming:** one £650 payment from your current account before your September payday, on top of your usual spending. **Edit**
>
> **Compare options** · **See full impact** · **How we calculated this**

**Operation**

- Render S1 versus B0.
- Keep B0 pinned and S1 selected.

### Stage 3 — Deterministic alternatives

**Future You — comparison panel**

| Option | Lowest buffer | Buffer restored | Emergency fund | Classification |
|---|---:|---|---|---|
| £650 | £250 | November | February 2027 | Significant trade-off |
| £500 | £400 | October | January 2027 | Significant trade-off |
| £400 | £500 | October | January 2027 | Noticeable trade-off |

> At £400, the decision moves from a significant to a noticeable trade-off under your current £900 safety preference.

**Operation**

- Create and evaluate sibling branches S1-A500 and S1-A400 from B0.
- Do not modify S1.

### Stage 4 — Amount follow-up

**Sarah**

> What about £500?

**Future You**

> £500 still works without missing bills or using your overdraft. Your buffer would fall to £400 and recover in October.
>
> Your emergency fund would complete in January 2027, your holiday in June 2027, and your house deposit remains June 2029.
>
> It is still a **significant trade-off** because £400 is less than half your preferred £900 buffer.
>
> **View £500 against the £650 option →**

**Operation**

- Select existing evaluated sibling S1-A500.
- No new question and no baseline mutation.

### Stage 5 — Explanation follow-up

**Sarah**

> Why does my emergency fund move back two months on the £650 option?

**Future You**

> On your current path, you add £300 to your emergency fund in October and another £300 in November.
>
> With the £650 trip, October's £600 saving capacity rebuilds your safety buffer instead. In November, £50 finishes restoring the buffer, leaving £550 for your goals: £200 to your house deposit, £100 to your holiday and £250 to your emergency fund.
>
> That leaves your emergency fund at £4,150 rather than £4,500 in December. January brings it to £4,450, and the final £50 completes it in February.

**Operation**

- Re-select/read S1.
- Explain existing ledger events.
- Do not create a branch.

### Stage 6 — Timing follow-up

**Sarah**

> What if I wait until October?

**Future You**

> If the £650 payment moves to October, September stays on your current path. The pressure moves into October, but your lowest buffer is still £250 and it still returns to £900 in November.
>
> Your emergency fund still completes in February 2027, your holiday in June 2027 and your house deposit in July 2029.
>
> Waiting alone does not improve the goal dates because September's £600 still goes to your goals rather than being set aside for the trip.
>
> **Want me to model saving towards the trip during September instead?**

**Operation**

- Create and evaluate sibling S1-TOCT from B0.
- Move only the payment cycle.
- Preserve S1 and amount alternatives.
- Do not create a save-first branch until Sarah chooses a funding rule.

### Stage 7 — Relevant opportunity

**Future You**

> **Future You spotted something**
>
> OniBank lists a season-ticket loan. If you're eligible, it may change the timing or cost of the transport spending in your current plan. It is not included in any trip result above.
>
> **Check what changes →**

**Sarah**

> What if I use the season-ticket loan?

**Future You**

> I can model that as a separate what-if, but I don't yet know whether you're eligible or what repayment would come from your pay.
>
> Are you eligible, and what loan amount and repayment schedule would apply?
>
> Your current path and all trip comparisons will stay unchanged while we explore it.

**Operation**

- Create draft child S1-O1 from the selected £650 decision branch.
- Mark eligibility and quantified terms as required.
- Do not run or display a numeric benefit result yet.
- Keep B0, S1 and all sibling alternatives intact.

## 13. UX implications

These are required capabilities, not screen redesigns.

### Home

Home must support:

- Starting the canonical natural-language question
- Showing that Future You already knows Sarah's financial context
- Passing the user into an exploratory decision thread
- Resuming a recent decision and its branch set
- Leading with decisions rather than transaction or budgeting charts

### Ask

Ask must support:

- Immediate direct answers with classification
- Visible, editable assumptions
- Current-path versus scenario comparison
- Expandable ledger and calculation detail
- Persistent scenario branches and selection
- Amount and timing alternatives
- Explanation questions that reuse a branch
- Incomplete branches that wait for clarification
- Clear Current, Hypothetical and Simulated labels
- Opportunity cards that create opt-in child branches

### Goals

Goals must support:

- Baseline completion date
- Selected-scenario completion date
- Delay or acceleration amount
- Explanation of which contribution events caused the change
- Switching between current path and saved scenarios
- Never presenting a hypothetical date as the confirmed goal plan

### Benefits

Benefits must support:

- Available, Eligibility unknown, Simulated and Active states
- Clear indication of whether a benefit affects the baseline
- Missing eligibility and term information
- Starting a benefit-only or decision-plus-benefit branch
- Three-way comparison when a quantified simulation exists
- No automatic cash-flow effect from an inactive opportunity

## 14. Behaviour not yet sufficiently defined

The golden path can be designed confidently through the core result and amount/timing alternatives. The following remain deliberately incomplete:

1. **Season-ticket-loan simulation:** eligibility, loan amount, repayment schedule, fees, disbursement timing and replaced transport expense are unknown. Only the exploration handoff can be designed; no numeric benefit result is valid yet.
2. **Exact intra-month minimum date:** Sarah's trip and individual routine transactions lack confirmed dates. The £250 amount is deterministic under the conservative timing rule, but the exact date of that minimum is not.
3. **Lower-buffer scenario:** “I don't care about £900” lacks a replacement target. Future You must ask rather than choose one.
4. **Save-first scenario:** waiting does not define which goal contributions Sarah permits Future You to redirect. The simulator requires an explicit temporary-goal funding policy.
5. **Trip-cost composition:** the golden path assumes £650 is the full additional cost. If it is a deposit or excludes trip spending, a new branch needs those amounts and dates.

None of these gaps permits a change to Sarah v1, B0 or the frozen S1 outcome.
