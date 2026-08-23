# Future You — Concept & Refinement Timeline

- **Initial concept — Smart personal-finance app**
  - Future You initially looked more like a modern personal-finance dashboard.
  - The product combined:
    - Financial overview
    - Available money
    - Upcoming bills
    - Savings goals
    - Employer benefits
    - AI assistance
  - The Home screen was initially expected to surface most of these features together.

- **Refinement — Realised the dashboard was not the actual solution**
  - We identified that the concept was becoming too similar to a nicer budgeting or banking app.
  - Simply organising somebody's finances was not enough to justify Future You as a distinct product.
  - The core problem shifted towards helping somebody understand the consequences of a financial decision.

- **Refinement — Shift from balance-first to decision-first**
  - The product stopped being centred around:
    - “How much money do I have?”
  - It became centred around:
    - “What am I considering doing with my money?”
  - The Home experience therefore became less focused on balances, charts and transaction information.

- **Refinement — Three core user questions identified**
  - The experience was simplified around three main questions:
    - **Can I afford it?**
    - **Am I on track?**
    - **What am I missing?**
  - These became a simple way of explaining most of Future You's functionality.

- **Refinement — Core proposition established**
  - The central product proposition became:
    - **“I have a money decision. Help me understand what it does to my future.”**
  - Future You should therefore show consequences rather than simply display financial information.

- **Refinement — Flagship scenario introduced**
  - The main demonstration scenario became:
    - **“Can I afford a £650 trip next month?”**
  - Future You should not simply answer yes or no.
  - It should show:
    - Immediate cash impact
    - Whether bills remain covered
    - Safety-buffer impact
    - Goal delays
    - Alternative decisions
    - Relevant opportunities

- **Major concept change — From AI financial coach to financial decision simulator**
  - The product hierarchy became:
    - **Financial context → inputs**
    - **Goals → destinations**
    - **Benefits → opportunities**
    - **Conversation → interface**
    - **Simulation → core product**
  - This established simulation, rather than chat itself, as the core product capability.

- **Refinement — AI role separated from simulation**
  - The AI should:
    - Understand what the user is asking
    - Interpret natural-language decisions
    - Ask necessary clarification questions
    - Explain results
    - Help users explore alternatives
  - The AI should **not** invent financial calculations.
  - The deterministic simulator should produce the actual numbers.

- **Refinement — Goals redefined**
  - Goals stopped being standalone savings-progress widgets.
  - Goals became the destinations against which financial decisions are measured.
  - A scenario can therefore change:
    - Goal balances
    - Contribution schedules
    - Expected completion dates
    - Goal priority trade-offs

- **Refinement — Employer benefits redefined**
  - Employer benefits stopped being a generic perks directory.
  - They became **opportunities** Future You can surface when relevant to a decision.
  - An available benefit must not automatically alter somebody's financial position.

- **Refinement — Employer-benefit states introduced**
  - Benefits were separated into:
    - **Available**
    - **Eligibility unknown**
    - **Simulated**
    - **Active**
  - Only sufficiently quantified, confirmed and active benefits can affect the user's baseline financial context.

- **Refinement — Current reality separated from hypothetical scenarios**
  - Future You introduced a clear distinction between:
    - **Current path**
    - Proposed decision
    - Alternative decision
    - Decision + opportunity
  - Exploring a scenario must never silently alter the user's real financial state.

- **Refinement — Scenario branching introduced**
  - Every hypothetical decision becomes an isolated branch from the user's baseline.
  - Examples include:
    - £650 trip
    - £500 trip
    - £400 trip
    - Going one month later
    - Increasing pension contributions
    - Using an employer benefit
  - The baseline remains unchanged while these possibilities are explored.

- **Refinement — Canonical demo person introduced**
  - A single internally consistent user, **Sarah Wonk**, became the main Future You demo profile.
  - Her:
    - Income
    - Spending
    - Cash
    - Savings
    - Goals
    - Pension
    - Employer
    - Benefits
  - all belong to one coherent financial story.
  - This replaced disconnected placeholder numbers across different screens.

- **Refinement — Actual cash separated from safety buffer**
  - Sarah's finances were refined to distinguish:
    - **Actual current-account balance**
    - **Cash reserved for upcoming spending**
    - **Unallocated safety buffer**
  - Sarah's canonical starting position became:
    - £2,750 actual current-account balance
    - £1,850 reserved routine spending
    - £900 safety buffer
  - The £900 must never be presented as Sarah's total bank balance.

- **Refinement — Safety buffer became a preference rather than a hard rule**
  - Falling below Sarah's £900 preferred buffer does not automatically make a decision unaffordable.
  - Instead, Future You evaluates:
    - How far below the buffer she goes
    - How long the buffer takes to recover
    - Whether bills remain covered
    - Whether cash becomes negative
    - Whether borrowing is required

- **Refinement — Affordability changed from yes/no to trade-off classification**
  - Affordability became a spectrum rather than a binary result.
  - The MVP classification model became:
    - **Affordable — minimal impact**
    - **Affordable — noticeable trade-off**
    - **Affordable — significant trade-off**
    - **Financially risky**
    - **Not currently affordable**

