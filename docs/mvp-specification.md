# Future You — MVP Specification

**Version:** 1.0-draft  
**Status:** Proposed scope contract  
**Market assumption:** UK, GBP, monthly employed-income use case  
**Canonical acceptance profile:** Sarah v1  
**Behavioural dependencies:** `simulation-rules-specification.md`, `golden-path-conversation-specification.md`, `golden-path-ui-mapping.md`  
**Out of scope for this document:** Frontend, backend, database, model/provider and deployment architecture

## 0. Scope language

This specification uses:

- **MUST:** Required for the MVP to prove its product promise.
- **SHOULD:** Expected in version one, but may be cut without invalidating the canonical demo or core acceptance journey.
- **MAY:** Optional polish if it does not delay MUST work.
- **POST-MVP:** Deliberately deferred until after the core proposition is proven.
- **OUT OF SCOPE:** Not part of the current product direction or inappropriate for Future You to provide.

The simulation specification remains the source of truth for financial logic. The conversation specification governs interaction behaviour. The frozen UI mapping governs how those behaviours appear in the supplied visual language. This document decides which of those capabilities ship in version one.

## 1. MVP product promise

### 1.1 Smallest complete proposition

Future You MVP is a conversational financial decision simulator that uses a user's current financial context and savings goals to answer:

> **If I make this one-off financial decision, how does my future change?**

It must show, end to end:

- Whether required spending remains covered
- Whether cash becomes negative or borrowing is required
- How the user's preferred safety buffer changes and recovers
- How savings goals and completion dates change
- How changing the decision amount or timing changes those consequences
- Which assumptions produced the result

### 1.2 What the MVP must prove

The MVP succeeds if a user can enter enough context once, ask a natural-language one-off purchase question, receive an explainable deterministic before/after forecast, explore calculated alternatives, and return to an unchanged current path.

The MVP is not trying to prove that Future You can answer every financial question. It is proving that conversational decision simulation is valuable, understandable and trustworthy.

## 2. MVP user journey

| Stage | MVP status | Minimum behaviour | Simplification or deferral |
|---|---|---|---|
| Account creation/login | **MUST** | Create or access an account with ordinary authentication fields | No social login, identity verification or employer data in signup |
| Financial onboarding | **MUST** | Manually collect the minimum context required for a baseline | No bank, payroll or document connection |
| Employer/workplace onboarding | **SHOULD** | Optional employer selection or manual employer name after financial onboarding | Skippable; no employer verification or integration |
| Baseline review | **MUST** | Show the financial context and goal plan Future You will use | A concise review, not a budgeting dashboard |
| Home | **MUST** | Decision-first entry, supported prompts, compact goal and opportunity preview | No transaction feed or category charts |
| Ask initial state | **MUST** | Natural-language input using existing context | No compulsory pre-question form |
| Decision simulation | **MUST** | One-off current-account purchase with amount and monthly timing | No instalments, recurring decisions or mixed funding |
| Primary result | **MUST** | Classification, safety impact, required-payment coverage, borrowing and recovery | Detailed ledger is expandable |
| Before/after result | **MUST** | Current path versus selected what-if | No complex analytical dashboard |
| Amount alternatives | **MUST** | Original, 75% and 60% candidates under the frozen rounding rule | No optimisation or AI-generated financial effects |
| Timing alternative | **MUST** | Move the same one-off payment to another monthly spending cycle | No automatic claim that waiting is better |
| Goal impact | **MUST** | Show baseline and hypothetical completion dates separately | No automatic priority recommendation |
| Benefit surfacing | **MUST** | Show relevant known opportunity, state and missing information | Numeric benefit uptake is POST-MVP |
| Return to current path | **MUST** | Re-select the unchanged baseline after exploration | No scenario becomes real automatically |

### 2.1 Canonical route

```text
Authentication
  → manual financial onboarding
  → optional workplace details
  → baseline review
  → Home
  → Ask
  → £650 trip result
  → before/after impact
  → £500 and £400 options
  → October option
  → incomplete employer opportunity
  → return to current path
```

## 3. Supported financial context

### 3.1 MVP context boundaries

The MVP supports:

- One participating current account
- One fixed monthly recurring net-income stream
- Fixed monthly payday or last-working-day timing
- GBP only
- Routine monthly spending, with optional itemisation
- Required bills and repayments
- A user-chosen safety buffer
- One or more cash savings goals
- Optional employer and benefit information

Multiple cash accounts, variable-income forecasting, investments and multi-currency context are POST-MVP.

### 3.2 Field requirements

