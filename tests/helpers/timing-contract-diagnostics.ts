import type { CompleteTimingInterpretation } from "../../src/application/conversation/contracts";
import { ConversationApplicationError } from "../../src/application/conversation/application-error";
import { sourceContainsQuote } from "../../src/application/conversation/exact-source-grounding";
import {
  conversationInterpretationEnvelopeV2Schema
} from "../../src/application/conversation/schemas";
import { resolvePaymentPeriod } from "../../src/application/conversation/time-resolution";
import {
  runtimeValidationDiagnostic,
  successfulInterpretationDiagnostic,
  type InterpretationDiagnosticCode,
  type InterpretationValidationStage
} from "../../src/infrastructure/ai/openai/interpretation-diagnostics";
import { INTERPRETATION_PARAMETERS_V2 } from "../../src/infrastructure/ai/openai/provider-json-schemas";

type JsonSchema = Readonly<Record<string, unknown>>;

export const CANONICAL_TIMING_MESSAGE = "Can I afford a £650 trip next month?";
export const CANONICAL_TRUSTED_DATE = "2026-08-24";

export const COMPLETE_TIMING_KINDS = [
  "NEXT_MONTH",
  "MONTHS_AFTER_SELECTED",
  "NAMED_MONTH",
  "EXPLICIT_YEAR_MONTH"
] as const satisfies readonly CompleteTimingInterpretation["kind"][];

const QUOTE_CLASSES = ["next month", "October", ""] as const;
const MONTH_NUMBER_CLASSES = [null, 0, 1, 10, 12, 13] as const;
const YEAR_CLASSES = [null, 1999, 2000, 2026, 2200, 2201] as const;
const OFFSET_CLASSES = [null, -1, 0, 1, 2, 120, 121] as const;

export interface SyntheticTimingShape {
  readonly quote?: unknown;
  readonly kind?: unknown;
  readonly monthNumber?: unknown;
  readonly year?: unknown;
  readonly offsetMonths?: unknown;
  readonly [key: string]: unknown;
}

