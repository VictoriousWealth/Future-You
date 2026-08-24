# Future You — Simulation Rules Specification

**Version:** 1.0-draft  
**Canonical fixture:** Sarah v1  
**Scope:** Deterministic financial behaviour only  
**Out of scope:** Frontend, backend, database, AI and deployment architecture

## 0. Purpose and normative principles

This document defines what the Future You simulator means and how it behaves. It is intended to be precise enough that two independent implementations, given the same context, assumptions and scenario, produce the same ledger, classifications and goal dates.

The words **MUST**, **MUST NOT**, **SHOULD** and **MAY** are normative.

The simulator obeys these invariants:

1. The baseline represents the user's current path.
2. A scenario is an isolated branch and MUST NOT mutate the baseline.
3. Cash, savings and credit are distinct. Credit MUST NOT be presented as cash.
4. Employer benefits are opportunities unless they are confirmed, active and sufficiently quantified.
5. The ledger performs the calculations. Conversational wording MUST describe ledger results rather than inventing them.
6. Every result MUST retain the inputs, assumptions, rules version and branch identity that produced it.
7. Monetary calculations MUST use integer minor units, such as pence, and MUST NOT use binary floating-point arithmetic.
8. Sarah v1's frozen values and outcomes are acceptance criteria. A UI requirement MUST NOT change them silently.

## 1. Financial context

### 1.1 Two independent dimensions

“Current versus hypothetical” and “confirmed versus estimated” are separate questions. Every input MUST therefore carry both:

- **Scope:** whether it belongs to the current path or to a scenario branch.
- **Evidence quality:** how certain its value is.

This avoids treating a current-life estimate as hypothetical and avoids treating a hypothetical value as a current fact.

### 1.2 Evidence states

| State | Meaning | Baseline treatment |
|---|---|---|
| Confirmed | A current value verified by the user or a trusted source and still considered current | Included |
| Estimated | A value intended to represent current reality but known to be approximate | Included only after the user accepts it as the planning value; always disclosed as estimated |
| Unknown | No usable value is available | Excluded; blocks the affected output when material |
| Hypothetical | A proposed alternative rather than current reality | Scenario branch only; never included in the baseline |

An estimate accepted for planning remains an estimate. Acceptance authorises its use; it does not upgrade its evidence quality to confirmed.

### 1.3 Required metadata

Each financial input SHOULD carry:

- Value and currency
- Scope: current path or branch identifier
- Evidence state
- Source: user, payslip, account feed, employer, system assumption or other named source
- Effective date or period
- Last-confirmed date
- Recurrence and end date, when applicable
- Exact date, date range or date precision
- Whether it is required, discretionary, reserved or informational
- An uncertainty range when the value is estimated

### 1.4 Confirmed financial context categories

#### Current accounts

For every current account, context includes:

- Cleared cash balance
- Balance timestamp
- Pending confirmed debits and credits, when known
- Whether the account participates in the forecast
- Any amount reserved for the active spending cycle

For a context captured after an active cycle has begun, the reserved amount is explicitly supplied as
the remaining reserve from the snapshot point until the next funding event. It is not inferred or
prorated from the normal complete-cycle spending amount.

The simulator MUST distinguish:

- **Actual current-account balance:** cash currently present.
- **Reserved cash:** cash allocated to known spending before the next funding point.
- **Unallocated safety buffer:** actual cash minus remaining reserved cash.

For Sarah at the start of September 2026:

- Actual current-account balance: £2,750
- Reserved September routine spending: £1,850
- Unallocated safety buffer: £900

Sarah's snapshot is at the start of her active cycle, so her £1,850 remaining reserve happens to equal
one complete future-cycle spending envelope. That equality is fixture-specific and MUST NOT become a
general-user default.

#### Savings

For every savings balance, context includes:

- Current balance
- Liquidity or withdrawal restrictions
- Goal association, if any
- Whether the balance may be used for ordinary cash-flow coverage
- Interest or growth rule, if explicitly modelled

Ring-fenced goal savings MUST NOT be silently used to cover a purchase or cash shortfall. Moving money out of a goal is a separate scenario action.

Pension assets and employer pension contributions are not spendable savings.

#### Income

Income context includes:

- Net cash amount used by the ledger
- Payment date or recurrence rule
- Employer or payer
- Whether the income is fixed, variable or one-off
- Confidence and any range
- Known end date

Gross pay MAY be retained for explanation, but the cash ledger MUST use net pay. Employer contributions paid directly into a pension MUST NOT be counted as cash income.

#### Routine spending

Routine spending includes recurring or normally expected spending required to represent the user's current life, including:

- Fixed bills
- Required repayments
- Essential variable spending
- Expected flexible spending
- Regular transport and subscriptions

Each item SHOULD identify its amount, cadence, expected transaction date and whether it is required or adjustable.

#### Required bills and repayments

A required obligation includes its due date, amount, recipient, recurrence and consequence of non-payment. Goal contributions are not required obligations unless a separate contractual commitment makes them so.

The simulator MUST test whether every required obligation can be paid when due, not merely whether the month closes positive.

