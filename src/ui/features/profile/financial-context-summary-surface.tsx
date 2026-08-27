import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import type {
  FinancialContextSummary,
  SummaryMoneyValue
} from "../../../application/profile/financial-context-summary";
import { ProductShell } from "../../product-shell/product-shell";

function MoneyValue({ value }: Readonly<{ value: SummaryMoneyValue }>) {
  return (
    <span className="fy-context-summary-value">
      <strong>{value.display}</strong>
      <small>{value.status}</small>
    </span>
  );
}

function SummarySection({
  id,
  title,
  description,
  children
}: Readonly<{
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="fy-context-summary-section" aria-labelledby={id}>
      <header>
        <h2 id={id}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function FinancialContextSummarySurface({
  displayName,
  personalEmail,
  summary
}: Readonly<{
  displayName: string;
  personalEmail: string | null;
  summary: FinancialContextSummary;
}>) {
  return (
    <ProductShell active={null} className="fy-profile-shell fy-context-summary-shell" testId="financial-context-summary">
      <header className="fy-account-heading has-back-link">
        <Link href="/profile">‹ Profile</Link>
        <h1>Financial context</h1>
      </header>

      <section className="fy-context-summary-intro" aria-labelledby="financial-picture-title">
        <p className="fy-context-summary-eyebrow">Your financial picture</p>
        <h2 id="financial-picture-title">What Future You knows about you</h2>
        <p>These are the facts Future You uses when it models how a money decision could affect your plans.</p>
        <span>Information confirmed as of {summary.asOfDate}</span>
      </section>

      <SummarySection id="context-about-title" title="About you">
        <dl className="fy-context-summary-list">
          <div><dt>Name</dt><dd>{displayName}</dd></div>
          <div><dt>Personal email</dt><dd>{personalEmail ?? "Not supplied"}</dd></div>
          <div>
            <dt>Workplace</dt>
            <dd>
              {summary.workplace?.name ?? "Not added"}
              {summary.workplace ? <small>{summary.workplace.status}</small> : null}
            </dd>
          </div>
          <div><dt>Planning region</dt><dd>{summary.region}</dd></div>
          <div><dt>Plan starts</dt><dd>{summary.planningFrom}</dd></div>
        </dl>
      </SummarySection>

      <SummarySection
        id="context-money-title"
        title="Money today"
        description="Your bank balance and your safety cushion are kept separate."
      >
        <dl className="fy-context-summary-list">
          <div><dt>Current-account balance</dt><dd><MoneyValue value={summary.moneyToday.currentAccountBalance}/></dd></div>
          <div><dt>Reserved for this spending cycle</dt><dd><MoneyValue value={summary.moneyToday.currentCycleReserve}/></dd></div>
          <div className="is-emphasised"><dt>Available safety buffer</dt><dd><MoneyValue value={summary.moneyToday.availableSafetyBuffer}/></dd></div>
          <div><dt>Preferred safety buffer</dt><dd><MoneyValue value={summary.moneyToday.preferredSafetyBuffer}/></dd></div>
          <div>
            <dt>Overdraft limit</dt>
            <dd>{summary.moneyToday.overdraftLimit}<small>Not counted as available money</small></dd>
          </div>
        </dl>
      </SummarySection>

      <SummarySection id="context-income-title" title="Income and deductions">
        <dl className="fy-context-summary-list">
          <div><dt>Monthly take-home pay</dt><dd><MoneyValue value={summary.income.monthlyTakeHome}/></dd></div>
          <div><dt>Payday</dt><dd>{summary.income.payday}</dd></div>
          {summary.income.pension ? (
            <>
              <div><dt>Your pension contribution</dt><dd>{summary.income.pension.employeeContribution}<small>Already reflected in take-home pay</small></dd></div>
              <div><dt>Employer pension contribution</dt><dd>{summary.income.pension.employerContribution}<small>Retirement value, not spendable cash</small></dd></div>
            </>
          ) : <div><dt>Pension</dt><dd>Not supplied</dd></div>}
          <div>
            <dt>Student loan</dt>
            <dd>
              {summary.income.studentLoanDeductedFromTakeHome === null
                ? "Not supplied"
                : summary.income.studentLoanDeductedFromTakeHome
                  ? "Already deducted from take-home pay"
                  : "Not deducted from take-home pay"}
            </dd>
          </div>
        </dl>
      </SummarySection>

      <SummarySection
        id="context-spending-title"
        title="Regular monthly spending"
        description={`Future You currently plans for ${summary.monthlySpending.total.display} each month.`}
      >
        <ul className="fy-context-summary-amount-list">
          {summary.monthlySpending.items.map((item) => (
            <li key={item.label}>
              <span>{item.label}{item.protectedPayment ? <small>Protected payment</small> : null}</span>
              <strong>{item.amount}</strong>
            </li>
          ))}
        </ul>
        <div className="fy-context-summary-total">
          <span>Monthly total<small>{summary.monthlySpending.total.status}</small></span>
          <strong>{summary.monthlySpending.total.display}</strong>
        </div>
      </SummarySection>

      <SummarySection
        id="context-bills-title"
        title="Bills Future You protects"
        description={summary.requiredPayments.declarationConfirmed
          ? "You confirmed that these payments must stay covered in a simulation."
          : "Your required-payment information has not been fully confirmed."}
      >
        {summary.requiredPayments.items.length ? (
          <ul className="fy-context-summary-amount-list">
            {summary.requiredPayments.items.map((item) => (
              <li key={`${item.label}-${item.due}`}>
                <span>
                  {item.label}
                  <small>{item.due}{item.includedInMonthlySpending ? " · Included above" : " · Added separately"}</small>
                </span>
                <strong>{item.amount.display}</strong>
              </li>
            ))}
          </ul>
        ) : <p className="fy-context-summary-empty">No required monthly payments have been added.</p>}
      </SummarySection>

      <SummarySection
        id="context-goals-title"
        title="Goals"
        description={`${summary.goals.monthlyBudget.display} is available for your normal goal contributions each month.`}
      >
        {summary.goals.items.length ? (
          <div className="fy-context-goal-list">
            {summary.goals.items.map((goal) => (
              <article key={goal.label}>
                <header><h3>{goal.label}</h3><span className={goal.status === "Active" ? "is-active" : ""}>{goal.status}</span></header>
                <dl>
                  <div><dt>Saved</dt><dd>{goal.currentBalance.display}</dd></div>
                  <div><dt>Target</dt><dd>{goal.targetBalance.display}</dd></div>
                  <div><dt>Each month</dt><dd>{goal.monthlyContribution}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : <p className="fy-context-summary-empty">No goals have been added yet.</p>}

        {summary.goals.allocationOrder.length ? (
          <div className="fy-context-allocation">
            <h3>How monthly contributions are allocated</h3>
            <ol>{summary.goals.allocationOrder.map((goal) => <li key={goal}>{goal}</li>)}</ol>
            {summary.goals.overflowGoal ? <p>Any amount left after those contributions goes to {summary.goals.overflowGoal}.</p> : null}
          </div>
        ) : null}

        {summary.goals.committedTransfers.length ? (
          <div className="fy-context-committed">
            <h3>Transfers already planned</h3>
            <ul>
              {summary.goals.committedTransfers.map((transfer, index) => (
                <li key={`${transfer.goal}-${transfer.month}-${index}`}>
                  <span>{transfer.goal}<small>{transfer.month} · {transfer.status}</small></span>
                  <strong>{transfer.amount}</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SummarySection>

      <SummarySection id="context-one-offs-title" title="Confirmed one-off costs">
        {summary.confirmedOneOffs.length ? (
          <ul className="fy-context-summary-amount-list">
            {summary.confirmedOneOffs.map((event) => (
              <li key={`${event.label}-${event.timing}`}>
                <span>{event.label}<small>{event.timing}</small></span>
                <strong>{event.amount.display}</strong>
              </li>
            ))}
          </ul>
        ) : <p className="fy-context-summary-empty">You have not added any confirmed one-off costs.</p>}
      </SummarySection>

      <Link className="fy-context-summary-edit" href="/settings/financial-context">
        <span><strong>Update financial context</strong><small>Change any information shown on this page</small></span>
        <FiChevronRight aria-hidden="true"/>
      </Link>
      <p className="fy-context-summary-history-note">Saved conversations keep the financial context they were created with.</p>
    </ProductShell>
  );
}
