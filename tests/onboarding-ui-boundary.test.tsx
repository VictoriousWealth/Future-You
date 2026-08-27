import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreviewFinancialContextUseCase } from "../src/application/onboarding/preview-financial-context";
import { SLICE_1_RULES } from "../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../src/fixtures/calendar/england-wales-bank-holidays";
import { SARAH_V1_ONBOARDING_DRAFT } from "../src/fixtures/sarah-v1-onboarding";
import { FinancialContextPreviewView } from "../src/ui/features/onboarding/financial-context-preview-view";

describe("onboarding browser authority boundary", () => {
  it("renders deliberately unusual server-derived preview values verbatim", () => {
    const result = new PreviewFinancialContextUseCase({
      rules: SLICE_1_RULES,
      calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
      calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
    }).execute({
      draft: SARAH_V1_ONBOARDING_DRAFT,
      mode: "initial",
      expectedCurrentContextVersionId: null
    });
    if (!result.ok) throw new Error(result.error.code);
    const sentinel = {
      ...result.value,
      contextSummary: {
        ...result.value.contextSummary,
        currentSafetyBuffer: {
          currency: "GBP" as const,
          minorUnits: "123456789",
          display: "£SERVER-BUFFER"
        },
        monthlyContributionCapacity: {
          currency: "GBP" as const,
          minorUnits: "999999",
          display: "£SERVER-CAPACITY"
        }
      },
      goals: result.value.goals.map((goal, index) =>
        index === 0
          ? { ...goal, completion: { status: "COMPLETED" as const, month: "2099-12 SERVER" } }
          : goal
      )
    };
    const markup = renderToStaticMarkup(
      createElement(FinancialContextPreviewView, { preview: sentinel })
    );
    expect(markup).toContain("£SERVER-BUFFER");
    expect(markup).toContain("Current safety buffer</span><strong>£SERVER-BUFFER</strong>");
    expect(markup).toContain("£SERVER-CAPACITY");
    expect(markup).toContain("2099-12 SERVER");
  });

  it("uses plain financial-settings language for revision review", () => {
    const result = new PreviewFinancialContextUseCase({
      rules: SLICE_1_RULES,
      calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
      calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
    }).execute({
      draft: SARAH_V1_ONBOARDING_DRAFT,
      mode: "revision",
      expectedCurrentContextVersionId: "sarah-v1@2026-09-01"
    });
    if (!result.ok) throw new Error(result.error.code);

    const markup = renderToStaticMarkup(
      createElement(FinancialContextPreviewView, { preview: result.value, mode: "revision" })
    );
    expect(markup).toContain("Check the updated information");
    expect(markup).toContain("Calculation details");
    expect(markup).toContain("Long-term date estimate");
    expect(markup).not.toContain("Existing pressure spotted");
    expect(markup).not.toContain("Here’s where these numbers take you");
    expect(markup).not.toContain(result.value.versions.rulesVersion);
    expect(markup).not.toContain(result.value.versions.calendarVersion);
  });
});
