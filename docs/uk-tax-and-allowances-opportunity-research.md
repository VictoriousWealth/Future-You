# UK tax and allowances opportunity research

**Research date:** 27 August 2026  
**Rules period:** 2026/27 UK tax year unless stated otherwise  
**Canonical application:** Sarah Wonk v1  
**Status:** Implemented as a non-simulator, versioned demonstration profile

## 1. Product conclusion

Future You cannot safely match tax and allowance opportunities from a salary, goal label or employer
name alone. It needs a separate, versioned **tax-opportunity profile** containing the minimum facts
required by each rule.

This profile is not Sarah's financial context. It cannot change cash, spending, safety buffer, goal
contributions, goal dates or scenario results. It supports only server-owned presentation states:

- **Current treatment** — evidence says the treatment is already active or reflected in confirmed net
  figures.
- **Potential fit** — the recorded facts match the main rule, but an application, provider decision or
  future-event condition remains.
- **More information needed** — the rule may be relevant but a material fact is unknown.
- **Not applicable / no evidence** — normally suppressed rather than shown as a recommendation.

Every surfaced item carries the official source, access date, tax year, profile version and the profile
evidence references used to match it. A statutory maximum or allowance is not a personalised saving.

## 2. 2026/27 opportunity catalogue

| Area | Current official rule | Minimum matching facts | Sarah result |
|---|---|---|---|
| Personal Allowance | Standard allowance is £12,570. For England, Wales and Northern Ireland the basic-rate range is £12,571–£50,270. The allowance tapers above £100,000 adjusted net income. | Tax year, Income Tax nation, tax code, employments, taxable income and adjustments | **Current treatment.** Synthetic payslip records `1257L`, one employment and an England basic-rate position. Already reflected in take-home; no new cash value. |
| Pension tax relief | Net pay takes employee contributions before Income Tax. Relief at source takes them after tax and the provider adds basic-rate relief; extra higher/additional-rate relief can require a claim. | Scheme relief method, contribution evidence, tax band, whether relief was already claimed | **Current treatment.** OniBank scheme method is explicitly `NET_PAY`; Sarah's confirmed take-home already includes her 3% contribution. |
| Lifetime ISA | A UK-resident person can open one from 18 and before 40, contribute up to £4,000 yearly and receive a 25% bonus. A qualifying first-home withdrawal also requires conditions including first ownership, mortgage purchase, UK property at £450,000 or less and at least 12 months since the first payment. | Date of birth, UK residence, ownership history, LISA status/opening date, intended price, mortgage, main-residence and country intent | **Potential fit.** Sarah is 25, UK-resident, has never owned residential property, has no LISA recorded, and intends a £250,000 mortgaged UK main residence. No contribution, bonus or goal effect is calculated. |
| Personal Savings Allowance | Basic-rate taxpayers can usually receive up to £1,000 savings interest tax-free; higher-rate taxpayers £500; additional-rate taxpayers £0. ISA interest is outside this allowance. | Tax band, taxable interest outside ISAs, joint-account split, ISA status | **More information needed.** Basic-rate position is recorded, but annual taxable interest and current ISA subscriptions are unknown. |
| ISA allowance | Up to £20,000 can be subscribed across ISAs in 2026/27, including at most £4,000 to a Lifetime ISA. | UK residence, age, ISA types, current-year subscriptions and withdrawals/flexibility | Used as a rule boundary for the LISA item; Sarah's remaining allowance is not calculated because subscription data is unknown. |
| Council Tax single-person discount | A full bill assumes at least two counted adults; living alone or only with disregarded adults normally gives 25% off after applying. | Local authority, liable person, counted/disregarded adults, current discount status and bill evidence | **Potential fit.** Sarah records one counted adult in Manchester, but her bill does not confirm whether the discount is already applied. Her frozen £90 monthly bill is unchanged. |
| Marriage Allowance | A spouse or civil partner below the Personal Allowance can transfer £1,260 to a basic-rate spouse/civil partner, reducing tax by up to £252. Cohabitation alone does not qualify. | Legal relationship, both partners' taxable income/bands and existing claim | Suppressed: Sarah's confirmed status is single. |
| Help to Save | A UK resident receiving Universal Credit can open an account if the claimant or joint claimant had at least £1 take-home pay in the last monthly assessment period. | Universal Credit award and assessment-period earnings, residence, existing account | Suppressed: Sarah records that she is not receiving Universal Credit. |
| Employee expenses | Relief may apply to necessary job-only costs paid personally and not reimbursed, including approved professional subscriptions, qualifying travel/mileage, uniforms, tools and equipment. | Expense type/date/amount, employment necessity, personal payment, employer reimbursement and receipts | Suppressed: Sarah has no expense evidence recorded. Future You must ask for evidence rather than infer expenses from her role. |
| Working from home | Employees cannot claim current-year working-from-home tax relief from 6 April 2026, although eligible claims for the previous four years may remain possible under the historic rules. | Prior-year required home-working dates, employer facilities/reimbursement and expense evidence | No current opportunity. Future You must not show the old £6-a-week rule as a 2026/27 benefit. |
| Trading allowance | Up to £1,000 gross qualifying trading income may be covered, with exclusions and a choice between the allowance and actual expenses when income is higher. | Gross side-income sources, connected-party/employer exclusions, expenses and Self Assessment status | Suppressed: Sarah declares no trading income. |
| Property allowance | Up to £1,000 gross qualifying property income may be covered, subject to exclusions; it cannot be combined with Rent a Room for the same receipts. | Property receipts, ownership/share, connected-party exclusions, expenses/finance costs and chosen treatment | Suppressed: Sarah declares no property income. |
| Rent a Room | Up to £7,500 of receipts from furnished accommodation in a main home can be tax-free, halved when receipts are shared. | Main-home status, furnished letting, receipts and sharing | Suppressed: no letting income is recorded. |
| Tax-Free Childcare and Child Benefit checks | Childcare support depends on child age/circumstances, work, each partner's income and incompatible benefits. The High Income Child Benefit Charge starts above £60,000 adjusted net income for 2026/27. | Dependants, partner, childcare, work/income, immigration/public-funds status, benefit claims and adjusted net income | Suppressed: Sarah records no dependent children. |
| Dividend allowance and Capital Gains annual exempt amount | Dividend allowance is £500 for 2026/27. The individual Capital Gains annual exempt amount is £3,000, with detailed asset, loss and residence rules. | Holdings, wrappers, dividends, disposals, gains/losses and residence | Suppressed: Sarah declares no dividend income or taxable gains. These should never be inferred from a savings goal. |
| Blind Person's Allowance | England/Wales eligibility depends on registration as blind/severely sight impaired and the required evidence; the 2026/27 allowance is £3,250. | Sensitive health/registration evidence and tax position | Not collected for Sarah. This must be a user-initiated, consented check rather than a default onboarding question. |

