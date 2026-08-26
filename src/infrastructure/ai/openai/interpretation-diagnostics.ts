import "server-only";
import { z } from "zod";
import type {
  ClarificationResolution,
  ClarificationResolutionProviderRequest,
  ConversationInterpretation,
  InterpretationProviderRequest
} from "../../../application/conversation/contracts";
import {
  INTERPRETATION_INTENT_IDS,
  SCENARIO_SELECTION_TARGET_IDS,
  UNSUPPORTED_CATEGORY_IDS
} from "../../../application/conversation/interpretation-policy";

export const INTERPRETATION_DIAGNOSTIC_VERSION = "fy-interpretation-diagnostic/1.0.0" as const;

export const INTERPRETATION_VALIDATION_STAGES = [
  "PROVIDER_RESPONSE_RECEIVED",
  "TOOL_CALL_SELECTION",
  "TOOL_ARGUMENT_JSON_PARSE",
  "STRICT_SCHEMA_VALIDATION",
  "BRANCH_DISCRIMINATOR_VALIDATION",
  "BRANCH_SEMANTIC_VALIDATION",
  "IDENTIFIER_VALIDATION",
  "SOURCE_GROUNDING",
  "CONVERSATION_STATE_VALIDATION",
  "APPLICATION_COMMAND_AUTHORIZATION",
  "REPAIR_REQUEST",
  "REPAIR_RESPONSE_VALIDATION",
  "FINAL_FAILURE"
] as const;

export type InterpretationValidationStage = typeof INTERPRETATION_VALIDATION_STAGES[number];

export const INTERPRETATION_DIAGNOSTIC_CODES = [
  "REQUIRED_TOOL_CALL_MISSING",
  "UNEXPECTED_TOOL_NAME",
  "MULTIPLE_TOOL_CALLS",
  "TOOL_ARGUMENTS_NOT_JSON",
  "ROOT_ENVELOPE_INVALID",
  "INTERPRETATION_BRANCH_MISSING",
  "INTERPRETATION_BRANCH_UNKNOWN",
  "BRANCH_REQUIRED_FIELD_MISSING",
  "BRANCH_FORBIDDEN_FIELD_PRESENT",
  "FIELD_TYPE_INVALID",
  "ENUM_IDENTIFIER_INVALID",
  "NULL_NOT_ALLOWED",
  "EXTRA_PROPERTY_PRESENT",
  "BRANCH_NOT_ALLOWED_IN_CONVERSATION_STATE",
  "SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION",
  "UNSUPPORTED_BRANCH_CONTAINS_COMMAND_FIELDS",
  "CLARIFICATION_KIND_INCOMPATIBLE",
  "EXPLANATION_TARGET_INCOMPATIBLE",
  "SCENARIO_SELECTION_TARGET_INCOMPATIBLE",
  "UNSUPPORTED_CATEGORY_INCOMPATIBLE",
  "AMOUNT_QUOTE_NOT_FOUND",
  "AMOUNT_QUOTE_NOT_PARSEABLE",
  "TIMING_QUOTE_NOT_FOUND",
  "SCENARIO_LABEL_QUOTE_NOT_FOUND",
  "MODEL_SUPPLIED_UNTRUSTED_SCENARIO_ID",
  "SCENARIO_REFERENCE_UNRESOLVED",
  "CROSS_USER_REFERENCE_REJECTED",
  "UNSUPPORTED_OPERATION_REJECTED",
  "APPLICATION_COMMAND_REJECTED",
  "REPAIR_OUTPUT_IDENTICAL_FAILURE",
  "REPAIR_OUTPUT_NEW_FAILURE",
  "REPAIR_OUTPUT_INVALID",
  "REPAIR_EXHAUSTED"
] as const;

export type InterpretationDiagnosticCode = typeof INTERPRETATION_DIAGNOSTIC_CODES[number];

const CLARIFICATION_BRANCH_KINDS = [
  "RESOLVE_PURCHASE_AMOUNT",
  "RESOLVE_PURCHASE_MONTH",
  "RESOLVE_SCENARIO_REFERENCE"
] as const;

export type ApprovedDiagnosticBranchKind =
  | ConversationInterpretation["kind"]
  | ClarificationResolution["kind"];

const APPROVED_BRANCH_KINDS = new Set<string>([
  ...INTERPRETATION_INTENT_IDS,
  ...CLARIFICATION_BRANCH_KINDS
]);