#### Goals

Every goal includes:

- Opening balance
- Target balance
- Contribution rule
- Allocation order
- Normal monthly allocation cap
- Rollover destination or fallback
- Earliest or target completion date, if supplied by the user
- Whether funds are liquid, restricted or informational

#### Desired safety buffer

The desired safety buffer is the user's preferred amount of unallocated cash after the active spending-cycle reserve has been set aside.

It is not:

- The user's total bank balance
- A hard affordability threshold
- Income
- Available credit

The safety buffer MAY fall below its target without making a decision automatically unaffordable. The depth and duration of the breach affect classification.

#### Overdrafts and other credit

Credit context includes limits, outstanding balances, interest, fees, repayment dates and whether the user has explicitly chosen to model its use.

Available overdraft or credit MUST NOT:

- Increase cash
- Increase the safety buffer
- Prevent a negative-cash warning
- Be used silently to make a decision appear affordable

#### Active employer benefits

An employer benefit may affect the baseline only when it is:

1. Active now,
2. Confirmed as applicable to the user,
3. Sufficiently quantified,
4. Assigned an effective date and cash-flow treatment.

Non-cash benefits remain informational unless the projection explicitly models the asset or goal they affect.

#### Upcoming confirmed commitments

Known future expenses or income changes belong to the baseline when they are part of the current path, including booked travel, annual insurance, moving costs, confirmed bonuses, rent changes and contractual repayments.

An unknown future possibility is not a confirmed commitment.

### 1.5 Unknown and material values

An unknown is **material** when it could change any of the following:

- Whether a required payment is covered
- Whether cash becomes negative
- Whether credit is required
- The affordability class
- A displayed goal-completion month

If a material opening balance, required payment or income value is unknown, the simulator MUST return **insufficient information** for the affected result rather than invent a value.

An immaterial unknown may be omitted, but the omission MUST be disclosed when relevant.

## 2. Ledger timing

### 2.1 Event ledger and reporting periods

The calculation is event-based. Months are reporting periods, not the unit of financial truth.

Every event contains:

- Effective date and, if known, time
- Signed cash amount
- Account or goal affected
- Event type
- Required or discretionary status
- Evidence state
- Branch identifier
- Dependency, such as “after salary credit”

For a reporting period:

> Opening cash  
> − routine spending  
> − confirmed one-off spending  
> ± other confirmed cash flows  
> + payday income  
> − goal transfers  
> = closing cash

This equation is a summary of the ordered event ledger. It MUST NOT replace event-level calculation.

### 2.2 Spending-cycle convention

Sarah is paid on the last working day of each month. Each named forecast month represents the spending cycle funded by salary received at the end of the previous month.

For September:

1. Sarah opens the period with the cash left after the August payday and allocation.
2. September spending occurs.
3. September payday occurs on the last working day.
4. September-labelled goal transfers occur after that salary credit.
5. Closing cash contains the reserve for October plus the carried safety buffer.

This convention applies to Sarah v1. Other users may have weekly, fortnightly, four-weekly, irregular or multiple funding cycles.

### 2.3 Event ordering

Events MUST be processed chronologically.

When exact timestamps are available, timestamp order controls. When events share a date but their intra-day ordering is unknown, the following conservative order applies:

1. Required debits and repayments
2. Confirmed ordinary and one-off debits
3. Income credits
4. Goal transfers explicitly dependent on that income
5. Other discretionary transfers

An explicit dependency overrides the default order. For example, Sarah's month-end goal transfers occur after her salary credit.

If changing unknown same-day ordering could create or remove a hard consequence, the result MUST identify an intra-day timing risk.

### 2.4 Dates with incomplete precision

- An exact-date event is placed on that date.
- A month-only required debit or one-off expense is placed on the first day of the relevant spending cycle for affordability testing and marked as a system timing assumption.
- A month-only income is placed on the final eligible payment day and marked as an assumption unless a recurrence rule resolves it.
- A date range is tested at its earliest possible debit date or latest possible income date for the primary affordability result.

This conservative convention MUST be disclosed.

### 2.5 Routine spending without transaction dates

Known fixed bills use their due dates. An undated monthly spending envelope is spread across the days of its spending cycle in integer minor units:

1. Divide the amount by the number of calendar days in the cycle.
2. Allocate the integer quotient to every day.
3. Allocate remaining pennies one at a time from the earliest day.

This is a system assumption. It gives deterministic intra-month cash flow without claiming that the user spends identically every day.

For an opening partial cycle, spending before the context snapshot MUST NOT be generated again. The
declared remaining active-cycle reserve is the authoritative total spending still reserved through the
next funding event. Known current-cycle items consume that reserve; only the unitemised remainder is
spread from the snapshot through the funding event. Itemised amounts plus the spread remainder MUST
equal the declared reserve. The complete routine-spending envelope begins with the next fully funded
cycle.

If the snapshot and funding event share a date, the existing conservative event ordering controls and
the timing assumption is disclosed. The engine MUST NOT introduce an undocumented ordering.

### 2.6 Payday dates

