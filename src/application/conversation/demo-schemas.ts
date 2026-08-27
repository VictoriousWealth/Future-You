import { z } from "zod";
import type {
  DemoConversationInterpretation,
  DemoResponsePlan,
  RecordedConversationIntentKind
} from "./demo-contracts";
import { DEMO_RETRIEVAL_INTENT_IDS } from "./demo-contracts";
import { conversationInterpretationSchema } from "./schemas";
import { INTERPRETATION_INTENT_IDS } from "./interpretation-policy";

export const demoConversationInterpretationSchema = z.union([
  conversationInterpretationSchema,
  z.object({ kind: z.literal("RETRIEVE_GOALS") }).strict(),
  z.object({ kind: z.literal("RETRIEVE_WORK_BENEFITS") }).strict()
]) as z.ZodType<DemoConversationInterpretation>;

export const demoConversationInterpretationEnvelopeSchema = z.object({
  interpretation: demoConversationInterpretationSchema
}).strict();

export const demoResponsePlanSchema = z.object({
  template: z.string().trim().min(1).max(4_000)
}).strict() as z.ZodType<DemoResponsePlan>;

export const recordedConversationIntentKindSchema = z.enum([
  ...INTERPRETATION_INTENT_IDS,
  ...DEMO_RETRIEVAL_INTENT_IDS
]) as z.ZodType<RecordedConversationIntentKind>;