| Field | Requirement | Derivable | Estimate allowed | May be omitted | MVP rule |
|---|---|---:|---:|---:|---|
| Currency | Required | Yes: GBP default | No | No | MVP is UK/GBP only |
| Current-account cleared balance | Required | No | Yes | No | An accepted estimate produces lower confidence |
| Balance as-of date | Required | Yes: entry date | No | No | User may correct it during review |
| Pending confirmed cash events | Optional | No | Yes | Yes | Included only when entered |
| Net income amount | Required | No | Yes | No | Must represent spendable cash after deductions |
| Pay frequency | Required confirmation | Yes: monthly in MVP | No | No | Other frequencies are POST-MVP |
| Next payday or payday rule | Required | Partly | No | No | “Last working day” and fixed-date rules supported |
| Fixed-income end date | Optional | No | No | Yes | Omitted means no known end inside the forecast |
| Routine-spending total | Required | Sum of entered categories | Yes | No | User confirms it includes normal spending |
| Routine-spending categories | Optional | No | Yes | Yes | Used for explanation, not required for the headline result |
| Required bills/repayments present? | Required confirmation | No | No | No | User must confirm none or provide them |
| Required bill/repayment amount | Required when applicable | No | Yes | Only if none apply | Included in routine total and marked required |
| Required bill/repayment due date | Optional in MVP | No | No | Yes | If missing, conservative cycle timing is disclosed |
| Relevant debt balance | Optional | No | Yes | Yes | Balance is informational; required payment is what affects cash |
| Overdraft/credit limit | Optional | No | No | Yes | Never counted as cash |
| Desired safety buffer | Required | No | No | No | User preference, not an affordability hard limit |
| At least one savings goal | Required | No | No | No | Required to prove future-goal impact |
| Goal opening balance | Required per goal | No | Yes | No | Cash savings only in MVP |
| Goal target | Required per goal | No | No | No | Nominal GBP target |
| Normal contribution | Required per goal | No | Yes | No | Used in allocation plan |
| Goal target deadline | Optional | No | No | Yes | MVP calculates completion but does not judge “on track” |
| Goal allocation order | Required | From confirmed onboarding order | No | No | Shown for confirmation; no recommendation logic |
| Overflow goal | Optional | No | No | Yes | If omitted, unused contribution remains unallocated cash |
| Upcoming confirmed commitments | Optional, with required none/yes confirmation | No | Yes | Yes after “none known” | Included only when entered or confirmed |
| Employer | Optional | No | No | Yes | Collected after account creation; skipping hides employer opportunities |
| Active-benefit status | Optional | No | No | Yes | Informational unless its cash effect is already represented elsewhere |
| Available-benefit information | Optional | Curated/mock data | No | Yes | May be surfaced as an opportunity only |
| Pension employee percentage | Optional | No | No | Yes | Informational; net income already reflects it |
| Employer pension match | Optional | Curated/manual | No | Yes | Opportunity only in MVP |

### 3.3 Baseline sufficiency

A usable MVP baseline requires:

1. Participating current-account balance
2. Net income and payday rule
3. Routine-spending amount
4. Confirmation about required bills and repayments
5. Desired safety buffer
6. At least one goal with balance, target and contribution
7. Confirmed allocation order

If one is materially unknown, Future You requests it before producing a numerical affordability class.

## 4. Supported decision types

| Decision or variation | MVP status | Behaviour |
|---|---|---|
| Single one-off purchase from the current account | **MUST** | Amount, purpose and spending cycle; additional to normal spending |
| Change one-off amount | **MUST** | Independent sibling what-if from the unchanged baseline |
| Automatic 75% and 60% amount candidates | **MUST** | Deterministic rounding rule from simulation specification |
| Change one-off monthly timing | **MUST** | Move the same payment to another spending cycle |
| Explain why a result changed | **MUST** | Reuse selected ledger; no new scenario |
| Confirm/edit supported assumptions | **MUST** | Amount, payment month, one-payment confirmation and current-account funding |
| Change safety-buffer preference inside a scenario | **POST-MVP** | General simulator supports it, but MVP conversation asks for a value and does not promise recalculation |
| Change goal contributions as a decision | **POST-MVP** | Requires a fully specified contribution-change journey |
| Save first, then buy | **POST-MVP** | Funding source and temporary-goal priority not frozen |
| Increase pension contribution | **POST-MVP** | Net-pay effect and payroll timing not supplied |
| Simulate employer-benefit uptake | **POST-MVP** | Benefit terms and cash treatment are incomplete |
| Recurring rent or expense change | **POST-MVP** | Not part of the golden one-off decision contract |
| Split payment or instalments | **POST-MVP** | Trip-cost composition rules deliberately excluded |
| Substitute normal spending | **POST-MVP** | MVP treats the purchase as additional spending |
| Pay from goal savings or multiple sources | **POST-MVP** | MVP does not silently raid or combine funding sources |
| Explicit credit-financed purchase | **POST-MVP** | No credit-product or repayment modelling in version one |