A recurrence such as “last working day” MUST use the user's jurisdictional working-day calendar. If the jurisdiction or holiday calendar is unknown, Monday-to-Friday is used provisionally and disclosed.

Income is available only on its projected payment event. Future income MUST NOT be used to cover a bill due before that event.

If a bill occurs before payday and the running cash balance is insufficient, the ledger records the shortfall at the bill date even when later income makes the month-end balance positive.

### 2.7 Multiple incomes

Multiple income payments are separate events. The simulator MUST NOT aggregate them at the beginning or end of the month.

Each payment affects affordability only from its availability date. Allocation rules may run after one designated income event or after several events, as defined by the user's current plan.

### 2.8 One-off expenses

A one-off expense requires:

- Amount
- Date or date precision
- Funding account
- Whether it is additional to or substitutes for routine spending
- Whether it is committed or hypothetical

The Sarah trip is an additional £650 expense during the September spending cycle before September payday. It does not reduce any part of her £1,850 routine spending.

### 2.9 Lowest projected balance

For each participating cash account and for combined cash, the simulator calculates the running balance after every event.

> Lowest projected cash position = minimum running cleared cash balance observed from period opening through period close

Credit is excluded. Reserved savings are excluded unless the scenario explicitly transfers them into cash.

The simulator SHOULD retain the date and triggering event associated with the minimum.

### 2.10 Safety-buffer calculation

At any ledger point:

> Safety buffer = participating cash − remaining cash reserved for the active spending cycle

The value may be below zero. It is not clamped.

In a stable baseline, routine spending reduces both cash and its corresponding reserve, leaving the unallocated safety buffer unchanged. An additional unreserved purchase reduces the safety buffer.

## 3. Baseline projection

### 3.1 Baseline construction

The baseline is an immutable projection of the current path.

It includes:

- Confirmed current-scope inputs
- User-accepted current-scope estimates, retaining their estimated label
- Active and quantified benefits
- Confirmed future commitments
- Current goal and allocation rules
- Disclosed system timing assumptions where needed

It excludes:

- Hypothetical decisions
- Available but inactive benefits
- Eligibility-unknown benefits
- Unconfirmed future income
- Unused credit limits as cash
- Unapproved transfers from ring-fenced savings

“Confirmed circumstances only” therefore means that every value applies to the current path. It does not mean approximate current-life spending must be falsely labelled exact.

### 3.2 Baseline algorithm

1. Select a context snapshot and rules version.
2. Generate all current-path events for the requested horizon.
3. Order events under section 2.
4. Execute the cash ledger.
5. Execute confirmed committed transfers.
6. Apply the uncommitted goal-allocation policy at each allocation event.
7. Record period results.
8. Continue the projection far enough to calculate goal dates or until the configured projection limit is reached.
9. Produce an assumptions and uncertainty manifest.

### 3.3 Required period output

For each forecast period, the baseline MUST output:

- Opening actual cash
- Income, itemised by event
- Routine spending
- Required bills and repayments
- Confirmed one-offs
- Other confirmed cash flows
- Safety-buffer restoration
- Goal contributions by goal
- Closing actual cash
- Closing reserved cash
- Closing safety buffer
- Lowest projected cash position and its event/date
- Goal closing balances
- Goal completion dates or “not reached within horizon”

## 4. Scenario branching

### 4.1 Branch invariants

A hypothetical scenario MUST:

1. Clone the baseline snapshot, rules and assumptions.
2. Receive a unique branch identity and parent identity.
3. Add, remove or change only explicitly named hypothetical events or policies.
4. Recalculate the complete affected forecast.
5. Compare against the unchanged baseline.
6. Remain hypothetical until the user confirms the real-world change.

Running or viewing a scenario MUST NOT alter:

- Account balances
- Goal balances
- Contribution policies
- Benefit status
- Baseline events
- Other scenario branches

### 4.2 Scenario types

The same branch model applies to:

- One-off purchases
- Recurring rent or bill changes
- Income changes
- Pension-contribution changes
- Employer-benefit uptake
- Goal-contribution changes
- Purchase timing changes
- Purchase amount changes
- Explicit movement of money between cash and savings

### 4.3 Effective dates

Every scenario change MUST have an effective date or disclosed date assumption. A recurring change affects events on or after that date only.

Increasing a pension contribution is represented by a change to future net-pay events. The employer's pension contribution remains non-cash and MUST NOT be added to spendable income.

### 4.4 Committing a scenario

A scenario becomes current context only after the user confirms that it has actually occurred or that it is now their active plan.

Commitment creates a new version of current context. It does not rewrite the historical baseline used for the original comparison.

## 5. Goal allocation

### 5.1 General policy model

A goal-allocation policy consists of:

- A normal contribution budget for each funding cycle
- A desired safety-buffer target
- A list of ordered allocation slots
- A maximum normal allocation for each slot
- A target balance for each goal
- An overflow destination or a retain-as-cash fallback
- Any current-cycle transfers already locked as confirmed events

The normal contribution budget is derived as the sum of the active ordered allocation slots' normal
caps. It is not an independently editable input:

> Normal contribution budget = sum of active goal slot caps

A constructed or persisted policy whose budget does not equal that sum is invalid.

The allocation order is a cash-flow rule. It is separate from emotional importance, display order or target-date urgency.

### 5.2 Locked current-cycle transfers

A transfer already marked as committed for the active cycle executes as a ledger event unless the scenario explicitly changes or cancels it.

Automatic buffer restoration applies to future uncommitted allocation events. It does not retroactively cancel a committed transfer.

Sarah's £600 September goal transfers are locked in both the baseline and £650-trip scenario. This is why the trip first reduces her buffer to £250 rather than automatically cancelling September savings.

Onboarding MUST explicitly record either that no active-cycle transfers are committed or a list of
committed transfers with goal, exact amount, effective date or funding-event dependency, and evidence.
An omitted declaration is unknown, not “none.” Normal slot caps and the derived budget never imply a
locked transfer. A locked transfer consumes the allocation event and MUST NOT be followed by a second
automatic allocation for that same event; future uncommitted events resume the normal policy.

### 5.3 Allocation algorithm

At each future uncommitted allocation event:

1. Determine the normal goal-contribution budget for that funding cycle.
2. Determine the safety buffer carried into the cycle before allocating that budget.
3. Calculate the buffer shortfall:

   > Buffer shortfall = max(0, desired buffer − carried safety buffer)

4. Divert the smaller of the contribution budget and buffer shortfall to cash:

   > Buffer restoration = min(normal contribution budget, buffer shortfall)

5. Calculate the goal pool:

   > Goal pool = normal contribution budget − buffer restoration

6. Visit allocation slots in their explicit order.
7. For each eligible unfinished goal, transfer the smallest of:
   - Remaining goal pool
   - The slot's normal cap
   - The amount required to complete the goal
8. After normal slots are processed, route any remainder to the configured overflow destination.
9. Never contribute beyond a goal target.
10. If no eligible overflow destination exists, retain the remainder as unallocated cash.

Committed required payments are handled before this policy. Goal allocation MUST NOT create a negative cash balance or consume cash reserved for required obligations.

### 5.4 Partial final contributions

When a goal needs less than its normal allocation to complete:

- Contribute only the amount required.
- Mark the goal complete on that contribution event date.
- Route the unused remainder during the same allocation event.

Remainders are not discarded and are not deferred unless the policy explicitly says so.

### 5.5 Paused and reduced contributions

A paused goal receives zero for the affected allocation events. A reduced goal uses the explicit temporary cap. Pausing or reducing a goal in a scenario does not alter the baseline plan.

Missed normal contributions do not automatically create arrears. Future contributions return to their normal caps unless an explicit catch-up policy exists.

### 5.6 Sarah v1 allocation policy

Sarah's normal contribution budget is £600 per monthly cycle.

Her ordered slots are:

1. House deposit: up to £200
2. Holiday: up to £100
3. Emergency fund: up to £300

Her overflow destination is the house deposit.

The £600 budget is derived under the general invariant: £200 house-deposit cap + £100 holiday cap +
£300 emergency-fund cap. Her explicit locked September transfers are £200, £100 and £300 after the
September payday. Her opening £1,850 reserve and £2,750 cleared cash still derive a £900 current safety
buffer. These mappings preserve every frozen Sarah result without supplying a Sarah-specific default
to ordinary users.

Therefore:

- Safety-buffer restoration occurs before all uncommitted goal slots.
- With a £550 goal pool, house receives £200, holiday £100 and emergency fund £250.
- When the emergency fund is complete, its unused allocation flows to the house deposit.
- When the holiday is complete, its unused allocation also flows to the house deposit.

The earlier description of the emergency fund as “priority 1” describes its importance, not Sarah's contribution-slot order. Implementations MUST use the explicit allocation policy above.

### 5.7 User control

The general simulator MUST support an explicit user-owned allocation order and rollover policy. Changing that policy is either:

- A hypothetical scenario when the user is exploring it, or
- A new confirmed-context version when the user adopts it.

The UI for changing priority is outside this specification.

## 6. Affordability classification

### 6.1 Classification dimensions

Affordability is not a yes/no balance check. The simulator evaluates:

#### Hard consequences

- Required bill cannot be paid when due
- Required repayment cannot be paid when due
- Cleared cash becomes negative
- Unplanned overdraft or credit is needed

#### Safety consequences

- Safety-buffer target is breached
- Minimum buffer amount and ratio
- Absolute buffer reduction from baseline
- Number of future allocation events required for recovery

#### Future consequences

- Goal-completion delays or accelerations
- Goal-balance differences
- Reduced savings
- Explicit opportunity cost

### 6.2 Derived metrics

The MVP classification window begins at the first scenario event and covers the following six allocation events. Safety recovery taking more than three future allocation events is Risky even if recovery occurs later inside that six-event window.

For an applicable desired buffer greater than zero:

> Minimum buffer ratio = minimum scenario safety buffer ÷ desired safety buffer

> Recovery cycles = number of future allocation events after the decision period until the safety buffer first returns to or exceeds its target

