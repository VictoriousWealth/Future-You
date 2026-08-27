import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { buildFinancialContextSummary } from "../src/application/profile/financial-context-summary";
import { SARAH_V1_CONTEXT } from "../src/fixtures/sarah-v1";
import { FinancialContextSummarySurface } from "../src/ui/features/profile/financial-context-summary-surface";
import { ProfileSurface } from "../src/ui/features/profile/profile-surface";

const SARAH_WORKPLACE = {
  name: "OniBank",
  associationSource: "employer_provisioned",
  verificationStatus: "verified"
} as const;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() })
}));

describe("financial-context summary", () => {
  it("maps every user-facing part of Sarah's frozen context without changing its meaning", () => {
    const summary = buildFinancialContextSummary(SARAH_V1_CONTEXT, SARAH_WORKPLACE);

    expect(summary.asOfDate).toBe("1 September 2026");
    expect(summary.planningFrom).toBe("September 2026");
    expect(summary.region).toBe("England and Wales");
    expect(summary.workplace).toEqual({ name: "OniBank", status: "Verified workplace" });
    expect(summary.moneyToday).toEqual({
      currentAccountBalance: { display: "£2,750", status: "Confirmed" },
      currentCycleReserve: { display: "£1,850", status: "Confirmed" },
      availableSafetyBuffer: { display: "£900", status: "Confirmed" },
      preferredSafetyBuffer: { display: "£900", status: "Confirmed" },
      overdraftLimit: "£500"
    });
    expect(summary.income.monthlyTakeHome.display).toBe("£2,450");
    expect(summary.income.payday).toBe("Last working day of each month");
    expect(summary.income.pension).toEqual({
      employeeContribution: "3%",
      employerContribution: "3%"
    });
    expect(summary.income.studentLoanDeductedFromTakeHome).toBe(true);
    expect(summary.monthlySpending.total.display).toBe("£1,850");
    expect(summary.monthlySpending.items).toHaveLength(9);
    expect(summary.requiredPayments.declarationConfirmed).toBe(true);
    expect(summary.requiredPayments.items).toHaveLength(5);
    expect(summary.goals.monthlyBudget.display).toBe("£600");
    expect(summary.goals.items).toHaveLength(3);
    expect(summary.goals.allocationOrder).toEqual(["House deposit", "Holiday", "Emergency fund"]);
    expect(summary.goals.overflowGoal).toBe("House deposit");
    expect(summary.goals.committedTransfers).toHaveLength(3);
    expect(summary.confirmedOneOffs).toEqual([]);
  });

  it("renders the trusted summary as a readable page without internal context identifiers", () => {
    const summary = buildFinancialContextSummary(SARAH_V1_CONTEXT, SARAH_WORKPLACE);
    const markup = renderToStaticMarkup(createElement(FinancialContextSummarySurface, {
      displayName: "Sarah Wonk",
      personalEmail: "sarah@example.test",
      summary
    }));

    expect(markup).toContain("What Future You knows about you");
    expect(markup).toContain("Current-account balance");
    expect(markup).toContain("Reserved for this spending cycle");
    expect(markup).toContain("Available safety buffer");
    expect(markup).toContain("Already deducted from take-home pay");
    expect(markup).toContain("Bills Future You protects");
    expect(markup).toContain("Transfers already planned");
    expect(markup).toContain("You have not added any confirmed one-off costs.");
    expect(markup).toContain('href="/settings/financial-context"');
    expect(markup).not.toContain(SARAH_V1_CONTEXT.id);
    expect(markup).not.toContain(SARAH_V1_CONTEXT.version);
    expect(markup).not.toContain(SARAH_V1_CONTEXT.schemaVersion);
  });

  it("makes the read-only summary directly discoverable from Profile", () => {
    const markup = renderToStaticMarkup(createElement(ProfileSurface, {
      displayName: "Sarah Wonk",
      personalEmail: "sarah@example.test",
      configuration: {
        url: "http://127.0.0.1:54321",
        publishableKey: "test-key"
      }
    }));

    expect(markup).toContain('href="/profile/financial-context"');
    expect(markup).toContain("Everything Future You knows about your money");
    expect(markup).toContain('href="/profile/settings"');
  });
});