When a user asks for an unsupported decision, Future You clearly states the boundary and requests a supported one-off amount/timing version when useful. It does not approximate the unsupported scenario.

## 5. MVP simulation capabilities

### 5.1 MUST-have calculations

The MVP simulator must calculate:

- Immutable current-path baseline
- One-off scenario projection
- Event-ordered or conservatively scheduled cash flow
- Opening and closing actual cash per forecast period
- Reserved spending and derived safety buffer
- Lowest projected cash position
- Required-payment coverage
- Whether cash becomes negative
- Whether unplanned overdraft or credit would be required
- Safety-buffer drawdown and ratio
- Buffer-recovery period
- Goal contribution allocation
- Partial final goal contributions
- Contribution rollover
- Goal balances per period
- Goal completion month
- Scenario-versus-baseline deltas
- Five-level affordability classification
- Deterministic amount alternatives
- Monthly timing alternatives
- Six-month detailed forecast
- Extended nominal projection until supported goals complete or reach the configured product horizon

### 5.2 Required outputs

Every evaluated scenario returns:

- Direct affordability class
- Hard-consequence flags
- Safety metrics
- Future/goal metrics
- Before/after values
- Assumptions used
- Confidence state
- Branch identity and unchanged baseline identity
- Explainable month-by-month trace

### 5.3 Later simulator enhancements

- Exact daily transaction forecasting from connected data
- Multiple current accounts
- Variable or probabilistic income
- Estimate-range sensitivity
- Interest, inflation and investment growth
- Debt-interest and credit repayment models
- Recurring changes
- Save-first policies
- Pension scenarios
- Benefit-uptake scenarios
- Spending substitution
- Multi-currency

## 6. Conversation capabilities

### 6.1 MUST support

- Natural-language entry for a one-off decision
- Extraction of purpose, GBP amount and approximate month
- Use of existing confirmed context
- No repeated questions for known context
- Minimal material clarification
- Conservative disclosed assumptions
- Direct result before detailed data
- Explanation of buffer and goal changes
- Follow-ups changing amount
- Follow-ups changing monthly timing
- “Why?” questions that reuse a scenario
- Switching among saved what-ifs and current path
- Editing supported assumptions as another option
- Incomplete opportunity state and missing-information request
- Clear unsupported-scenario response

### 6.2 MAY support

- Voice input using the same supported intent boundary
- Friendly suggested prompt completion
- Renaming a what-if
- Deleting an unneeded what-if

### 6.3 Forbidden behaviour

The conversational layer MUST NOT:

- Perform or invent financial arithmetic
- Change a simulator result to fit conversational wording
- Present an inactive benefit as money Sarah has
- Treat overdraft or credit as available cash
- Move money out of a goal without an explicit supported scenario
- Mutate the current path when a what-if is explored
- Claim “on track” without a target deadline and deterministic rule
- Recommend what Sarah “should” prioritise without specified ranking logic
- Invent employer eligibility, benefit value or repayment terms
- Answer unsupported recurring, pension, debt or credit scenarios with guessed numbers
- Present general investment, tax, pension or credit advice as a simulation result

## 7. Home scope

### 7.1 MUST include

- Greeting and profile access
- Ask Future You hero
- Primary “Can I afford something?” action
- Core supported prompt cards:
  - Can I afford something?
  - What if it cost less?
  - What if I waited a month?
  - How would a purchase change my goals?
- Compact “Your future right now” baseline preview
- At least one goal preview
- Optional employer-opportunity preview when employer context exists
- Fixed Home, Goals, Ask and Benefits navigation

### 7.2 Sarah v1 Home values

- Safety buffer: £900, at preferred level
- Emergency fund: £3,300 / £4,500, 73%, December 2026
- House deposit: £7,200 / £25,000, 29%, June 2029
- Holiday: £350 / £1,200, 29%, May 2027
- Season-ticket loan: Eligibility unknown; no numeric value

### 7.3 MUST NOT include

- Large current-account balance
- Transaction feed
- Category spending chart
- Automatic “what to prioritise” recommendation
- “How am I doing?” score without a specification
- Future You Wrapped
- Fabricated annual benefit value

## 8. Goals scope

### 8.1 MUST support