const SAFE_FIELD_NAMES = new Set([
  "interpretation", "resolution", "kind", "amount", "quote", "currency", "timing",
  "purposeQuote", "monthNumber", "year", "offsetMonths", "scenarioReferenceStrategy",
  "scenarioReferenceQuote", "explanationTarget", "goalReferenceQuote", "selectionTarget",
  "scenarioLabelQuote", "attemptedOperation", "category", "ambiguity"
]);

const ENUM_FIELD_NAMES = new Set([
  "kind", "currency", "scenarioReferenceStrategy", "explanationTarget", "selectionTarget",
  "category", "ambiguity"
]);

const COMMAND_FIELD_NAMES = new Set([
  "amount", "timing", "purposeQuote", "scenarioReferenceStrategy", "scenarioReferenceQuote",
  "explanationTarget", "goalReferenceQuote", "selectionTarget", "scenarioLabelQuote",
  "attemptedOperation"
]);

export interface InterpretationDiagnosticStageEvent {
  readonly stage: InterpretationValidationStage;
  readonly outcome: "COMPLETED" | "FAILED";
}

export interface SanitisedInterpretationDiagnostic {
  readonly diagnosticVersion: typeof INTERPRETATION_DIAGNOSTIC_VERSION;
  readonly evaluationCaseId: string;
  readonly modelId: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly attempt: 1 | 2;
  readonly repairAttempt: boolean;
  readonly repairOutcome:
    | "NOT_APPLICABLE"
    | "REQUESTED"
    | "SUCCEEDED"
    | "IDENTICAL_FAILURE"
    | "NEW_FAILURE"
    | "EXHAUSTED";
  readonly selectedToolNameStatus: "EXPECTED" | "MISSING" | "UNEXPECTED" | "MULTIPLE";
  readonly selectedBranchKind: ApprovedDiagnosticBranchKind | "UNKNOWN" | null;
  readonly presentFieldNames: readonly string[];
  readonly stageTrace: readonly InterpretationDiagnosticStageEvent[];
  readonly deepestCompletedStage: InterpretationValidationStage;
  readonly failedStage: InterpretationValidationStage | null;
  readonly diagnosticCodes: readonly InterpretationDiagnosticCode[];
  readonly jsonPointerPaths: readonly string[];
  readonly strictSchemaValid: boolean;
  readonly semanticContractValid: boolean;
  readonly sourceGroundingValid: boolean | null;
  readonly conversationStateValid: boolean | null;
  readonly applicationCommandAuthorized: boolean;
  readonly simulatorInvoked: false;
}

export type SanitisedInterpretationDiagnosticDraft = Omit<
  SanitisedInterpretationDiagnostic,
  "evaluationCaseId"
>;

export interface InterpretationDiagnosticMetadata {
  readonly modelId: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly attempt: number;
  readonly repairAttempt: boolean;
  readonly rootField: "interpretation" | "resolution";
  readonly allowedBranchKinds: readonly ApprovedDiagnosticBranchKind[];
}

export interface InterpretationDiagnosticSink {
  record(diagnostic: SanitisedInterpretationDiagnosticDraft): void;
}

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort() as T[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function valueAtPath(value: unknown, path: readonly PropertyKey[]): unknown {
  let current = value;
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
      continue;
    }
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[String(segment)];
  }
  return current;
}

function safeJsonPointer(path: readonly PropertyKey[]): string {
  const retained: string[] = [];
  for (const segment of path) {
    if (typeof segment === "number") {
      retained.push(String(segment));
      continue;
    }
    const field = String(segment);
    if (!SAFE_FIELD_NAMES.has(field)) break;
    retained.push(field.replaceAll("~", "~0").replaceAll("/", "~1"));
  }
  return retained.length === 0 ? "/" : `/${retained.join("/")}`;
}

function collectSafeFieldNames(value: unknown): string[] {
  const fields = new Set<string>();
  const visit = (candidate: unknown, depth: number) => {
    if (depth > 5) return;
    const record = asRecord(candidate);
    if (!record) return;
    for (const [key, child] of Object.entries(record)) {
      if (!SAFE_FIELD_NAMES.has(key)) continue;
      fields.add(key);
      visit(child, depth + 1);
    }
  };
  visit(value, 0);
  return [...fields].sort();
}

