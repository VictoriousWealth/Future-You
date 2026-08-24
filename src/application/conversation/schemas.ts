import { z } from "zod";

export const conversationIntentKindSchema = z.enum([
  "CREATE_ONE_OFF_PURCHASE",
  "CHANGE_PURCHASE_AMOUNT",
  "CHANGE_PURCHASE_MONTH",
  "EXPLAIN_SELECTED_RESULT",
  "SELECT_EXISTING_SCENARIO",
  "HELP",
  "GREETING",
  "UNSUPPORTED",
  "AMBIGUOUS"
]);

const amountSchema = z.object({
  quote: z.string().max(80).nullable(),
  currency: z.enum(["GBP", "UNSUPPORTED"]).nullable()
}).strict();

const timingSchema = z.object({
  quote: z.string().max(120).nullable(),
  kind: z.enum([
    "NEXT_MONTH",
    "MONTHS_AFTER_SELECTED",
    "NAMED_MONTH",
    "EXPLICIT_YEAR_MONTH",
    "MISSING",
    "AMBIGUOUS"
  ]),
  monthNumber: z.number().int().min(1).max(12).nullable(),
  year: z.number().int().min(2000).max(2200).nullable(),
  offsetMonths: z.number().int().min(0).max(120).nullable()
}).strict();

export const pendingClarificationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PURCHASE_AMOUNT"),
    originalMessageId: z.string().min(3).max(160),
    partialPurpose: z.string().max(160).nullable(),
    partialTiming: timingSchema
  }).strict(),
  z.object({
    type: z.literal("PURCHASE_MONTH"),
    originalMessageId: z.string().min(3).max(160),
    amountQuote: z.string().min(1).max(80),
    partialPurpose: z.string().max(160).nullable()
  }).strict(),
  z.object({
    type: z.literal("SCENARIO_REFERENCE"),
    originalMessageId: z.string().min(3).max(160),
    availableRunIds: z.array(z.string().min(3).max(160)).max(30)
  }).strict()
]);

const commonSchema = {
  missingFields: z.array(z.string().max(80)).max(4),
  unsupportedFeatures: z.array(z.string().max(80)).max(8)
};

export const conversationInterpretationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("CREATE_ONE_OFF_PURCHASE"),
    amount: amountSchema,
    timing: timingSchema,
    purposeQuote: z.string().max(160).nullable(),
    ...commonSchema
  }).strict(),
  z.object({
    kind: z.literal("CHANGE_PURCHASE_AMOUNT"),
    amount: amountSchema,
    referencedScenarioLabel: z.string().max(160).nullable(),
    ...commonSchema
  }).strict(),
  z.object({
    kind: z.literal("CHANGE_PURCHASE_MONTH"),
    timing: timingSchema,
    referencedScenarioLabel: z.string().max(160).nullable(),
    ...commonSchema
  }).strict(),
  z.object({
    kind: z.literal("EXPLAIN_SELECTED_RESULT"),
    explanationTarget: z.enum([
      "OVERALL_CLASSIFICATION", "SAFETY_BUFFER", "BUFFER_RECOVERY", "GOAL_DELAY",
      "BILLS", "BORROWING", "ASSUMPTIONS", "OTHER"
    ]),
    goalReferenceQuote: z.string().max(160).nullable()
  }).strict(),
  z.object({
    kind: z.literal("SELECT_EXISTING_SCENARIO"),
    scenarioReferenceQuote: z.string().max(160).nullable()
  }).strict(),
  z.object({ kind: z.literal("HELP") }).strict(),
  z.object({ kind: z.literal("GREETING") }).strict(),
  z.object({
    kind: z.literal("UNSUPPORTED"),
    category: z.string().min(1).max(100),
    userGoalSummary: z.string().max(240).nullable()
  }).strict(),
  z.object({
    kind: z.literal("AMBIGUOUS"),
    ambiguity: z.string().min(1).max(240),
    clarificationKey: z.string().min(1).max(100)
  }).strict()
]);

export const explanationPlanSchema = z.object({
  templateId: z.enum([
    "PURCHASE_RESULT_SIGNIFICANT", "PURCHASE_RESULT_NOTICEABLE", "PURCHASE_RESULT_MINIMAL",
    "PURCHASE_RESULT_RISKY", "BUFFER_EXPLANATION", "GOAL_DELAY_EXPLANATION",
    "TIMING_NO_IMPROVEMENT", "CURRENT_PATH_SUMMARY"
  ]),
  primaryFactKey: z.enum([
    "OVERALL_CLASSIFICATION", "BUFFER_REDUCTION", "BILLS_COVERED", "NO_BORROWING",
    "BUFFER_RECOVERY", "GOAL_DELAY", "TIMING_NO_IMPROVEMENT", "ASSUMPTIONS", "CURRENT_PATH"
  ]),
  orderedFactKeys: z.array(z.enum([
    "OVERALL_CLASSIFICATION", "BUFFER_REDUCTION", "BILLS_COVERED", "NO_BORROWING",
    "BUFFER_RECOVERY", "GOAL_DELAY", "TIMING_NO_IMPROVEMENT", "ASSUMPTIONS", "CURRENT_PATH"
  ])).min(1).max(9),
  caveatKeys: z.array(z.enum(["ASSUMED_TIMING", "HYPOTHETICAL_ONLY", "CALENDAR_FALLBACK"])).max(3),
  followUpActionKeys: z.array(z.enum([
    "TRY_LOWER_AMOUNT", "TRY_ANOTHER_MONTH", "VIEW_ASSUMPTIONS", "VIEW_CURRENT_PATH"
  ])).max(4),
  tone: z.enum(["CLEAR", "SUPPORTIVE", "DIRECT"])
}).strict();

export const createConversationRequestSchema = z.object({
  requestId: z.string().min(3).max(80).regex(/^[A-Za-z0-9_-]+$/)
}).strict();

export const sendConversationMessageRequestSchema = z.object({
  requestId: z.string().min(3).max(80).regex(/^[A-Za-z0-9_-]+$/),
  message: z.string().trim().min(1).max(1000)
}).strict();

export const selectConversationScenarioRequestSchema = z.object({
  requestId: z.string().min(3).max(80).regex(/^[A-Za-z0-9_-]+$/),
  runId: z.string().min(3).max(160).nullable()
}).strict();