- Current goal name
- Current balance
- Target amount
- Normal contribution
- Current-path forecast completion
- Current progress percentage
- Clearly labelled hypothetical preview from Ask
- Current-path versus selected-what-if completion date
- Delay or acceleration amount
- Return to current path
- Editing an existing goal's balance, target and normal contribution

### 8.2 SHOULD support

- Add another cash savings goal
- Archive an unused goal without deleting its historical scenario references

### 8.3 Allocation priority

The simulator supports an explicit allocation order. In MVP:

- Onboarding derives the initial order from the order in which goals are entered.
- The review step shows that order and asks the user to confirm it.
- Future You does not recommend the order.
- The Goals UI does not support later drag-and-drop reprioritisation.
- Editing allocation priority after onboarding is POST-MVP.

Sarah v1 retains her frozen allocation order and rollover rule.

### 8.4 Not supported in Goals MVP

- Automatic goal prioritisation
- “On track” status without a deadline
- Investment-linked goals
- Interest or return projections
- Shared goals
- Automatic contribution transfers

## 9. Benefits scope

### 9.1 What Benefits means in MVP

Benefits is an opportunity-discovery surface. It is not an employer marketplace and does not automatically change the baseline.

### 9.2 MUST support

- Optional employer association during onboarding
- Manually entered or curated/mock employer opportunity records
- Available, Eligibility unknown and Active labels
- Recognition that Simulated is a distinct future state, without fabricating or displaying that state before a numerical branch exists
- Clear “included/not included in your current path” status
- Missing-information checklist
- Opportunity card on Home or Ask when relevant
- Benefits primary screen
- “Explore in Ask” transition
- Incomplete child what-if that contains no fabricated numbers

### 9.3 Active benefits

An active benefit may be displayed as Active. In MVP it affects cash only when its cash impact is already represented in net income, routine spending or another confirmed cash-flow field.

Employer pension contributions remain non-spendable. Sarah's current pension is already reflected in her £2,450 net income.

### 9.4 Explicitly POST-MVP

- Numerical season-ticket-loan scenario
- Numerical pension 3%-to-5% scenario
- Benefit eligibility verification
- Employer or payroll connection
- Benefit activation or application
- Benefit-value ranking
- Automatically treating benefit uptake as current context

## 10. Onboarding scope

### 10.1 Authentication

Authentication collects only account-access information:

- Email
- Password or equivalent account credential
- Login/signup choice

It MUST NOT require:

- Company ID
- Employer
- Workplace verification
- Financial details

### 10.2 Minimum financial onboarding

The shortest trustworthy flow collects:

1. **Cash snapshot**
   - Current-account balance
   - Balance date
2. **Income and timing**
   - Net income
   - Pay frequency
   - Next payday or payday rule
3. **Spending and commitments**
   - Routine-spending estimate
   - Required-bills/repayments confirmation
   - Relevant repayment details when applicable
4. **Safety preference**
   - Desired unallocated buffer
5. **Goals**
   - At least one goal, balance, target and contribution
   - Goal entry order and optional overflow destination
6. **Review**
   - Current context
   - Estimates and assumptions
   - Allocation order

The user may correct any value before the baseline is accepted.

### 10.3 Employer/workplace association

After financial onboarding, a separate skippable step asks:

- Employer name or employer code
- Whether Sarah wants to see workplace opportunities
- Any known current-benefit state

No verification is required in MVP. Skipping the step does not block decision simulation.

### 10.4 Demo onboarding

Sarah v1 may be available as a preloaded mock profile for demonstrations and product testing. It must be clearly labelled demo data and remain identical to the frozen fixture.

## 11. Assumptions and uncertainty

### 11.1 MUST support

- Confirmed values
- User-accepted estimates
- System assumptions
- Unknown values
- Hypothetical values
- Material-unknown blocking behaviour
- Compact assumption summary in the result
- “How we calculated this” detail
- Editing supported assumptions as another what-if
- High, Medium and Insufficient information confidence states

### 11.2 MVP confidence rule

- **High:** all material context and selected scenario parameters are confirmed.
- **Medium:** accepted estimates or conservative assumptions exist, but a numerical result remains defensible.
- **Insufficient information:** a material unknown prevents a trustworthy result.

The full Low-confidence range analysis from the simulation specification is POST-MVP because MVP does not yet support systematic uncertainty ranges.

### 11.3 Editable assumptions in MVP

The user may confirm or change:

- Purchase amount
- Purchase month
- That it is one current-account payment
- That it is additional to routine spending

Changing a supported assumption creates another what-if. It never mutates the current path.

Instalments, goal-savings funding, credit funding and spending substitution are shown as unsupported in MVP rather than approximated.