Student-loan repayment is not a tax relief, but it is required payroll context. Sarah now records Plan 2
and confirms that deductions are already included in take-home. The Plan 2 repayment threshold from
April 2026 is £29,385; this does not alter the frozen £2,450 net-income fact.

## 3. Canonical Sarah tax-opportunity profile

Sarah's synthetic profile is `sarah-tax-opportunity-profile@2026-09-01`, effective for 2026/27.

| Group | Canonical facts |
|---|---|
| Residence | UK tax resident; England Income Tax nation; Manchester local authority |
| Identity/household | Date of birth 14 May 2001; single; no dependent children; one counted Council Tax adult; discount status not confirmed |
| PAYE | One employment; £38,500 gross employment income; `1257L`; reviewed basic-rate position; no other taxable income declared; not registered for Self Assessment |
| Pension | OniBank workplace pension uses net pay; 3% employee and 3% employer rates remain in the immutable financial context |
| Student finance | Plan 2; deduction already included in confirmed take-home |
| First home | Never owned residential property; no LISA recorded; intended £250,000 mortgaged UK main residence |
| Savings | Taxable interest outside ISAs unknown; current-year ISA subscriptions unknown |
| Other income/relief evidence | Not receiving Universal Credit; no trading, property, dividend or taxable-gains income declared; no employee-expense evidence recorded |