function containsProperty(value: unknown, propertyName: string, depth = 0): boolean {
  if (depth > 5) return false;
  const record = asRecord(value);
  if (!record) return false;
  if (Object.hasOwn(record, propertyName)) return true;
  return Object.values(record).some((child) => containsProperty(child, propertyName, depth + 1));
}

function approvedBranchKind(value: unknown, rootField: "interpretation" | "resolution"):
  ApprovedDiagnosticBranchKind | "UNKNOWN" | null {
  const root = asRecord(value);
  if (!root || !Object.hasOwn(root, rootField)) return null;
  const branch = asRecord(root[rootField]);
  if (!branch || typeof branch.kind !== "string") return null;
  return APPROVED_BRANCH_KINDS.has(branch.kind)
    ? branch.kind as ApprovedDiagnosticBranchKind
    : "UNKNOWN";
}

function baseDiagnostic(
  metadata: InterpretationDiagnosticMetadata,
  input: Readonly<{
    toolStatus: SanitisedInterpretationDiagnosticDraft["selectedToolNameStatus"];
    rawValue?: unknown;
    deepestCompletedStage: InterpretationValidationStage;
    failedStage: InterpretationValidationStage | null;
    codes?: readonly InterpretationDiagnosticCode[];
    paths?: readonly string[];
    strictSchemaValid?: boolean;
    semanticContractValid?: boolean;
    stageTrace: readonly InterpretationDiagnosticStageEvent[];
  }>
): SanitisedInterpretationDiagnosticDraft {
  return {
    diagnosticVersion: INTERPRETATION_DIAGNOSTIC_VERSION,
    modelId: metadata.modelId,
    promptVersion: metadata.promptVersion,
    schemaVersion: metadata.schemaVersion,
    attempt: metadata.attempt === 1 ? 1 : 2,
    repairAttempt: metadata.repairAttempt,
    repairOutcome: "NOT_APPLICABLE",
    selectedToolNameStatus: input.toolStatus,
    selectedBranchKind: approvedBranchKind(input.rawValue, metadata.rootField),
    presentFieldNames: collectSafeFieldNames(input.rawValue),
    stageTrace: input.stageTrace,
    deepestCompletedStage: input.deepestCompletedStage,
    failedStage: input.failedStage,
    diagnosticCodes: uniqueSorted(input.codes ?? []),
    jsonPointerPaths: uniqueSorted(input.paths ?? []),
    strictSchemaValid: input.strictSchemaValid ?? false,
    semanticContractValid: input.semanticContractValid ?? false,
    sourceGroundingValid: null,
    conversationStateValid: null,
    applicationCommandAuthorized: false,
    simulatorInvoked: false
  };
}

export function toolSelectionDiagnostic(
  metadata: InterpretationDiagnosticMetadata,
  status: "MISSING" | "UNEXPECTED" | "MULTIPLE"
): SanitisedInterpretationDiagnosticDraft {
  const code = status === "MISSING"
    ? "REQUIRED_TOOL_CALL_MISSING"
    : status === "UNEXPECTED"
      ? "UNEXPECTED_TOOL_NAME"
      : "MULTIPLE_TOOL_CALLS";
  return baseDiagnostic(metadata, {
    toolStatus: status,
    deepestCompletedStage: "PROVIDER_RESPONSE_RECEIVED",
    failedStage: "TOOL_CALL_SELECTION",
    codes: [code],
    paths: ["/"],
    stageTrace: [
      { stage: "PROVIDER_RESPONSE_RECEIVED", outcome: "COMPLETED" },
      { stage: "TOOL_CALL_SELECTION", outcome: "FAILED" }
    ]
  });
}

export function jsonArgumentsDiagnostic(
  metadata: InterpretationDiagnosticMetadata
): SanitisedInterpretationDiagnosticDraft {
  return baseDiagnostic(metadata, {
    toolStatus: "EXPECTED",
    deepestCompletedStage: "TOOL_CALL_SELECTION",
    failedStage: "TOOL_ARGUMENT_JSON_PARSE",
    codes: ["TOOL_ARGUMENTS_NOT_JSON"],
    paths: ["/"],
    stageTrace: [
      { stage: "PROVIDER_RESPONSE_RECEIVED", outcome: "COMPLETED" },
      { stage: "TOOL_CALL_SELECTION", outcome: "COMPLETED" },
      { stage: "TOOL_ARGUMENT_JSON_PARSE", outcome: "FAILED" }
    ]
  });
}