### 11.4 Later uncertainty capabilities

- Estimate ranges
- Sensitivity analysis
- Multiple possible affordability classes
- Automated stale-data detection
- Confidence derived from connected-data coverage
- Probabilistic or irregular-income forecasts

## 12. Data entry versus connected financial data

### 12.1 MVP decision

The MVP uses:

- **Manual user entry** for financial context and goals
- **Preloaded Sarah v1 mock data** for the canonical demo and acceptance tests
- **Curated/mock employer opportunity data** for Benefits

The MVP does not require:

- Open banking
- Bank-account feeds
- Employer APIs
- Payroll APIs
- Uploaded statements or payslips
- Automatic transaction categorisation

### 12.2 Reason

The core proposition is decision simulation, not data aggregation. Manual and mock data are sufficient to test whether users understand and value the before/after forecast. Integrations would add cost, consent flows, failure modes and data-cleaning work without being necessary to prove the proposition.

## 13. MVP screens and states

### 13.1 Required primary screens

| Item | Status | Purpose |
|---|---|---|
| Welcome | **MUST** | Entry to login or signup |
| Login | **MUST** | Access an existing account |
| Signup | **MUST** | Create an account without employer association |
| Financial onboarding flow | **MUST** | Create a usable baseline |
| Home | **MUST** | Decision-first starting point |
| Ask | **MUST** | Conversation, simulation and scenario exploration |
| Goals | **MUST** | Current destinations and hypothetical impact preview |
| Benefits | **MUST** | Opportunity states and missing information |

### 13.2 Required states

| Screen | State | Status |
|---|---|---|
| Onboarding | Cash, income, spending, buffer, goals and review steps | **MUST** |
| Onboarding | Optional employer/workplace step | **SHOULD** |
| Home | Current-path default | **MUST** |
| Ask | Initial/new question | **MUST** |
| Ask | Brief calculating feedback | **MUST** |
| Ask | £650-style one-off result | **MUST** |
| Ask | Before/after expanded | **MUST** |
| Ask | Amount alternatives expanded | **MUST** |
| Ask | Selected £500/£400 option | **MUST** |
| Ask | Monthly timing alternative | **MUST** |
| Ask | Opportunity needs information | **MUST** |
| Ask | Unsupported-decision boundary | **MUST** |
| Goals | Current path | **MUST** |
| Goals | Hypothetical preview | **MUST** |
| Goals | Edit existing goal | **MUST** |
| Goals | Add goal | **SHOULD** |
| Benefits | Available/eligibility-unknown opportunity | **MUST** |
| Benefits | Active informational benefit | **SHOULD** |

### 13.3 Required sheets and expanders

| Item | Status |
|---|---|
| Scenario selector | **MUST** |
| Edit supported assumptions | **MUST** |
| How we calculated this | **MUST** |
| See monthly path | **MUST** |
| Financial-context review | **MUST** |
| Opportunity missing-information summary | **MUST** |
| Post-onboarding financial-context editor | **SHOULD** |

### 13.4 Post-MVP states

- Numeric employer-opportunity result
- Save-first builder
- Scenario-specific safety-target editor
- Recurring-expense scenario
- Pension-contribution scenario
- Goal-priority editor
- Transaction and account views
- Future You Wrapped

## 14. Persistence

This section defines user-visible expectations only.

| Information | MVP persistence behaviour |
|---|---|
| Financial context | Persists across sessions until the user edits it |
| Accepted estimates and evidence labels | Persist with the values they describe |
| Goals and allocation plan | Persist across sessions |
| Current baseline | Persists as the current path and is regenerated when confirmed context changes |
| Baseline version used by a scenario | Remains associated with that scenario for explainability |
| Conversation | At least the active decision thread persists across sessions |
| Evaluated scenarios | Persist inside their decision thread |
| Scenario assumptions | Persist with each scenario independently |
| Selected scenario | MAY resume; reopening on Your current path is also acceptable if prior options remain available |
| Benefit states | Persist as Available, Eligibility unknown or Active |
| Incomplete opportunity exploration | Persists as Needs information |

### 14.1 Baseline change rule

When confirmed financial context changes:

- A new current-path version is produced.
- Existing scenarios remain attached to the context version that produced them.
- They are labelled as based on older information until explicitly recalculated.
- Recalculation creates updated scenario results; it does not silently rewrite historical explanations.

### 14.2 No scenario commitment in MVP

The MVP does not support automatically turning a hypothetical purchase into a real transaction. Sarah may confirm assumptions, but the trip remains a what-if unless future product scope adds a commit workflow.

## 15. Explicit non-goals