export interface TimingShapeClassification {
  readonly providerSchemaValid: boolean;
  readonly runtimeContractValid: boolean;
  readonly failedStage: InterpretationValidationStage | null;
  readonly diagnosticCodes: readonly InterpretationDiagnosticCode[];
  readonly safePaths: readonly string[];
  readonly sourceGrounded: boolean | null;
  readonly diagnosticCommandAuthorized: boolean;
  readonly conversationStateValid: boolean | null;
  readonly applicationEligible: boolean;
  readonly applicationErrorCode: string | null;
  readonly resolvedPaymentPeriod: string | null;
  readonly canonicalMeaningConsistent: boolean | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** A deliberately small JSON-Schema evaluator for the constructs used by completeTiming. */
export function acceptsJsonSchema(schema: JsonSchema, value: unknown): boolean {
  if (Array.isArray(schema.anyOf)) {
    return schema.anyOf.some((candidate) => acceptsJsonSchema(candidate as JsonSchema, value));
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return false;
  if (schema.type === "null") return value === null;
  if (schema.type === "string") return typeof value === "string";
  if (schema.type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (schema.type !== "object") return true;

  const record = asRecord(value);
  if (!record) return false;
  const properties = asRecord(schema.properties) ?? {};
  const required = Array.isArray(schema.required) ? schema.required.map(String) : [];
  if (required.some((field) => !Object.hasOwn(record, field))) return false;
  if (schema.additionalProperties === false && Object.keys(record).some((field) => !Object.hasOwn(properties, field))) {
    return false;
  }
  return Object.entries(properties).every(([field, fieldSchema]) =>
    !Object.hasOwn(record, field) || acceptsJsonSchema(fieldSchema as JsonSchema, record[field])
  );
}

export function providerCompleteTimingSchema(): JsonSchema {
  const rootProperties = asRecord(INTERPRETATION_PARAMETERS_V2.properties);
  const interpretation = asRecord(rootProperties?.interpretation);
  const branches = Array.isArray(interpretation?.anyOf) ? interpretation.anyOf : [];
  const create = branches.map(asRecord).find((branch) => {
    const properties = asRecord(branch?.properties);
    const kind = asRecord(properties?.kind);
    return Array.isArray(kind?.enum) && kind.enum[0] === "CREATE_ONE_OFF_PURCHASE";
  });
  const timing = asRecord(asRecord(create?.properties)?.timing);
  if (!timing) throw new Error("The CREATE_ONE_OFF_PURCHASE provider timing schema was not found.");
  return timing;
}

export function providerSchemaAcceptsTiming(timing: unknown): boolean {
  return acceptsJsonSchema(providerCompleteTimingSchema(), timing);
}

/**
 * Exhaustive over the provider schema's structural/nullability classes and representative
 * range boundaries. Strings and integers are unbounded in that schema, so the literal value
 * space is infinite; these representatives partition the materially different runtime outcomes.
 */
export function enumerateProviderTimingEquivalenceShapes(): readonly SyntheticTimingShape[] {
  const shapes: SyntheticTimingShape[] = [];
  for (const kind of COMPLETE_TIMING_KINDS) {
    for (const quote of QUOTE_CLASSES) {
      for (const monthNumber of MONTH_NUMBER_CLASSES) {
        for (const year of YEAR_CLASSES) {
          for (const offsetMonths of OFFSET_CLASSES) {
            shapes.push({ quote, kind, monthNumber, year, offsetMonths });
          }
        }
      }
    }
  }
  return shapes;
}

const diagnosticMetadata = {
  modelId: "synthetic-timing-diagnostic",
  promptVersion: "fy-conversation-interpretation/2.0.0",
  schemaVersion: "fy-conversation-intent/2.0.0",
  attempt: 1,
  repairAttempt: false,
  rootField: "interpretation" as const,
  allowedBranchKinds: [
    "CREATE_ONE_OFF_PURCHASE",
    "CHANGE_PURCHASE_AMOUNT",
    "CHANGE_PURCHASE_MONTH",
    "EXPLAIN_SELECTED_RESULT",
    "SELECT_EXISTING_SCENARIO",
    "CLARIFY_PURCHASE_AMOUNT",
    "CLARIFY_PURCHASE_MONTH",
    "CLARIFY_SCENARIO_REFERENCE",
    "HELP",
    "GREETING",
    "UNSUPPORTED",
    "AMBIGUOUS"
  ] as const
};

const diagnosticRequest = {
  userMessage: CANONICAL_TIMING_MESSAGE,
  pendingClarification: null,
  availableScenarios: [],
  selectedScenarioType: null,
  trustedDate: CANONICAL_TRUSTED_DATE,
  timezone: "Europe/London" as const
};

function envelope(timing: SyntheticTimingShape): unknown {
  return {
    interpretation: {
      kind: "CREATE_ONE_OFF_PURCHASE",
      amount: { quote: "£650", currency: "GBP" },
      timing,
      purposeQuote: "trip"
    }
  };
}

export function classifyCanonicalCreateTiming(
  timing: SyntheticTimingShape,
  selectedPaymentPeriod: string | null = null
): TimingShapeClassification {
  const rawEnvelope = envelope(timing);
  const parsed = conversationInterpretationEnvelopeV2Schema.safeParse(rawEnvelope);
  if (!parsed.success) {
    const diagnostic = runtimeValidationDiagnostic(
      diagnosticMetadata,
      rawEnvelope,
      parsed.error
    );
    return {
      providerSchemaValid: providerSchemaAcceptsTiming(timing),
      runtimeContractValid: false,
      failedStage: diagnostic.failedStage,
      diagnosticCodes: diagnostic.diagnosticCodes,
      safePaths: diagnostic.jsonPointerPaths,
      sourceGrounded: null,
      diagnosticCommandAuthorized: false,
      conversationStateValid: null,
      applicationEligible: false,
      applicationErrorCode: null,
      resolvedPaymentPeriod: null,
      canonicalMeaningConsistent: null
    };
  }

  const interpretation = parsed.data.interpretation;
  if (interpretation.kind !== "CREATE_ONE_OFF_PURCHASE") {
    throw new Error("The test-only envelope did not retain the create branch.");
  }
  const diagnostic = successfulInterpretationDiagnostic(
    diagnosticMetadata,
    interpretation,
    diagnosticRequest
  );
  const sourceGrounded = sourceContainsQuote(CANONICAL_TIMING_MESSAGE, interpretation.timing.quote);
  const canonicalMeaningConsistent = sourceGrounded
    ? interpretation.timing.kind === "NEXT_MONTH" && interpretation.timing.quote.toLocaleLowerCase("en-GB") === "next month"
    : null;

  if (!sourceGrounded) {
    return {
      providerSchemaValid: providerSchemaAcceptsTiming(timing),
      runtimeContractValid: true,
      failedStage: diagnostic.failedStage,
      diagnosticCodes: diagnostic.diagnosticCodes,
      safePaths: diagnostic.jsonPointerPaths,
      sourceGrounded: false,
      diagnosticCommandAuthorized: diagnostic.applicationCommandAuthorized,
      conversationStateValid: null,
      applicationEligible: false,
      applicationErrorCode: "AI_INTERPRETATION_INVALID",
      resolvedPaymentPeriod: null,
      canonicalMeaningConsistent
    };
  }

  try {
    const resolvedPaymentPeriod = resolvePaymentPeriod({
      timing: interpretation.timing,
      currentMessage: CANONICAL_TIMING_MESSAGE,
      trustedDate: CANONICAL_TRUSTED_DATE,
      selectedPaymentPeriod,
      allowedPriorTiming: null
    });
    return {
      providerSchemaValid: providerSchemaAcceptsTiming(timing),
      runtimeContractValid: true,
      failedStage: diagnostic.failedStage,
      diagnosticCodes: diagnostic.diagnosticCodes,
      safePaths: diagnostic.jsonPointerPaths,
      sourceGrounded: true,
      diagnosticCommandAuthorized: diagnostic.applicationCommandAuthorized,
      conversationStateValid: true,
      applicationEligible: true,
      applicationErrorCode: null,
      resolvedPaymentPeriod,
      canonicalMeaningConsistent
    };
  } catch (error) {
    return {
      providerSchemaValid: providerSchemaAcceptsTiming(timing),
      runtimeContractValid: true,
      failedStage: diagnostic.failedStage,
      diagnosticCodes: diagnostic.diagnosticCodes,
      safePaths: diagnostic.jsonPointerPaths,
      sourceGrounded: true,
      diagnosticCommandAuthorized: diagnostic.applicationCommandAuthorized,
      conversationStateValid: false,
      applicationEligible: false,
      applicationErrorCode: error instanceof ConversationApplicationError ? error.code : "UNKNOWN",
      resolvedPaymentPeriod: null,
      canonicalMeaningConsistent
    };
  }
}