- **Refinement — Three consequence dimensions introduced**
  - Future You evaluates affordability across:
    - **Hard consequences**
      - Missed bills
      - Missed repayments
      - Negative cash
      - Required borrowing
    - **Safety consequences**
      - Safety-buffer reduction
      - Depth of buffer breach
      - Recovery time
    - **Future consequences**
      - Goal delays
      - Reduced savings
      - Opportunity costs

- **Refinement — Goal-allocation rules formalised**
  - Sarah has £600 of normal monthly saving capacity.
  - The simulator now has explicit rules for:
    - Restoring the safety buffer
    - Allocating contributions
    - Completing goals
    - Handling partial final contributions
    - Rolling unused contributions into another goal
    - Preserving scenario-specific contribution changes

- **Refinement — Sarah's £650-trip outcome made mathematically deterministic**
  - The £650 scenario now produces a fixed result:
    - Safety buffer: **£900 → £250**
    - Bills remain covered
    - No overdraft required
    - Buffer restored in **November 2026**
    - Emergency fund: **December 2026 → February 2027**
    - Holiday: **May 2027 → June 2027**
    - House deposit: **June 2029 → July 2029**
  - Classification:
    - **Affordable — significant trade-off**
  - User-facing wording:
    - **“Affordable, but with a meaningful short-term safety-buffer trade-off.”**

- **Refinement — Alternatives became simulator-generated**
  - Future You should not allow the AI to invent alternative financial effects.
  - Alternative scenarios must be calculated by the simulator.
  - Sarah's canonical amount alternatives became:
    - £650
    - £500
    - £400

- **Refinement — Alternative outcomes differentiated**
  - Under Sarah's current plan:
    - £650 remains a **significant trade-off**
    - £500 remains a **significant trade-off**
    - £400 becomes a **noticeable trade-off**
  - This demonstrates that Future You can show how changing the decision changes the trade-off.

- **Refinement — Timing alternatives introduced**
  - Users can also explore:
    - “What if I wait?”
    - “What if I buy it next month?”
    - “What if I go in October instead?”
  - Moving a decision later creates another scenario branch.
  - Waiting is not automatically considered better.
  - The simulator must determine whether changing timing actually improves the outcome.

- **Refinement — Assumptions and uncertainty formalised**
  - Future You now distinguishes between:
    - Confirmed facts
    - User-provided estimates
    - System assumptions
    - Hypothetical values
    - Unknown information
  - Material assumptions should be disclosed to the user.
  - Uncertain values can eventually be tested across ranges rather than presented with false precision.

- **Refinement — Financial modelling moved from monthly totals to event-level cash flow**
  - Months became reporting periods rather than the fundamental unit of calculation.
  - Financial events are processed in chronological order.
  - This allows Future You to detect situations where:
    - A user finishes the month positive
    - But temporarily cannot cover a bill before payday

- **Refinement — Pension treatment clarified**
  - Sarah's current pension contribution is already reflected in her take-home pay.
  - Employer pension contributions are not spendable cash.
  - Increasing a pension contribution must create a new scenario with its effect on future take-home pay explicitly calculated.

- **Refinement — Conservative assumptions can avoid unnecessary questioning**
  - Future You should not force users through a long questionnaire every time they ask something.
  - If sufficient information already exists, the app can calculate immediately using clearly disclosed assumptions.
  - Users can then edit those assumptions if necessary.

- **Refinement — Golden-path conversation defined**
  - The canonical interaction became:
    - Sarah asks: **“Can I afford a £650 trip next month?”**
    - Future You uses existing context
    - Conservative assumptions fill non-blocking gaps
    - The baseline is calculated
    - The £650 scenario is calculated
    - The trade-off is shown
    - Alternatives are presented
    - Relevant opportunities may be surfaced
    - Sarah can continue exploring scenarios conversationally

- **Refinement — Home and Ask separated conceptually**
  - **Home**
    - Entry point into financial decisions
    - “What are you considering?”
    - Small previews of goals and relevant opportunities
  - **Ask**
    - Main working environment
    - Conversation
    - Simulation results
    - Before/after comparisons
    - Scenario exploration

- **Refinement — Goals screen role clarified**
  - Goals should continue to show Sarah's real current path.
  - When viewing a hypothetical scenario, goal changes must be clearly labelled as hypothetical.
  - A scenario forecast must never accidentally replace the real baseline forecast.

- **Refinement — Benefits screen role clarified**
  - Benefits display potential opportunities.
  - Incomplete opportunities can be surfaced without pretending their financial effect is known.
  - Sarah's season-ticket loan, for example, cannot produce a numerical result until eligibility and repayment details are available.

- **Refinement — Scenario identity must remain understandable**
  - Internally the system may use baseline and branch IDs.
  - The user should instead see simple labels such as:
    - **Your current path**
    - **£650 trip**
    - **£500 option**
    - **£400 option**
    - **Go in October**
    - **Trip + season-ticket loan**