### 15.1 POST-MVP

- Open-banking and account integrations
- Automatic transaction categorisation
- Multiple participating current accounts
- Connected employer and payroll data
- Uploaded statement or payslip extraction
- Variable-income and uncertainty-range modelling
- Weekly, fortnightly and four-weekly income cycles
- Instalment and split-payment decisions
- Spending-substitution scenarios
- Recurring rent or expense changes
- Save-first scenarios
- Scenario-specific safety-buffer changes
- Goal-contribution-change scenarios
- Goal-priority editing and automatic recommendations
- Full pension and pension-match modelling
- Numerical season-ticket-loan simulation
- Complex debt and interest optimisation
- Tax optimisation
- Interest, inflation and investment-growth projections
- Notifications and reminders
- Future You Wrapped
- Social and shared-goal features
- Financial-product marketplace
- Autonomous transfers, applications or other financial actions

### 15.2 OUT OF SCOPE

- Investment recommendations
- Credit-product recommendations
- Telling users what they must purchase or prioritise
- Presenting available credit as spendable money
- Applying for financial products on the user's behalf
- Autonomous movement of user money
- Fabricated employer eligibility or benefit values

## 16. MVP acceptance criteria

### 16.1 General product acceptance

| ID | Criterion |
|---|---|
| MVP-001 | A user can create an account without providing employer information |
| MVP-002 | A user can complete manual financial onboarding and review the resulting current context |
| MVP-003 | The product refuses or requests missing information when a material baseline input is absent |
| MVP-004 | Home leads with Ask Future You and only presents supported decision prompts as MVP actions |
| MVP-005 | A user can enter a one-off purchase question naturally without completing another financial form |
| MVP-006 | The result directly states classification, safety impact, required-payment coverage, borrowing and recovery |
| MVP-007 | The result shows current-path and what-if goal completion dates before detailed ledger data |
| MVP-008 | “How we calculated this” distinguishes known, estimated, assumed, hypothetical and excluded values |
| MVP-009 | Amount and timing changes create separate saved what-ifs from the same baseline |
| MVP-010 | Selecting or editing a what-if never mutates the current path |
| MVP-011 | Goals defaults to the current path and labels scenario previews Hypothetical |
| MVP-012 | Benefits can show Eligibility unknown without adding a value to the baseline |
| MVP-013 | An incomplete benefit exploration displays no invented numeric impact |
| MVP-014 | Unsupported decisions receive an explicit boundary rather than a guessed calculation |
| MVP-015 | The mobile experience retains the supplied visual identity and fixed navigation |
| MVP-016 | At least the active decision conversation and its evaluated options persist across a return session |

### 16.2 Sarah v1 canonical acceptance journey

The existing 19 Sarah baseline and £650 acceptance tests remain mandatory. The product-level journey additionally proves:

| Scenario | Required result |
|---|---|
| Your current path | £900 safety buffer; emergency fund Dec 2026; holiday May 2027; house deposit Jun 2029 |
| £650 trip | £250 lowest buffer; no missed bills; £0 overdraft; restored Nov 2026; emergency Feb 2027; holiday Jun 2027; house Jul 2029; Significant trade-off |
| £500 option | £400 lowest buffer; restored Oct 2026; emergency Jan 2027; holiday Jun 2027; house Jun 2029; Significant trade-off |
| £400 option | £500 lowest buffer; restored Oct 2026; emergency Jan 2027; holiday Jun 2027; house Jun 2029; Noticeable trade-off |
| Go in October | £250 lowest buffer; restored Nov 2026; same goal dates as £650 September; Significant trade-off |
| Trip + season-ticket loan | Needs information; no numeric result; current path and trip result unchanged |

Further acceptance requirements:

- The £650 result displays the assumption that the cost is one additional current-account payment before September payday.
- £500, £400 and October remain independently selectable after exploration.
- Returning to **Your current path** restores baseline presentation without deleting what-ifs.
- The £500 overdraft never contributes to available cash.
- The £2,100 September closing account is not confused with the £250 safety buffer.
- Employer information is absent from mandatory signup.
- Unsupported prototype prompts do not appear as functional MVP promises.

## 17. Demo definition

### 17.1 Evaluator demo

The core demo should take approximately three to five minutes.