These are controlled fictional demonstration facts, not deductions from Sarah's name, employer, salary,
goal labels or bank data. Real users need explicit collection, consent and provenance.

## 4. Data-minimisation and safety rules

- Ask only for a fact when it unlocks a defined rule. Do not build a general-purpose tax dossier.
- Treat tax residence and Income Tax nation separately from town or postal address.
- Never infer marriage, children, disability, home ownership, Universal Credit, income sources or
  eligibility from demographic or employer data.
- Sensitive disability evidence is user-initiated and optional.
- Keep exact DOB and gross income server-side; the Benefits DTO receives only the matched explanation.
- Do not return raw profile rows, authentication identity, employer Company ID or database IDs.
- An `unknown` answer is a valid state. It produces a deterministic request for more information, not
  a guessed entitlement.
- Rule records require tax-year/effective-date versioning because rates and eligibility change.
- Official allowance figures may be shown as reference limits, but Future You must label a personalised
  financial effect as uncalculated until a separately approved deterministic calculation exists.
- Tax and allowance matches do not mutate confirmed financial context. A verified cash-flow change would
  require the normal explicit context-revision path.

## 5. Official sources

- [Income Tax rates and Personal Allowances](https://www.gov.uk/income-tax-rates)
- [P9X tax codes from 6 April 2026](https://www.gov.uk/government/publications/p9x-tax-codes/p9x-tax-codes-to-use-from-6-april-2026)
- [What tax-code letters and numbers mean](https://www.gov.uk/tax-codes/what-your-tax-code-means)
- [Workplace pensions: managing your pension](https://www.gov.uk/workplace-pensions/managing-your-pension)
- [Claim tax relief on private pension payments](https://www.gov.uk/guidance/claim-tax-relief-on-your-private-pension-payments)
- [Lifetime ISA overview](https://www.gov.uk/lifetime-isa)
- [Lifetime ISA first-home withdrawals](https://www.gov.uk/lifetime-isa/withdrawing-money-from-your-lifetime-isa)
- [Individual Savings Accounts](https://www.gov.uk/individual-savings-accounts)
- [Tax on savings interest](https://www.gov.uk/apply-tax-free-interest-on-savings)
- [Council Tax discounts guide](https://www.gov.uk/government/publications/paying-the-right-level-of-council-tax-a-plain-english-guide-to-council-tax/paying-the-right-level-of-council-tax-a-plain-english-guide-to-council-tax)
- [Marriage Allowance](https://www.gov.uk/marriage-allowance)
- [Help to Save eligibility](https://www.gov.uk/get-help-savings-low-income/eligibility)
- [Employee expense tax relief](https://www.gov.uk/tax-relief-for-employees)
- [Working-from-home relief](https://www.gov.uk/tax-relief-for-employees/working-at-home)
- [Trading and property allowances](https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income)
- [Rent a Room Scheme](https://www.gov.uk/rent-room-in-your-home/the-rent-a-room-scheme)
- [Tax-Free Childcare eligibility](https://www.gov.uk/tax-free-childcare/check-if-youre-eligible)
- [High Income Child Benefit Charge](https://www.gov.uk/child-benefit-tax-charge/overview)
- [Income Tax rates and allowances, including dividends](https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past)
- [Capital Gains Tax rates and allowances](https://www.gov.uk/guidance/capital-gains-tax-rates-and-allowances)
- [Blind Person's Allowance eligibility](https://www.gov.uk/blind-persons-allowance/eligibility)
- [Plan 2 threshold from April 2026](https://www.gov.uk/government/news/student-loans-interest-and-repayment-threshold-announcement-for-plan-2-and-plan-3-loans)

## 6. Known limitation

This slice provides a researched, realistic Sarah demonstration and a safe matching boundary. It is not
a tax calculator, filing service or entitlement checker. General-user collection, persistence, rule
updates, jurisdiction expansion, deterministic tax calculations and regulated/legal review remain
separate future work.