If recovery does not occur within the classification horizon, recovery is “not recovered.”

For the first six cycles after the decision:

> Goal shortfall = sum of baseline goal balances − sum of scenario goal balances

Positive values represent reduced goal savings. Amounts retained as additional cash are not counted as goal savings, but are visible in the cash comparison.

> Goal-budget equivalent = goal shortfall ÷ normal contribution budget per cycle

Goal delay is the count of displayed monthly completion periods between baseline and scenario. A completion in December versus February is a two-month delay.

### 6.3 Dimension severity

The following MVP thresholds are normative and versioned.

#### Safety severity

| Severity | Rule |
|---|---|
| Minimal | Minimum buffer ratio is at least 0.90 and recovery is immediate or unnecessary |
| Noticeable | Minimum buffer ratio is at least 0.50 and recovery takes no more than 1 future allocation event |
| Significant | Minimum buffer remains above 0, but the ratio is below 0.50 or recovery takes 2–3 future allocation events |
| Risky | Safety buffer reaches 0 or below, or is not restored within 3 future allocation events |

#### Future severity

Use the most severe applicable rule:

| Severity | Rule |
|---|---|
| Minimal | No goal completion is delayed and goal shortfall is less than 0.25 contribution cycles |
| Noticeable | No goal is delayed by more than 1 month and goal shortfall is less than 1 contribution cycle, unless the Minimal rule applies |
| Significant | Any goal is delayed 2–3 months, or goal shortfall is 1–3 contribution cycles |
| Risky | Any goal is delayed by more than 3 months, or goal shortfall exceeds 3 contribution cycles |

When a scenario accelerates a goal, the output records a negative delay and states the acceleration. An acceleration does not erase a hard or safety consequence elsewhere.

### 6.4 Final classification

Classification is hierarchical:

1. **Not currently affordable**
   - Any required obligation cannot be paid when due, or
   - Cleared cash becomes negative without an explicitly modelled financing decision, or
   - Unplanned overdraft or borrowing is required.

2. **Financially risky**
   - No hard failure occurs, but safety or future severity is Risky, or
   - New credit or overdraft use is an explicit part of the decision, even when repayments appear serviceable.

3. **Affordable — significant trade-off**
   - No Hard or Risky condition occurs and at least one dimension is Significant.

4. **Affordable — noticeable trade-off**
   - No more severe condition occurs and at least one dimension is Noticeable.

5. **Affordable — minimal impact**
   - Both safety and future dimensions are Minimal and there is no hard consequence.

The final class is the most severe applicable class. The explanation MUST identify which metrics caused it.

The approved Sarah wording is a narrative rendering of **Affordable — significant trade-off**:

> Affordable, but with a meaningful short-term safety-buffer trade-off.

### 6.5 Baseline already under pressure

If the baseline itself contains a hard failure, the simulator MUST state that the current path already has an unresolved shortfall and MUST NOT imply that the decision alone caused it.

Scenario deltas must distinguish:

- Existing baseline problem
- New problem introduced by the scenario
- Existing problem made better or worse

## 7. Goal completion dates

### 7.1 Completion event

A goal completes on the first contribution or other credited event for which:

> Goal balance after event ≥ target balance

The exact event date is retained. A month-and-year UI displays the calendar month containing that event.

### 7.2 Projection procedure

For every allocation event:

1. Apply buffer restoration.
2. Calculate the available goal pool.
3. Apply pauses and scenario-specific caps.
4. Allocate in policy order.
5. Cap every goal at its target.
6. Apply same-event rollover.
7. Record newly completed goals.
8. Use the resulting balances and active goals in the next cycle.

### 7.3 Partial completion and rollover

If a goal needs £50 and its normal slot is £100, it receives £50 and the other £50 follows the overflow rule during the same allocation event.

### 7.4 Delays and accelerations

Goal delay is calculated by comparing completion events from branches using the same baseline snapshot and rules.

- Baseline complete, scenario incomplete within horizon: report “delayed beyond projection horizon.”
- Both incomplete: do not invent a month; compare balances and state that no completion date is available.
- Scenario completes earlier: report the acceleration.

### 7.5 Interest, inflation and investment growth

Sarah v1 assumes zero interest, zero investment return and nominal target values. These effects MUST remain zero unless an explicit, disclosed projection rule is added to the context. They MUST NOT be inferred by the conversational layer.

## 8. Opportunities and employer benefits

### 8.1 Benefit states

| State | Meaning | Baseline effect |
|---|---|---|
| Available | The employer offers the benefit and it is not active for the user | None |
| Eligibility unknown | The benefit appears relevant, but the user's eligibility is not established | None |
| Simulated | The user explicitly chose to model uptake in a branch | Scenario only |
| Active | The user confirmed uptake and the benefit is currently in force | Included only when eligibility, amount, dates and cash treatment are sufficiently quantified |

An active benefit whose value or effective date is unknown remains excluded from numeric baseline calculations and is disclosed as incomplete context.

### 8.2 Three-path comparison

Future You may compare:

- **B0 — Current path:** confirmed baseline
- **S1 — Decision:** B0 plus the hypothetical decision
- **S2 — Decision + opportunity:** S1 plus explicit hypothetical benefit uptake

S2 is a child of S1, not a replacement for B0. Results SHOULD display:

- S1 versus B0: effect of the decision
- S2 versus S1: incremental effect of the opportunity
- S2 versus B0: combined hypothetical effect

All three paths MUST retain distinct labels. Neither scenario may be described as Sarah's current financial state.

### 8.3 Pension matching

Sarah's £2,450 net pay is after her confirmed 3% employee pension contribution and student-loan deduction.

- Employer pension contributions do not enter the cash ledger.
- The confirmed active 3% employer contribution may be represented in a separate retirement projection.
- The additional match available between 3% and 5% is an opportunity.
- A 5% scenario must change future net-pay events using a confirmed or explicitly estimated payroll effect.
- Until that net-pay effect is available, the branch may explain the opportunity but MUST NOT claim a numeric cash-flow result.

### 8.4 Season-ticket loan

An available season-ticket loan does not change transport spending, income or cash flow by itself. A simulation requires eligibility assumptions, loan amount, disbursement date, repayment schedule, fees and the expense it replaces or refinances.

## 9. Alternatives

### 9.1 Alternative branches

Every alternative is an independent sibling branch from the same baseline unless it explicitly builds on another named scenario.

Alternatives MUST vary declared parameters only. The engine calculates every result; conversational text MUST NOT invent impacts.

### 9.2 Explicit alternatives

User-supplied alternatives are evaluated exactly as supplied, such as £650, £500 and £400. They take precedence over automatically generated candidates.

### 9.3 MVP automatic amount alternatives

When the user supplies one GBP amount and asks for alternatives without giving values, the MVP candidate generator produces:

1. Original amount
2. 75% of the original, rounded to the nearest £50 using half-up rounding
3. 60% of the original, rounded to the nearest £50 using half-up rounding

Duplicate, zero or negative candidates are removed.

For £650 this produces:

- £650
- £500
- £400

This is a candidate-generation rule, not financial advice. It is versioned and may later be replaced by threshold-seeking alternatives.

### 9.4 Timing alternatives

“Next month,” “in two months” and similar variants retain the same amount and funding method while moving the one-off event to the equivalent point in the selected future spending cycle.

If the original date precision is only monthly, the same conservative date-position rule is used in every branch.

### 9.5 Save-first alternatives

“Save first, then buy” requires an explicit funding rule. It MUST NOT silently raid goals.

The MVP may model it by creating a temporary purchase goal with:

- Target equal to purchase cost
- Explicit contribution amount
- Explicit position in the allocation order
- Purchase event only after the temporary goal is fully funded

If the user has not approved the contribution source or priority, the simulator asks for it and does not generate a numeric save-first result.

## 10. Assumptions and uncertainty

### 10.1 Assumption manifest

Every projection MUST carry a manifest separating:

- Confirmed facts
- User-provided estimates
- System assumptions
- Hypothetical scenario changes
- Unknown or excluded values

Each material assumption records its scope, affected periods and likely effect.

### 10.2 Required disclosure

A user-facing result MUST disclose assumptions that materially affect affordability, recovery or displayed goal dates. Examples include:

- Estimated flexible spending
- Assumed transaction dates
- Variable income amount or date
- Unknown benefit eligibility
- Incomplete transaction coverage
- Estimated pension effect on take-home pay

### 10.3 Uncertainty ranges

An estimated material value SHOULD include a lower and upper bound. The simulator recalculates the relevant result at both bounds.

- If the classification is unchanged across the range, the result is robust to that estimate.
- If the classification changes, the result MUST state the range of possible classes.
- If no defensible range exists for a material value, the affected result is insufficient-information rather than precise.

### 10.4 Result confidence

| Confidence | Rule |
|---|---|
| High | All material inputs are confirmed and dated; no material system assumption affects the result |
| Medium | Material accepted estimates or system timing assumptions exist, but bounded results keep the same class |
| Low | Bounded estimates produce different classes or dates |
| Insufficient information | A material unknown prevents the calculation |

Confidence describes evidence quality. It does not soften a hard failure.

## 11. Sarah v1 worked validation

### 11.1 Frozen inputs

**Snapshot:** Start of September 2026 spending cycle

| Profile field | Value |
|---|---|
| Name | Sarah Wonk |
| Age | 25 |
| Location | Manchester |
| Employment | Customer Insights Analyst at OniBank |
| Gross salary | £38,500 |
| Payday | Last working day of each month |
| Consumer debt | None |
| Student loan | Deducted before confirmed take-home pay |

| Input | Value |
|---|---:|
| Actual current-account balance | £2,750 |
| September routine-spending reserve | £1,850 |
| Desired safety buffer | £900 |
| Monthly take-home pay | £2,450 |
| Normal monthly goal budget | £600 |
| Emergency fund opening balance / target | £3,300 / £4,500 |
| House deposit opening balance / target | £7,200 / £25,000 |
| Holiday opening balance / target | £350 / £1,200 |
| Overdraft | £500 available; excluded from cash and not used |