1. Sign in as Sarah using the clearly labelled preloaded demo profile.
2. Land on decision-first Home; briefly show her £900 safety buffer and three goal previews.
3. Tap **Can I afford something?**
4. Ask: “Can I afford a £650 trip next month?”
5. Show the immediate answer: Significant trade-off, £900 → £250, bills covered, £0 overdraft, restored November.
6. Show emergency, holiday and house-deposit date changes.
7. Open amount alternatives and select £500, then £400.
8. Show that £400 changes to Noticeable while £500 remains Significant.
9. Ask: “What if I wait until October?” and show that timing alone does not improve the goal dates.
10. Surface the season-ticket-loan opportunity and show the honest Needs information state.
11. Return to **Your current path** and show that the baseline never changed.

### 17.2 What the demo intentionally omits

- Full onboarding walkthrough
- Editing every context field
- Adding goals
- Every assumptions/ledger detail
- Unsupported decisions
- Numerical benefit simulation
- Any external integration

The demo proves one proposition coherently rather than touring every screen.

## 18. Post-MVP backlog

### 18.1 Simulator

- Multiple accounts and funding sources
- Exact dated bill calendars
- Split payments and instalments
- Spending substitution
- Recurring income/expense changes
- Save-first temporary-goal policy
- Scenario-specific safety targets
- Goal-contribution changes
- Pension-contribution and pension-value projections
- Employer-benefit cash-flow scenarios
- Variable-income ranges and sensitivity
- Interest, inflation and investment returns
- Debt interest and repayment strategies
- Multi-currency

### 18.2 AI and conversation

- Broader supported decision intents
- Deterministic “How am I doing?” summary
- Rule-backed prioritisation conversations
- Multi-decision planning
- Richer clarification for instalments and mixed funding
- Long-term conversation summaries
- Proactive scenario suggestions based on defined rules

### 18.3 Financial integrations

- Open banking
- Transaction feeds and categorisation
- Balance refresh
- Statement and payslip upload
- Payroll integration
- Connected pension data

### 18.4 Employer and benefits

- Verified employer association
- Employer benefit catalogue and source freshness
- Eligibility verification
- Season-ticket-loan terms and numerical simulation
- Pension-match net-pay scenario
- Benefit application or activation flows
- Opportunity valuation and ranking

### 18.5 Goals

- Allocation-priority editor
- Deadline-based on-track status
- Automatic catch-up policies
- Shared goals
- Investment-linked goals
- Goal recommendations based on explicit rules

### 18.6 Personalisation

- Multiple personas and household contexts
- Variable pay patterns
- Custom safety-buffer policies
- Custom classification preferences
- Personalised explanation depth

### 18.7 UI and UX

- Desktop-specific information layouts beyond responsive adaptation
- Advanced scenario comparison
- Calendar-level cash-flow view
- Scenario naming and organisation
- Accessibility refinements from user testing
- Guided education for financial concepts

### 18.8 Engagement

- Notifications and reminders
- Periodic check-ins
- Future You Wrapped
- Progress celebrations
- Re-engagement prompts

### 18.9 Remaining product decisions

No unresolved decision blocks architecture for the MUST scope once this specification is approved.

The following SHOULD/MAY choices can be cut without changing the MVP promise:

- Whether workplace onboarding ships or Sarah-only mock opportunities are used initially
- Whether adding a new goal after onboarding ships alongside editing existing goals
- Whether the selected what-if or Your current path is the default when reopening a conversation
- Whether voice input is included

These choices must be decided during implementation planning by applying the statuses in this document; they must not expand MUST scope.

## 19. Final scope table

