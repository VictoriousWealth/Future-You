import { describe, expect, it } from "vitest";
import {
  INTERPRETATION_PROMPT_VERSION_V1,
  INTERPRETATION_SCHEMA_VERSION_V1
} from "../src/application/conversation/contracts";
import { conversationEvaluationCorpus } from "./fixtures/conversation-evaluation-corpus";

const FROZEN_C0_CASE_IDS = [
  "canonical-trip-650", "natural-quid", "natural-laptop-october", "natural-okay",
  "noisy-afford", "noisy-amount-follow-up", "noisy-month-follow-up", "missing-amount",
  "missing-month", "ambiguous-month", "missing-active-scenario", "resolve-amount-clarification",
  "resolve-month-clarification", "amount-follow-up", "timing-follow-up", "goal-delay-explanation",
  "current-path-selection", "unsupported-instalments", "unsupported-pension", "unsupported-save-first",
  "unsupported-benefit", "unsupported-recurring", "unsupported-investment",
  "unsupported-recommendation", "unsupported-commitment", "injection-ignore", "injection-result",
  "injection-cross-user", "injection-overdraft", "injection-prompt", "injection-context",
  "injection-benefit", "injection-tools"
] as const;

describe("frozen Track C0 v1 comparison corpus", () => {
  it("retains every original case and its v1 contract identity", () => {
    expect(INTERPRETATION_PROMPT_VERSION_V1).toBe("fy-conversation-interpretation/1.0.0");
    expect(INTERPRETATION_SCHEMA_VERSION_V1).toBe("fy-conversation-intent/1.0.0");
    expect(conversationEvaluationCorpus.map((evaluation) => evaluation.id)).toEqual(FROZEN_C0_CASE_IDS);
    expect(conversationEvaluationCorpus).toHaveLength(33);
  });

  for (const evaluation of conversationEvaluationCorpus) {
    it(`preserves C0 expectation: ${evaluation.id}`, () => {
      expect(evaluation.providerCallRequired).toBe(true);
      expect(typeof evaluation.simulatorCallAllowed).toBe("boolean");
      expect(evaluation.message.length).toBeGreaterThan(0);
      expect(evaluation.expectedIntent.length).toBeGreaterThan(0);
    });
  }
});
