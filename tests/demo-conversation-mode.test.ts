import { describe, expect, it, vi } from "vitest";
import { resolveAskConversationMode } from "../src/infrastructure/ai/provider-configuration";
import { conversationTestApplication } from "./helpers/conversation";

async function newDemoConversation(mode: "normal" | "explanation_failure" = "normal") {
  const test = conversationTestApplication(mode, { demo: true });
  const detail = await test.application.create({ requestId: `create_demo_${mode}` });
  return { ...test, id: detail.conversation.id };
}

describe("temporary trusted-data Ask demo mode", () => {
  it("is server-controlled, defaults to strict and rejects unknown configuration", () => {
    expect(resolveAskConversationMode({})).toBe("strict");
    expect(resolveAskConversationMode({ FUTURE_YOU_ASK_MODE: "strict" })).toBe("strict");
    expect(resolveAskConversationMode({ FUTURE_YOU_ASK_MODE: "trusted_demo" })).toBe("trusted_demo");
    expect(() => resolveAskConversationMode({ FUTURE_YOU_ASK_MODE: "browser_choice" })).toThrow(
      "FUTURE_YOU_ASK_MODE must be strict or trusted_demo."
    );
  });

  it("keeps strict conversations on the preserved Track C orchestration", async () => {
    const strict = conversationTestApplication();
    const detail = await strict.application.create({ requestId: "strict_mode_stays_strict" });
    await strict.application.send(detail.conversation.id, {
      requestId: "strict_mode_turn",
      message: "Can I afford a £650 trip next month?"
    });
    expect(strict.repository.conversations.get(detail.conversation.id)?.orchestrationVersion)
      .toBe("fy-conversation-orchestration/1.0.0");
    expect(strict.provider.observedInterpretationRequests).toHaveLength(1);
    expect(strict.provider.observedDemoInterpretationRequests).toHaveLength(0);
  });

  it("runs the seven priority flows as one persistent conversation using trusted authority", async () => {
    const { application, repository, provider, simulator, id } = await newDemoConversation();
    expect(repository.conversations.get(id)?.orchestrationVersion)
      .toBe("fy-conversation-orchestration/trusted-demo-1.0.0");

    const first = await application.send(id, {
      requestId: "demo_flow_1",
      message: "Can I afford a £650 trip next month?"
    });
    expect(first.intent).toBe("CREATE_ONE_OFF_PURCHASE");
    expect(first.conversation.selectedResult?.presentation.immediateImpact).toMatchObject({
      safetyBufferBefore: "£900",
      safetyBufferAfter: "£250",
      requiredPayments: "Bills covered",
      borrowing: "£0 overdraft",
      recovery: "Restored in November 2026"
    });
    expect(first.conversation.selectedResult?.result.comparison.classification.code)
      .toBe("AFFORDABLE_SIGNIFICANT_TRADE_OFF");
    expect(first.conversation.messages.at(-1)).toMatchObject({
      kind: "ASSISTANT_RESULT",
      templateId: "DEMO_NATURAL_RESPONSE",
      explanationFallbackUsed: false
    });

    const fiveHundred = await application.send(id, {
      requestId: "demo_flow_2",
      message: "What about £500?"
    });
    expect(fiveHundred.intent).toBe("CHANGE_PURCHASE_AMOUNT");
    expect(fiveHundred.conversation.selectedResult?.scenario.change.amount.minorUnits).toBe("50000");
    expect(fiveHundred.conversation.selectedResult?.presentation.immediateImpact.safetyBufferAfter).toBe("£400");

    const fourHundred = await application.send(id, {
      requestId: "demo_flow_3",
      message: "What about £400?"
    });
    expect(fourHundred.intent).toBe("CHANGE_PURCHASE_AMOUNT");
    expect(fourHundred.conversation.selectedResult?.scenario.change.amount.minorUnits).toBe("40000");
    expect(fourHundred.conversation.selectedResult?.presentation.immediateImpact.safetyBufferAfter).toBe("£500");

    const october = await application.send(id, {
      requestId: "demo_flow_4",
      message: "What if I wait until October?"
    });
    expect(october.intent).toBe("CHANGE_PURCHASE_MONTH");
    expect(october.conversation.selectedResult?.scenario.change).toMatchObject({
      amount: { minorUnits: "65000" },
      paymentPeriod: "2026-10"
    });
    expect(october.conversation.selectedResult?.presentation.goalImpacts[0]?.scenarioCompletion)
      .toBe("February 2027");

    const scenarioSimulation = vi.spyOn(simulator.simulateOneOffPurchase, "execute");
    const amountSimulation = vi.spyOn(simulator.generateAmountAlternatives, "execute");
    const timingSimulation = vi.spyOn(simulator.simulateMonthlyTimingAlternative, "execute");
    const explanation = await application.send(id, {
      requestId: "demo_flow_5",
      message: "Why does it delay my emergency fund?"
    });
    expect(explanation.intent).toBe("EXPLAIN_SELECTED_RESULT");
    expect(explanation.conversation.messages.at(-1)).toMatchObject({
      kind: "ASSISTANT_EXPLANATION",
      runId: october.conversation.selectedResult?.calculation.runId,
      templateId: "DEMO_NATURAL_RESPONSE"
    });
    expect(explanation.conversation.messages.at(-1)?.text).toContain(
      "Emergency fund moves from December 2026 to February 2027"
    );

    const goals = await application.send(id, {
      requestId: "demo_flow_6",
      message: "What are my goals?"
    });
    expect(goals.intent).toBe("RETRIEVE_GOALS");
    expect(goals.conversation.messages.at(-1)?.text).toContain("Emergency fund: £3,300 saved toward £4,500");
    expect(goals.conversation.messages.at(-1)?.text).toContain("House deposit: £7,200 saved toward £25,000");
    expect(goals.conversation.messages.at(-1)?.text).toContain("Holiday: £350 saved toward £1,200");
    expect(goals.conversation.selectedResult?.calculation.runId)
      .toBe(october.conversation.selectedResult?.calculation.runId);

    const benefits = await application.send(id, {
      requestId: "demo_flow_7",
      message: "What benefits do I have from work?"
    });
    expect(benefits.intent).toBe("RETRIEVE_WORK_BENEFITS");
    expect(benefits.conversation.messages.at(-1)?.text).toContain("verified workplace is OniBank");
    expect(benefits.conversation.messages.at(-1)?.text).toContain("you contribute 3%");
    expect(benefits.conversation.messages.at(-1)?.text).toContain("additional pension match up to 5%");
    expect(benefits.conversation.messages.at(-1)?.text).toContain("season-ticket loan");
    expect(benefits.conversation.messages.at(-1)?.text).toContain("no numerical effect has been calculated");

    expect(scenarioSimulation).not.toHaveBeenCalled();
    expect(amountSimulation).not.toHaveBeenCalled();
    expect(timingSimulation).not.toHaveBeenCalled();
    expect(provider.observedDemoInterpretationRequests).toHaveLength(7);
    expect(provider.observedDemoResponseRequests).toHaveLength(7);
    expect(benefits.conversation.messages).toHaveLength(14);
  });

  it("sends only turn-relevant, presentation-ready facts to the wording provider", async () => {
    const { application, provider, id } = await newDemoConversation();
    await application.send(id, { requestId: "minimal_goals", message: "What are my goals?" });
    await application.send(id, { requestId: "minimal_benefits", message: "What benefits do I have from work?" });

    const interpretationPayload = JSON.stringify(provider.observedDemoInterpretationRequests);
    expect(interpretationPayload).not.toMatch(/275000|245000|720000|sarah|email|company.?id|otp|user.?id|context.?version/i);

    const goalRequest = provider.observedDemoResponseRequests[0]!;
    expect(goalRequest).toEqual({
      answerKind: "GOALS",
      facts: [
        { key: "GOAL_1", text: "Emergency fund: £3,300 saved toward £4,500." },
        { key: "GOAL_2", text: "House deposit: £7,200 saved toward £25,000." },
        { key: "GOAL_3", text: "Holiday: £350 saved toward £1,200." }
      ]
    });
    const providerPayload = JSON.stringify(provider.observedDemoResponseRequests);
    expect(providerPayload).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f-]{27,}|sarah\.wonk|@|FY7K3M9Q2D|otp|rls|sourceReference|contextVersion|runId|scenarioId|userId/i
    );
  });

  it("rejects invented wording facts and keeps the trusted result card available", async () => {
    const { application, provider, id } = await newDemoConversation();
    vi.spyOn(provider, "writeDemoResponse").mockResolvedValueOnce({
      value: {
        template: "Your safety buffer is £9,999. {{RESULT_SUMMARY}} {{SAFETY_BUFFER}} {{REQUIRED_PAYMENTS}} {{BORROWING}} {{BUFFER_RECOVERY}} {{GOAL_IMPACT_1}} {{GOAL_IMPACT_2}} {{GOAL_IMPACT_3}} {{SCENARIO_ASSUMPTIONS}}"
      },
      metadata: { provider: "fake", model: "fake-conversation/2.0.0", attempts: 1 }
    });
    const turn = await application.send(id, {
      requestId: "invalid_demo_wording",
      message: "Can I afford a £650 trip next month?"
    });
    expect(turn.explanationFallbackUsed).toBe(true);
    expect(turn.conversation.messages.at(-1)).toMatchObject({
      kind: "ASSISTANT_RESULT",
      templateId: "DEMO_TRUSTED_FALLBACK",
      explanationFallbackUsed: true
    });
    expect(turn.conversation.messages.at(-1)?.text).not.toContain("£9,999");
    expect(turn.conversation.selectedResult?.presentation.immediateImpact.safetyBufferAfter).toBe("£250");
  });

  it("falls back safely when natural wording fails after deterministic simulation", async () => {
    const { application, id } = await newDemoConversation("explanation_failure");
    const turn = await application.send(id, {
      requestId: "demo_wording_failure",
      message: "Can I afford a £650 trip next month?"
    });
    expect(turn.intent).toBe("CREATE_ONE_OFF_PURCHASE");
    expect(turn.explanationFallbackUsed).toBe(true);
    expect(turn.conversation.selectedResult?.presentation.immediateImpact.safetyBufferAfter).toBe("£250");
    expect(turn.conversation.messages.at(-1)).toMatchObject({
      kind: "ASSISTANT_RESULT",
      templateId: "DEMO_TRUSTED_FALLBACK"
    });
  });

  it("keeps demo turns idempotent without duplicate provider or simulator work", async () => {
    const { application, repository, provider, simulator, id } = await newDemoConversation();
    const simulate = vi.spyOn(simulator.simulateOneOffPurchase, "execute");
    const request = {
      requestId: "demo_exact_retry",
      message: "Can I afford a £650 trip next month?"
    } as const;
    const first = await application.send(id, request);
    const retried = await application.send(id, request);
    expect(retried.conversation.messages).toEqual(first.conversation.messages);
    expect(repository.messages.get(id)).toHaveLength(2);
    expect(provider.observedDemoInterpretationRequests).toHaveLength(1);
    expect(provider.observedDemoResponseRequests).toHaveLength(1);
    expect(simulate).toHaveBeenCalledTimes(1);
  });

  it("keeps benefit activation unsupported and never creates a financial scenario", async () => {
    const { application, simulator, provider, id } = await newDemoConversation();
    const simulate = vi.spyOn(simulator.simulateOneOffPurchase, "execute");
    const turn = await application.send(id, {
      requestId: "demo_benefit_activation",
      message: "Use the season-ticket loan for me."
    });
    expect(turn.intent).toBe("UNSUPPORTED");
    expect(turn.conversation.messages.at(-1)?.kind).toBe("ASSISTANT_SCOPE");
    expect(turn.conversation.scenarios).toHaveLength(0);
    expect(simulate).not.toHaveBeenCalled();
    expect(provider.observedDemoResponseRequests).toHaveLength(0);
  });

  it("does not trust a model-supplied scenario label that is absent from the message", async () => {
    const { application, provider, simulator, id } = await newDemoConversation();
    await application.send(id, {
      requestId: "demo_reference_seed",
      message: "Can I afford a £650 trip next month?"
    });
    vi.spyOn(provider, "interpretDemo").mockResolvedValueOnce({
      value: {
        kind: "CHANGE_PURCHASE_AMOUNT",
        amount: { quote: "£500", currency: "GBP" },
        scenarioReferenceStrategy: "EXPLICIT_SCENARIO_LABEL",
        scenarioReferenceQuote: "£650 trip"
      },
      metadata: { provider: "fake", model: "fake-conversation/2.0.0", attempts: 1 }
    });
    const simulate = vi.spyOn(simulator.generateAmountAlternatives, "execute");
    await expect(application.send(id, {
      requestId: "demo_invented_reference",
      message: "What about £500?"
    })).rejects.toMatchObject({ code: "AI_INTERPRETATION_INVALID" });
    expect(simulate).not.toHaveBeenCalled();
  });

  it("blocks new retrieval from a stale demo thread before trusted data is mixed", async () => {
    const test = await newDemoConversation();
    test.setCurrentVersion("financial-context-v2");
    await expect(test.application.send(test.id, {
      requestId: "stale_demo_goals",
      message: "What are my goals?"
    })).rejects.toMatchObject({ code: "CONVERSATION_CONTEXT_STALE" });
    expect(test.provider.observedDemoResponseRequests).toHaveLength(0);
  });
});