function issueCodes(
  rawValue: unknown,
  error: unknown,
  branchKind: ApprovedDiagnosticBranchKind | "UNKNOWN" | null
): Readonly<{
  codes: InterpretationDiagnosticCode[];
  paths: string[];
  failedStage: InterpretationValidationStage;
}> {
  const codes: InterpretationDiagnosticCode[] = [];
  const paths: string[] = [];
  let failedStage: InterpretationValidationStage = "STRICT_SCHEMA_VALIDATION";
  const issues = error instanceof z.ZodError ? error.issues : [];

  for (const issue of issues) {
    const path = safeJsonPointer(issue.path);
    paths.push(path);
    const actual = valueAtPath(rawValue, issue.path);
    const leaf = String(issue.path.at(-1) ?? "");
    if (issue.code === "unrecognized_keys") {
      const keys = "keys" in issue && Array.isArray(issue.keys) ? issue.keys.map(String) : [];
      const recognisedCommand = keys.some((key) => COMMAND_FIELD_NAMES.has(key));
      codes.push(recognisedCommand ? "BRANCH_FORBIDDEN_FIELD_PRESENT" : "EXTRA_PROPERTY_PRESENT");
      continue;
    }
    if (issue.code === "invalid_type") {
      if (actual === undefined) codes.push("BRANCH_REQUIRED_FIELD_MISSING");
      else if (actual === null) codes.push("NULL_NOT_ALLOWED");
      else codes.push("FIELD_TYPE_INVALID");
      continue;
    }
    if (ENUM_FIELD_NAMES.has(leaf) && (issue.code === "invalid_value" || issue.code === "invalid_union")) {
      codes.push("ENUM_IDENTIFIER_INVALID");
      failedStage = "IDENTIFIER_VALIDATION";
      continue;
    }
    if (issue.code === "custom") {
      failedStage = "BRANCH_SEMANTIC_VALIDATION";
      if (branchKind === "EXPLAIN_SELECTED_RESULT") codes.push("EXPLANATION_TARGET_INCOMPATIBLE");
      else if (branchKind === "SELECT_EXISTING_SCENARIO" || leaf.includes("scenario")) {
        codes.push("SCENARIO_SELECTION_TARGET_INCOMPATIBLE");
      } else codes.push("SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION");
      continue;
    }
    codes.push("FIELD_TYPE_INVALID");
  }

  if (codes.length === 0) codes.push("ROOT_ENVELOPE_INVALID");
  return { codes, paths: paths.length > 0 ? paths : ["/"], failedStage };
}