The £2,450 net pay is after Sarah's 3% pension contribution and student-loan deduction.

Her frozen monthly routine-spending envelope is:

| Category | Amount |
|---|---:|
| Rent | £825 |
| Council tax | £90 |
| Utilities and internet | £95 |
| Groceries | £240 |
| Transport | £170 |
| Phone | £22 |
| Insurance | £18 |
| Subscriptions | £30 |
| Flexible spending | £360 |
| **Total** | **£1,850** |

Employer-benefit context:

- Sarah's 3% employee pension contribution and the matching 3% employer contribution are active.
- OniBank's additional match up to 5% is Available, not Active.
- OniBank's season-ticket loan is Eligibility unknown.
- Neither opportunity changes the baseline cash ledger.

### 11.2 Baseline cash ledger

Goal allocation is shown as emergency fund / house deposit / holiday.

| Period | Opening cash | Routine spend | One-off | Payday | Goal transfers | Closing cash | Closing safety buffer | Lowest cash |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Sep 2026 | £2,750 | −£1,850 | £0 | +£2,450 | −£600 | £2,750 | £900 | £900 |
| Oct 2026 | £2,750 | −£1,850 | £0 | +£2,450 | −£600 | £2,750 | £900 | £900 |
| Nov 2026 | £2,750 | −£1,850 | £0 | +£2,450 | −£600 | £2,750 | £900 | £900 |
| Dec 2026 | £2,750 | −£1,850 | £0 | +£2,450 | −£600 | £2,750 | £900 | £900 |
| Jan 2027 | £2,750 | −£1,850 | £0 | +£2,450 | −£600 | £2,750 | £900 | £900 |
| Feb 2027 | £2,750 | −£1,850 | £0 | +£2,450 | −£600 | £2,750 | £900 | £900 |

Baseline goal balances:

| Period | Allocation: EF / House / Holiday | Emergency fund | House deposit | Holiday |
|---|---:|---:|---:|---:|
| Opening | — | £3,300 | £7,200 | £350 |
| Sep 2026 | £300 / £200 / £100 | £3,600 | £7,400 | £450 |
| Oct 2026 | £300 / £200 / £100 | £3,900 | £7,600 | £550 |
| Nov 2026 | £300 / £200 / £100 | £4,200 | £7,800 | £650 |
| Dec 2026 | £300 / £200 / £100 | £4,500 | £8,000 | £750 |
| Jan 2027 | £0 / £500 / £100 | £4,500 | £8,500 | £850 |
| Feb 2027 | £0 / £500 / £100 | £4,500 | £9,000 | £950 |

Checks:

- Every month reconciles under the ledger equation.
- Actual current-account balance remains £2,750.
- The £900 safety buffer remains separate from the £1,850 next-cycle reserve.
- Emergency-fund overflow moves to the house deposit from January.

### 11.3 £650-trip scenario cash ledger

The trip is an additional September one-off before payday. September goal transfers remain committed.

| Period | Opening cash | Routine spend | Trip | Payday | Goal transfers | Closing cash | Closing safety buffer | Lowest cash |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Sep 2026 | £2,750 | −£1,850 | −£650 | +£2,450 | −£600 | £2,100 | £250 | £250 |
| Oct 2026 | £2,100 | −£1,850 | £0 | +£2,450 | £0 | £2,700 | £850 | £250 |
| Nov 2026 | £2,700 | −£1,850 | £0 | +£2,450 | −£550 | £2,750 | £900 | £850 |
| Dec 2026 | £2,750 | −£1,850 | £0 | +£2,450 | −£600 | £2,750 | £900 | £900 |
| Jan 2027 | £2,750 | −£1,850 | £0 | +£2,450 | −£600 | £2,750 | £900 | £900 |
| Feb 2027 | £2,750 | −£1,850 | £0 | +£2,450 | −£600 | £2,750 | £900 | £900 |

Trip-scenario goal balances:

| Period | Buffer restoration | Allocation: EF / House / Holiday | Emergency fund | House deposit | Holiday |
|---|---:|---:|---:|---:|---:|
| Opening | — | — | £3,300 | £7,200 | £350 |
| Sep 2026 | £0; transfers locked | £300 / £200 / £100 | £3,600 | £7,400 | £450 |
| Oct 2026 | £600 | £0 / £0 / £0 | £3,600 | £7,400 | £450 |
| Nov 2026 | £50 | £250 / £200 / £100 | £3,850 | £7,600 | £550 |
| Dec 2026 | £0 | £300 / £200 / £100 | £4,150 | £7,800 | £650 |
| Jan 2027 | £0 | £300 / £200 / £100 | £4,450 | £8,000 | £750 |
| Feb 2027 | £0 | £50 / £450 / £100 | £4,500 | £8,450 | £850 |

Checks:

- No required payment is missed.
- Cleared cash never becomes negative.
- No overdraft or credit is used.
- Minimum cash is £250.
- The safety buffer returns to £900 at the November allocation event.
- At February, total goal balances are £650 below baseline: £13,800 versus £14,450.

