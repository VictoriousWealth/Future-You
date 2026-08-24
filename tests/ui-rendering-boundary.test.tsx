import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ScenarioOptionDTO } from "../src/application/dto/contracts";
import { ListScenarioOptionsUseCase } from "../src/application/use-cases/list-scenario-options";
import { SARAH_V1_BROWSER_PROOF_COMMAND } from "../src/server/sarah-v1-demo-command";
import { ResultView } from "../src/ui/features/ask/result-view";
import { slice2TestDependencies } from "./helpers/slice-2";

describe("browser presentation boundary", () => {
  let option: ScenarioOptionDTO;

  beforeAll(async () => {
    const result = await new ListScenarioOptionsUseCase(slice2TestDependencies()).execute({
      requestId: "req_ui_options",
      source: SARAH_V1_BROWSER_PROOF_COMMAND,
      timingAlternativePeriod: "2026-10"
    });
    if (!result.ok) throw new Error(result.error.message);
    const source = result.value.options.find((candidate) => candidate.label === "£650 trip");
    if (!source) throw new Error("£650 option missing");
    option = source;
  });

  it("renders the server-produced golden presentation fields", () => {
    const markup = renderToStaticMarkup(createElement(ResultView, { option }));
    expect(markup).toContain("Affordable · Significant trade-off");
    expect(markup).toContain("£900");
    expect(markup).toContain("£250");
    expect(markup).toContain("Restored in November 2026");
    expect(markup).toContain("February 2027");
    expect(markup).toContain("Medium confidence");
  });

  it("renders deliberately impossible presentation tokens instead of deriving raw money or dates", () => {
    const sentinel: ScenarioOptionDTO = {
      ...option,
      presentation: {
        ...option.presentation,
        classificationLabel: "Noticeable trade-off — SERVER SENTINEL",
        immediateImpact: {
          ...option.presentation.immediateImpact,
          cashBefore: "£901 SERVER",
          cashAfter: "£237 SERVER",
          safetyBufferBefore: "£901 SERVER",
          safetyBufferAfter: "£237 SERVER",
          recovery: "January 2031 SERVER"
        },
        goalImpacts: option.presentation.goalImpacts.map((goal, index) => ({
          ...goal,
          scenarioCompletion: index === 0 ? "March 2032 SERVER" : goal.scenarioCompletion
        }))
      }
    };
    const markup = renderToStaticMarkup(createElement(ResultView, { option: sentinel }));
    expect(markup).toContain("Noticeable trade-off — SERVER SENTINEL");
    expect(markup).toContain("£237 SERVER");
    expect(markup).toContain("January 2031 SERVER");
    expect(markup).toContain("March 2032 SERVER");
    expect(markup).not.toContain("£250</strong>");
  });
});