export function runtimeValidationDiagnostic(
  metadata: InterpretationDiagnosticMetadata,
  rawValue: unknown,
  error: unknown
): SanitisedInterpretationDiagnosticDraft {
  const root = asRecord(rawValue);
  const branchValue = root ? root[metadata.rootField] : undefined;
  const branch = asRecord(branchValue);
  const selected = approvedBranchKind(rawValue, metadata.rootField);
  let codes: InterpretationDiagnosticCode[];
  let paths: string[];
  let failedStage: InterpretationValidationStage;

  if (!root) {
    codes = ["ROOT_ENVELOPE_INVALID"];
    paths = ["/"];
    failedStage = "STRICT_SCHEMA_VALIDATION";
  } else if (!Object.hasOwn(root, metadata.rootField) || branchValue === undefined) {
    codes = ["INTERPRETATION_BRANCH_MISSING"];
    paths = [`/${metadata.rootField}`];
    failedStage = "STRICT_SCHEMA_VALIDATION";
  } else if (!branch) {
    codes = ["FIELD_TYPE_INVALID"];
    paths = [`/${metadata.rootField}`];
    failedStage = "STRICT_SCHEMA_VALIDATION";
  } else if (!Object.hasOwn(branch, "kind")) {
    codes = ["INTERPRETATION_BRANCH_MISSING", "BRANCH_REQUIRED_FIELD_MISSING"];
    paths = [`/${metadata.rootField}/kind`];
    failedStage = "BRANCH_DISCRIMINATOR_VALIDATION";
  } else if (selected === "UNKNOWN") {
    codes = ["INTERPRETATION_BRANCH_UNKNOWN", "ENUM_IDENTIFIER_INVALID"];
    paths = [`/${metadata.rootField}/kind`];
    failedStage = "BRANCH_DISCRIMINATOR_VALIDATION";
  } else if (selected && !metadata.allowedBranchKinds.includes(selected)) {
    codes = ["CLARIFICATION_KIND_INCOMPATIBLE"];
    paths = [`/${metadata.rootField}/kind`];
    failedStage = "BRANCH_SEMANTIC_VALIDATION";
  } else {
    const classified = issueCodes(rawValue, error, selected);
    codes = classified.codes;
    paths = classified.paths;
    failedStage = classified.failedStage;
  }

  if (selected === "UNSUPPORTED") {
    const branchFields = Object.keys(branch ?? {});
    if (branchFields.some((field) => COMMAND_FIELD_NAMES.has(field))) {
      codes.push("UNSUPPORTED_BRANCH_CONTAINS_COMMAND_FIELDS");
      failedStage = "BRANCH_SEMANTIC_VALIDATION";
      paths.push(`/${metadata.rootField}`);
    }
    if (branch && !UNSUPPORTED_CATEGORY_IDS.includes(branch.category as typeof UNSUPPORTED_CATEGORY_IDS[number])) {
      codes.push("UNSUPPORTED_CATEGORY_INCOMPATIBLE", "ENUM_IDENTIFIER_INVALID");
      failedStage = "IDENTIFIER_VALIDATION";
      paths.push(`/${metadata.rootField}/category`);
    }
  }
  if (selected === "EXPLAIN_SELECTED_RESULT" && branch && typeof branch.explanationTarget === "string") {
    const knownTargets = new Set([
      "OVERALL_CLASSIFICATION", "SAFETY_BUFFER", "BUFFER_RECOVERY", "GOAL_DELAY", "BILLS",
      "BORROWING", "ASSUMPTIONS", "TIMING_EFFECT", "OTHER_SUPPORTED_EXPLANATION"
    ]);
    if (!knownTargets.has(branch.explanationTarget)) {
      codes.push("EXPLANATION_TARGET_INCOMPATIBLE", "ENUM_IDENTIFIER_INVALID");
      failedStage = "IDENTIFIER_VALIDATION";
      paths.push(`/${metadata.rootField}/explanationTarget`);
    }
  }
  if (selected === "SELECT_EXISTING_SCENARIO" && branch && typeof branch.selectionTarget === "string") {
    if (!SCENARIO_SELECTION_TARGET_IDS.includes(branch.selectionTarget as typeof SCENARIO_SELECTION_TARGET_IDS[number])) {
      codes.push("SCENARIO_SELECTION_TARGET_INCOMPATIBLE", "ENUM_IDENTIFIER_INVALID");
      failedStage = "IDENTIFIER_VALIDATION";
      paths.push(`/${metadata.rootField}/selectionTarget`);
    }
  }
  if (containsProperty(rawValue, "scenarioId") || containsProperty(rawValue, "runId")) {
    codes.push("MODEL_SUPPLIED_UNTRUSTED_SCENARIO_ID");
    paths.push(`/${metadata.rootField}`);
  }

  const deepestCompletedStage: InterpretationValidationStage = failedStage === "STRICT_SCHEMA_VALIDATION"
    ? (selected && selected !== "UNKNOWN" ? "BRANCH_DISCRIMINATOR_VALIDATION" : "TOOL_ARGUMENT_JSON_PARSE")
    : failedStage === "BRANCH_DISCRIMINATOR_VALIDATION"
      ? "TOOL_ARGUMENT_JSON_PARSE"
      : failedStage === "BRANCH_SEMANTIC_VALIDATION"
        ? "STRICT_SCHEMA_VALIDATION"
        : "BRANCH_SEMANTIC_VALIDATION";

  return baseDiagnostic(metadata, {
    toolStatus: "EXPECTED",
    rawValue,
    deepestCompletedStage,
    failedStage,
    codes,
    paths,
    strictSchemaValid: failedStage !== "STRICT_SCHEMA_VALIDATION" && failedStage !== "BRANCH_DISCRIMINATOR_VALIDATION",
    semanticContractValid: failedStage === "IDENTIFIER_VALIDATION",
    stageTrace: [
      { stage: "PROVIDER_RESPONSE_RECEIVED", outcome: "COMPLETED" },
      { stage: "TOOL_CALL_SELECTION", outcome: "COMPLETED" },
      { stage: "TOOL_ARGUMENT_JSON_PARSE", outcome: "COMPLETED" },
      { stage: failedStage, outcome: "FAILED" }
    ]
  });
}