- **Current stage — Product behaviour largely defined**
  - Completed:
    - Core product proposition
    - Sarah v1 canonical profile
    - Deterministic simulation specification
    - Affordability classification
    - Golden-path conversation specification
  - Current next step:
    - Map the golden path onto the supplied UI.
  - After that:
    - Define and freeze MVP scope.
  - Only then:
    - Design the technical architecture.
    - Begin implementation.

---

## Future refinements

<!-- Add future concept changes below this line using the same format. -->


- **Future refinement — Employer association moved out of signup**
  - What changed:
    - Authentication and workplace association were separated into different product stages.
  - Previous approach:
    - The signup prototype included a mandatory Company ID and implied that employer association happened during account creation.
  - New approach:
    - Signup collects account-access information only.
    - Employer name, employer code and any later verification belong to a separate, skippable workplace step after financial onboarding.
  - Why it changed:
    - Employer context supports opportunity discovery, but it is not required to create an account or run the core financial-decision simulation.
  - Effect on Future You:
    - Users can reach the core product without an employer dependency, while workplace opportunities remain available to users who add that context.

- **Future refinement — Prototype prompts separated from MVP commitments**
  - What changed:
    - Home prompt cards were divided into rule-backed MVP actions and future visual concepts.
  - Previous approach:
    - “How am I doing?”, “What should I prioritise?”, “Future You Wrapped” and other prototype labels risked becoming requirements merely because they appeared in the mockups.
  - New approach:
    - MVP prompt cards focus on one-off affordability, amount alternatives, timing alternatives and goal impact.
    - Undefined status, recommendation and retrospective-summary prompts remain post-MVP concepts.
  - Why it changed:
    - Every functional MVP prompt must lead to deterministic behaviour already covered by the simulation and conversation specifications.
  - Effect on Future You:
    - The Home experience preserves its visual variety without promising recommendation or summary logic that the product has not defined.

- **Future refinement — Visual and behavioural sources of truth separated**
  - What changed:
    - The role of the supplied prototype was narrowed and made explicit.
  - Previous approach:
    - Prototype screens risked influencing both presentation and product behaviour.
  - New approach:
    - The supplied mockups remain authoritative for palette, gradients, rounded cards, typography character, navigation, mobile composition and visual energy.
    - Behaviour comes from the simulation rules, golden-path conversation, frozen UI mapping and approved MVP scope.
  - Why it changed:
    - An old prototype control, value or prompt must not reintroduce discarded or undefined functionality.
  - Effect on Future You:
    - The product can preserve the intended identity closely while implementing only behaviours that are deterministic, explainable and deliberately in scope.

- **Future refinement — Golden-path UI frozen and MVP scope defined**
  - What changed:
    - The golden-path UI mapping was frozen and a version-one scope contract was created.
  - Previous approach:
    - The product behaviour and visual journey were defined, but implementation boundaries had not yet been separated into required, optional and deferred work.
  - New approach:
    - MVP supports manual or mock financial context, one current account, one fixed monthly net income, cash savings goals and single additional one-off current-account decisions.
    - It must calculate baseline and scenario cash flow, safety impact, required-payment coverage, borrowing, buffer recovery, goal dates, classification and amount/timing alternatives.
    - Benefits can be surfaced with honest eligibility and missing-information states, but numerical benefit uptake, save-first, pensions, recurring expenses, split payments and connected data are deferred.
  - Why it changed:
    - The core proposition can be proven without integrations or unsupported scenario types, and implementation should not be forced to make product-scope decisions.
  - Effect on Future You:
    - Version one remains a focused conversational decision simulator rather than expanding into budgeting, recommendation, benefits administration or financial-data aggregation.

- **Future refinement — Deterministic modular MVP architecture defined**
  - What changed:
    - The approved product contracts were translated into a technical architecture and a vertical implementation sequence.
  - Previous approach:
    - Simulator behaviour, conversation behaviour, UI states and MVP scope were defined, but responsibility boundaries, persistence, provider use and deployment shape were not yet fixed.
  - New approach:
    - Future You is implemented as one TypeScript modular monolith with a pure deterministic financial domain at its centre, a responsive Next.js interface/API, immutable versioned context and scenario records, and managed Supabase authentication/PostgreSQL persistence.
    - The LLM is isolated behind typed server-side actions and may interpret or explain; all financial numbers, dates, classifications and alternatives come from the simulator and deterministic presentation data.
    - Scenario viewing never changes confirmed context, numeric benefit simulation and scenario commitment remain disabled in MVP, and successful runs retain their inputs, assumptions, ancestry, rules version and hashes.
  - Why it changed:
    - Implementation needs the smallest credible structure that preserves reproducibility, scenario isolation, testability and the frozen Sarah v1 outcomes without adding enterprise infrastructure or post-MVP behaviour.
  - Effect on Future You:
    - The golden path can be built early as a verified vertical slice, while AI, UI and persistence remain unable to invent calculations or silently turn an opportunity or what-if into Sarah's current financial reality.