### 11.4 Goal completion validation

#### Emergency fund

- Baseline: £4,500 reached in December 2026.
- Trip: £4,450 after January; the February allocation needs £50, so completion is February 2027.

#### Holiday

- Baseline: £950 after February, then £100 in March, £100 in April and £50 in May. Completion is May 2027.
- Trip: £850 after February, then £100 in March, April and May, followed by £50 in June. Completion is June 2027.

#### House deposit — baseline

- £9,000 after February 2027.
- £500 in March and April produces £10,000.
- May receives £500 plus the holiday's unused £50, producing £10,550.
- From June 2027, the full £600 rolls to the house deposit.
- After 24 full £600 contributions through May 2029, the balance is £24,950.
- June 2029 contributes the final £50. Completion is June 2029.

#### House deposit — trip

- £8,450 after February 2027.
- £500 in March, April and May produces £9,950.
- June receives £500 plus the holiday's unused £50, producing £10,500.
- From July 2027, the full £600 rolls to the house deposit.
- After 24 full £600 contributions through June 2029, the balance is £24,900.
- July 2029 contributes the final £100. Completion is July 2029.

### 11.5 Classification validation

Trip scenario metrics:

| Metric | Result |
|---|---:|
| Hard consequences | None |
| Minimum safety buffer | £250 |
| Desired safety buffer | £900 |
| Minimum buffer ratio | 0.2777… |
| Recovery cycles | 2 |
| Maximum goal delay | 2 months |
| Six-cycle goal shortfall | £650 |
| Goal-budget equivalent | 1.0833… cycles |

Therefore:

- Safety severity is **Significant** because the buffer ratio is below 0.50 and recovery takes two allocation events.
- Future severity is **Significant** because the emergency fund is delayed two months and the goal shortfall exceeds one contribution cycle.
- No Hard or Risky rule applies.

The deterministic class is:

> **Affordable — significant trade-off**

The approved user-facing wording is:

> **Affordable, but with a meaningful short-term safety-buffer trade-off.**

### 11.6 Sarah v1 acceptance tests

Sarah v1 has 19 acceptance tests in total: 5 baseline tests and 14 trip-scenario tests.

| ID | Expected result |
|---|---|
| SARAH-B-001 | Baseline current-account closing balance is £2,750 in every displayed month |
| SARAH-B-002 | Baseline closing safety buffer is £900 in every displayed month |
| SARAH-B-003 | Baseline emergency fund completes in December 2026 |
| SARAH-B-004 | Baseline holiday completes in May 2027 |
| SARAH-B-005 | Baseline house deposit completes in June 2029 |
| SARAH-T-001 | Trip is an additional £650 September debit |
| SARAH-T-002 | September goal transfers remain £600 |
| SARAH-T-003 | Trip-scenario September closing cash is £2,100 |
| SARAH-T-004 | Trip-scenario September closing safety buffer is £250 |
| SARAH-T-005 | Lowest projected cash is £250 and credit use is £0 |
| SARAH-T-006 | October restores £600 to the buffer and makes no goal contribution |
| SARAH-T-007 | November restores £50 and allocates £250 / £200 / £100 to emergency / house / holiday |
| SARAH-T-008 | Safety buffer first returns to £900 in November 2026 |
| SARAH-T-009 | Emergency fund completes in February 2027 |
| SARAH-T-010 | Holiday completes in June 2027 |
| SARAH-T-011 | House deposit completes in July 2029 |
| SARAH-T-012 | February goal balances total £13,800, exactly £650 below baseline |
| SARAH-T-013 | Classification is Affordable — significant trade-off |
| SARAH-T-014 | User-facing summary is “Affordable, but with a meaningful short-term safety-buffer trade-off.” |

## 12. Explicitly unresolved details

The following do not change Sarah's frozen monthly outcomes, but must be resolved before claiming exact daily predictions beyond the fallback rules in this specification:

1. **Sarah's individual transaction dates:** The routine categories have monthly amounts but not confirmed bill dates. Daily projections therefore use the disclosed spreading and conservative-order assumptions.
2. **Exact trip payment date:** Sarah v1 establishes that the payment occurs during the September spending cycle before payday, but not the exact day. The £250 minimum is invariant within that boundary; the date of the minimum is not yet an acceptance criterion.
3. **UK bank-holiday calendar source:** “Last working day” requires a jurisdictional calendar. The behavioural rule is defined, but the authoritative calendar source is not part of this specification.
4. **Pension 3%-to-5% payroll effect:** No numeric scenario may be produced until the change in Sarah's net pay and its effective payday are supplied or explicitly estimated.
5. **Estimate ranges:** Sarah's fixture values are treated as fixed test inputs. Real user estimates require explicit ranges before uncertainty sensitivity can be fully evaluated.
6. **User-facing goal priority controls:** The engine-level allocation order is defined. How and when users edit it is a later product-design decision.

These items MUST NOT be resolved by changing Sarah's amounts or goal dates to suit a later screen.