function quotePresent(source: string, quote: string): boolean {
  return source.toLocaleLowerCase("en-GB").includes(quote.toLocaleLowerCase("en-GB"));
}

function amountQuote(value: ConversationInterpretation | ClarificationResolution): string | null {
  if ("amount" in value) return value.amount.quote;
  if (value.kind === "CLARIFY_SCENARIO_REFERENCE" && value.attemptedOperation.kind === "CHANGE_PURCHASE_AMOUNT") {
    return value.attemptedOperation.amount.quote;
  }
  return null;
}

function timingQuote(value: ConversationInterpretation | ClarificationResolution): string | null {
  if ("timing" in value) return value.timing?.quote ?? null;
  if (value.kind === "CLARIFY_SCENARIO_REFERENCE" && value.attemptedOperation.kind === "CHANGE_PURCHASE_MONTH") {
    return value.attemptedOperation.timing.quote;
  }
  return null;
}

function scenarioQuote(value: ConversationInterpretation | ClarificationResolution): string | null {
  if ("scenarioReferenceQuote" in value) return value.scenarioReferenceQuote;
  if ("scenarioLabelQuote" in value) return value.scenarioLabelQuote;
  return null;
}

export function successfulInterpretationDiagnostic(
  metadata: InterpretationDiagnosticMetadata,
  value: ConversationInterpretation | ClarificationResolution,
  request: InterpretationProviderRequest | ClarificationResolutionProviderRequest
): SanitisedInterpretationDiagnosticDraft {
  let diagnostic = baseDiagnostic(metadata, {
    toolStatus: "EXPECTED",
    rawValue: { [metadata.rootField]: value },
    deepestCompletedStage: "IDENTIFIER_VALIDATION",
    failedStage: null,
    strictSchemaValid: true,
    semanticContractValid: true,
    stageTrace: [
      { stage: "PROVIDER_RESPONSE_RECEIVED", outcome: "COMPLETED" },
      { stage: "TOOL_CALL_SELECTION", outcome: "COMPLETED" },
      { stage: "TOOL_ARGUMENT_JSON_PARSE", outcome: "COMPLETED" },
      { stage: "STRICT_SCHEMA_VALIDATION", outcome: "COMPLETED" },
      { stage: "BRANCH_DISCRIMINATOR_VALIDATION", outcome: "COMPLETED" },
      { stage: "BRANCH_SEMANTIC_VALIDATION", outcome: "COMPLETED" },
      { stage: "IDENTIFIER_VALIDATION", outcome: "COMPLETED" }
    ]
  });

  const amount = amountQuote(value);
  if (amount !== null && !quotePresent(request.userMessage, amount)) {
    return failAfterProviderValidation(diagnostic, "SOURCE_GROUNDING", "AMOUNT_QUOTE_NOT_FOUND", `/${metadata.rootField}/amount/quote`);
  }
  if (amount !== null && !/(?:0|[1-9]\d*)(?:\.\d{1,2})?/.test(amount)) {
    return failAfterProviderValidation(diagnostic, "SOURCE_GROUNDING", "AMOUNT_QUOTE_NOT_PARSEABLE", `/${metadata.rootField}/amount/quote`);
  }
  const timing = timingQuote(value);
  if (timing !== null && !quotePresent(request.userMessage, timing)) {
    return failAfterProviderValidation(diagnostic, "SOURCE_GROUNDING", "TIMING_QUOTE_NOT_FOUND", `/${metadata.rootField}/timing/quote`);
  }
  const label = scenarioQuote(value);
  if (label !== null && !quotePresent(request.userMessage, label)) {
    return failAfterProviderValidation(diagnostic, "SOURCE_GROUNDING", "SCENARIO_LABEL_QUOTE_NOT_FOUND", `/${metadata.rootField}/scenarioLabelQuote`);
  }

  diagnostic = {
    ...diagnostic,
    sourceGroundingValid: amount !== null || timing !== null || label !== null ? true : null,
    deepestCompletedStage: "SOURCE_GROUNDING",
    stageTrace: [...diagnostic.stageTrace, { stage: "SOURCE_GROUNDING", outcome: "COMPLETED" }]
  };

  const selected = request.availableScenarios.some((scenario) => scenario.selected);
  const selectedStrategy = "scenarioReferenceStrategy" in value && value.scenarioReferenceStrategy === "SELECTED_SCENARIO";
  const selectedTarget = "selectionTarget" in value && value.selectionTarget === "SELECTED_SCENARIO";
  if ((selectedStrategy || selectedTarget) && !selected) {
    return failConversationState(diagnostic, "BRANCH_NOT_ALLOWED_IN_CONVERSATION_STATE", `/${metadata.rootField}/scenarioReferenceStrategy`);
  }
  const explicitStrategy = "scenarioReferenceStrategy" in value && value.scenarioReferenceStrategy === "EXPLICIT_SCENARIO_LABEL";
  const explicitTarget = "selectionTarget" in value && value.selectionTarget === "EXPLICIT_SCENARIO_LABEL";
  if ((explicitStrategy || explicitTarget) && label !== null) {
    const source = label.toLocaleLowerCase("en-GB");
    const resolved = request.availableScenarios.some((scenario) => {
      const available = scenario.label.toLocaleLowerCase("en-GB");
      return available.includes(source) || source.includes(available);
    });
    if (!resolved) return failConversationState(diagnostic, "SCENARIO_REFERENCE_UNRESOLVED", `/${metadata.rootField}/scenarioLabelQuote`);
  }

  diagnostic = {
    ...diagnostic,
    conversationStateValid: true,
    deepestCompletedStage: "CONVERSATION_STATE_VALIDATION",
    stageTrace: [...diagnostic.stageTrace, { stage: "CONVERSATION_STATE_VALIDATION", outcome: "COMPLETED" }]
  };

  if (value.kind === "UNSUPPORTED") {
    const code: InterpretationDiagnosticCode = value.category === "CROSS_USER_OR_IDENTITY_ACCESS"
      ? "CROSS_USER_REFERENCE_REJECTED"
      : "UNSUPPORTED_OPERATION_REJECTED";
    return {
      ...diagnostic,
      deepestCompletedStage: "APPLICATION_COMMAND_AUTHORIZATION",
      diagnosticCodes: uniqueSorted([...diagnostic.diagnosticCodes, code]),
      applicationCommandAuthorized: false,
      stageTrace: [...diagnostic.stageTrace, { stage: "APPLICATION_COMMAND_AUTHORIZATION", outcome: "COMPLETED" }]
    };
  }

  return {
    ...diagnostic,
    deepestCompletedStage: "APPLICATION_COMMAND_AUTHORIZATION",
    applicationCommandAuthorized: true,
    stageTrace: [...diagnostic.stageTrace, { stage: "APPLICATION_COMMAND_AUTHORIZATION", outcome: "COMPLETED" }]
  };
}