| Feature / behaviour | MVP status | Reason | Dependency | Deferred destination if excluded |
|---|---|---|---|---|
| Account creation and login | MUST | Required to retain context and scenarios | Authentication UX | — |
| Employer field in signup | OUT OF SCOPE | Employer association belongs after financial onboarding | Frozen UI mapping | — |
| Manual financial onboarding | MUST | Creates the baseline required for simulation | Context field rules | — |
| Optional workplace onboarding | SHOULD | Enables opportunity surfacing without blocking simulation | Manual/curated employer data | Employer and benefits |
| Sarah v1 demo profile | MUST | Canonical demo and acceptance fixture | Frozen Sarah values | — |
| One current account | MUST | Minimum cash context for MVP | Manual balance entry | Multiple accounts: Simulator |
| Fixed recurring net income | MUST | Required to project funding cycles | Amount and payday | Variable income: Simulator |
| Routine-spending estimate | MUST | Required to calculate saving capacity | User confirmation | Connected categorisation: Integrations |
| Required-payment coverage | MUST | Core hard-consequence output | Bills/repayments confirmation | Exact daily calendar: Simulator |
| Desired safety buffer | MUST | Core safety trade-off measure | User-entered preference | Custom policies: Personalisation |
| At least one goal | MUST | Required to show future consequences | Balance, target, contribution | — |
| Goal allocation order confirmation | MUST | Makes reduced contributions deterministic | Onboarding goal order | Reordering UI: Goals |
| Goal edit | MUST | Keeps manually entered context usable | Goals screen | — |
| Add goal after onboarding | SHOULD | Useful but not required for canonical proof | Goal input and allocation placement | Goals |
| Decision-first Home | MUST | Communicates the product proposition | Frozen UI mapping | — |
| Supported Home prompts only | MUST | Prevents undefined prototype features becoming promises | Decision scope | Broader prompts: AI/conversation |
| Natural-language one-off question | MUST | Core conversational interface | Sufficient baseline | — |
| Single additional current-account payment | MUST | Frozen deterministic decision type | Amount and month | Split/mixed funding: Simulator |
| Baseline projection | MUST | Required comparison anchor | Simulation rules | — |
| Scenario projection | MUST | Core product output | Baseline and one-off event | — |
| Before/after comparison | MUST | Makes future change understandable | Baseline/scenario deltas | — |
| Lowest cash and safety-buffer impact | MUST | Core immediate consequence | Event ledger | — |
| Bills/repayments and borrowing status | MUST | Core hard consequence | Required commitments | — |
| Buffer recovery | MUST | Explains short-term pressure | Allocation policy | — |
| Goal balances and completion dates | MUST | Core future consequence | Goal allocation | — |
| Five-level classification | MUST | Explainable non-binary affordability | Severity rules | — |
| £650/£500/£400 alternatives | MUST | Proves amount trade-offs | Deterministic candidate rule | Threshold optimisation: Simulator |
| Monthly timing alternative | MUST | Proves timing is simulated, not assumed better | Scenario date change | Save first: Simulator |
| Scenario selector and persistence | MUST | Preserves exploration without baseline mutation | Scenario identity rules | Advanced organisation: UI/UX |
| How we calculated this | MUST | Required for trust and assumptions | Provenance and ledger output | — |
| Edit supported assumptions | MUST | Lets users correct scenario interpretation | Supported one-off parameters | Instalments/substitution: Simulator |
| Scenario-specific safety target | POST-MVP | Not required for canonical proof | Explicit replacement target | Simulator / Personalisation |
| Save-first scenario | POST-MVP | Funding priority remains undefined | Temporary purchase-goal policy | Simulator |
| Goal-contribution decision | POST-MVP | Outside one-off purchase scope | Contribution-change rules | Simulator / Goals |
| Recurring-expense decision | POST-MVP | Outside golden path | Recurring event rules | Simulator |
| Pension-contribution simulation | POST-MVP | Net-pay effect not quantified | Payroll calculation | Simulator / Employer |
| Benefit opportunity surfacing | MUST | Proves Benefits as opportunities | Optional employer data | — |
| Benefit eligibility and missing-info state | MUST | Prevents fabricated values | Benefit-state rules | — |
| Numeric benefit simulation | POST-MVP | Terms are incomplete | Quantified eligibility and cash flow | Employer and benefits |
| Goals current-path screen | MUST | Shows real destinations | Goal context | — |
| Goals hypothetical preview | MUST | Makes scenario impact visible without mutation | Selected scenario | — |
| Benefits primary screen | MUST | Completes four-tab product structure | Opportunity records | — |
| High/Medium/Insufficient confidence | MUST | Minimum honest uncertainty communication | Evidence states | Low/range analysis: Simulator |
| Estimate ranges and sensitivity | POST-MVP | Not needed for canonical proof | Bounded input ranges | Simulator |
| Conversation persistence | MUST | Users expect explored decisions to remain | Product persistence rules | — |
| Bank/account integration | POST-MVP | Not needed to prove simulation value | Open banking | Financial integrations |
| Employer/payroll integration | POST-MVP | Manual/curated data is sufficient | External systems | Employer / Integrations |
| Uploaded-document extraction | POST-MVP | Adds complexity without proving core | Document processing | Financial integrations |
| Automatic transaction categorisation | POST-MVP | Would shift MVP toward budgeting | Connected transactions | Financial integrations |
| “How am I doing?” | POST-MVP | Meaning and deterministic output undefined | Status-summary rules | AI/conversation |
| “What should I prioritise?” | POST-MVP | Recommendation/ranking logic undefined | Priority policy | AI/conversation / Goals |
| Future You Wrapped | POST-MVP | Not part of core decision proposition | Historical data and summary logic | Engagement |
| Investment or credit recommendations | OUT OF SCOPE | Conflicts with MVP's explainable trade-off role | — | — |
| Autonomous financial actions | OUT OF SCOPE | MVP explains choices; it does not execute them | — | — |