function failAfterProviderValidation(
  diagnostic: SanitisedInterpretationDiagnosticDraft,
  stage: "SOURCE_GROUNDING",
  code: InterpretationDiagnosticCode,
  path: string
): SanitisedInterpretationDiagnosticDraft {
  return {
    ...diagnostic,
    failedStage: stage,
    diagnosticCodes: uniqueSorted([...diagnostic.diagnosticCodes, code]),
    jsonPointerPaths: uniqueSorted([...diagnostic.jsonPointerPaths, path]),
    sourceGroundingValid: false,
    stageTrace: [...diagnostic.stageTrace, { stage, outcome: "FAILED" }]
  };
}

function failConversationState(
  diagnostic: SanitisedInterpretationDiagnosticDraft,
  code: InterpretationDiagnosticCode,
  path: string
): SanitisedInterpretationDiagnosticDraft {
  return {
    ...diagnostic,
    failedStage: "CONVERSATION_STATE_VALIDATION",
    diagnosticCodes: uniqueSorted([
      ...diagnostic.diagnosticCodes,
      code,
      "APPLICATION_COMMAND_REJECTED"
    ]),
    jsonPointerPaths: uniqueSorted([...diagnostic.jsonPointerPaths, path]),
    conversationStateValid: false,
    applicationCommandAuthorized: false,
    stageTrace: [...diagnostic.stageTrace, { stage: "CONVERSATION_STATE_VALIDATION", outcome: "FAILED" }]
  };
}

function failureSignature(diagnostic: SanitisedInterpretationDiagnosticDraft): string {
  return JSON.stringify({
    failedStage: diagnostic.failedStage,
    selectedToolNameStatus: diagnostic.selectedToolNameStatus,
    selectedBranchKind: diagnostic.selectedBranchKind,
    diagnosticCodes: diagnostic.diagnosticCodes,
    jsonPointerPaths: diagnostic.jsonPointerPaths,
    presentFieldNames: diagnostic.presentFieldNames
  });
}

export function markRepairRequested(
  diagnostic: SanitisedInterpretationDiagnosticDraft
): SanitisedInterpretationDiagnosticDraft {
  return {
    ...diagnostic,
    repairOutcome: "REQUESTED",
    stageTrace: [...diagnostic.stageTrace, { stage: "REPAIR_REQUEST", outcome: "COMPLETED" }]
  };
}

export function markRepairSucceeded(
  diagnostic: SanitisedInterpretationDiagnosticDraft
): SanitisedInterpretationDiagnosticDraft {
  return {
    ...diagnostic,
    repairOutcome: "SUCCEEDED",
    stageTrace: [...diagnostic.stageTrace, { stage: "REPAIR_RESPONSE_VALIDATION", outcome: "COMPLETED" }]
  };
}

export function markRepairFailed(
  diagnostic: SanitisedInterpretationDiagnosticDraft,
  firstFailure: SanitisedInterpretationDiagnosticDraft
): SanitisedInterpretationDiagnosticDraft {
  const identical = failureSignature(diagnostic) === failureSignature(firstFailure);
  return {
    ...diagnostic,
    repairOutcome: identical ? "IDENTICAL_FAILURE" : "NEW_FAILURE",
    diagnosticCodes: uniqueSorted([
      ...diagnostic.diagnosticCodes,
      identical ? "REPAIR_OUTPUT_IDENTICAL_FAILURE" : "REPAIR_OUTPUT_NEW_FAILURE",
      "REPAIR_OUTPUT_INVALID",
      "REPAIR_EXHAUSTED"
    ]),
    stageTrace: [
      ...diagnostic.stageTrace,
      { stage: "REPAIR_RESPONSE_VALIDATION", outcome: "FAILED" },
      { stage: "FINAL_FAILURE", outcome: "COMPLETED" }
    ]
  };
}

export function markFinalFailure(
  diagnostic: SanitisedInterpretationDiagnosticDraft
): SanitisedInterpretationDiagnosticDraft {
  return {
    ...diagnostic,
    stageTrace: diagnostic.stageTrace.some((event) => event.stage === "FINAL_FAILURE")
      ? diagnostic.stageTrace
      : [...diagnostic.stageTrace, { stage: "FINAL_FAILURE", outcome: "COMPLETED" }]
  };
}

export function repairValidationErrors(
  diagnostic: SanitisedInterpretationDiagnosticDraft
): readonly Readonly<{ path: string; code: InterpretationDiagnosticCode }>[] {
  const paths = diagnostic.jsonPointerPaths.length > 0 ? diagnostic.jsonPointerPaths : ["/"];
  return diagnostic.diagnosticCodes.map((code, index) => ({
    path: paths[Math.min(index, paths.length - 1)]!,
    code
  }));
}

export function evaluationDiagnosticsEnabled(
  environment: NodeJS.ProcessEnv = process.env
): boolean {
  return environment.OPENAI_EVALUATION_DIAGNOSTICS_ENABLED?.trim().toLowerCase() === "true";
}

export class SanitisedInterpretationDiagnosticCollector implements InterpretationDiagnosticSink {
  private currentCaseId: string | null = null;
  private readonly collected: SanitisedInterpretationDiagnostic[] = [];

  constructor(environment: NodeJS.ProcessEnv = process.env) {
    if (!evaluationDiagnosticsEnabled(environment)) {
      throw new Error("Evaluation diagnostics are disabled.");
    }
  }

  beginCase(evaluationCaseId: string): void {
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(evaluationCaseId)) {
      throw new Error("The evaluation case ID is not safe for diagnostic output.");
    }
    this.currentCaseId = evaluationCaseId;
  }

  record(diagnostic: SanitisedInterpretationDiagnosticDraft): void {
    if (!this.currentCaseId) throw new Error("No evaluation diagnostic case is active.");
    this.collected.push(Object.freeze({
      ...diagnostic,
      evaluationCaseId: this.currentCaseId
    }));
  }

  records(): readonly SanitisedInterpretationDiagnostic[] {
    return structuredClone(this.collected);
  }
}
