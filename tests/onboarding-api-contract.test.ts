import { describe, expect, it } from "vitest";
import type { FinancialContextSource } from "../src/application/ports/financial-context-source";
import type { FinancialContextPreviewDTO } from "../src/application/onboarding/contracts";
import type {
  ConfirmContextVersionCommand,
  ConfirmContextVersionResult,
  FinancialContextVersionRepository,
  WorkplaceAssociation
} from "../src/application/ports/financial-context-version-repository";
import { createOnboardingApplication } from "../src/application/onboarding/application";
import type { FinancialContextSnapshot } from "../src/domain/simulator/types";
import { SLICE_1_RULES } from "../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../src/fixtures/calendar/england-wales-bank-holidays";
import { SARAH_V1_ONBOARDING_DRAFT } from "../src/fixtures/sarah-v1-onboarding";
import type { AuthenticatedOnboardingApplicationResolver } from "../src/server/authenticated-onboarding-application";
import { handleGET as handleStatus } from "../src/app/api/v1/onboarding/status/route";
import { handlePOST as handlePreview } from "../src/app/api/v1/financial-context/previews/route";
import { handlePOST as handleConfirm } from "../src/app/api/v1/financial-context/versions/route";
import { handlePOST as handleRevision } from "../src/app/api/v1/financial-context/current/revisions/route";
import { assertPlainJsonTree } from "./helpers/slice-2";

class MemoryContextBoundary implements FinancialContextSource, FinancialContextVersionRepository {
  current: string | null = null;
  contexts = new Map<string, FinancialContextSnapshot>();
  keys = new Map<string, { identity: string; version: string }>();
  workplace: WorkplaceAssociation | null = null;
  writes = 0;

  async getCurrentContextVersionId() { return this.current; }
  async getContextVersion(version: string) { return this.contexts.get(version) ?? null; }
  async confirm(command: ConfirmContextVersionCommand): Promise<ConfirmContextVersionResult> {
    const key = `${command.operation}:${command.requestId}`;
    const existing = this.keys.get(key);
    if (existing) {
      return existing.identity === command.requestIdentity
        ? { status: "existing", contextVersionId: existing.version }
        : { status: "idempotency_conflict", contextVersionId: existing.version };
    }
    if (this.current !== command.expectedCurrentContextVersionId) {
      return { status: "context_conflict", contextVersionId: this.current };
    }
    this.contexts.set(command.context.version, command.context);
    this.current = command.context.version;
    this.keys.set(key, { identity: command.requestIdentity, version: command.context.version });
    this.writes += 1;
    return { status: "created", contextVersionId: command.context.version };
  }
  async saveWorkplace(value: WorkplaceAssociation) { this.workplace = value; }
  async getWorkplace() { return this.workplace; }
}

function setup() {
  const boundary = new MemoryContextBoundary();
  const application = createOnboardingApplication({
    contextSource: boundary,
    versionRepository: boundary,
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
  });
  const resolver: AuthenticatedOnboardingApplicationResolver = async () => ({
    principal: { userId: "route-onboarding-user" },
    application
  });
  return { boundary, resolver };
}

function post(url: string, body: unknown, origin = "http://localhost"): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Host: "localhost"
    },
    body: JSON.stringify(body)
  });
}

async function json<T = unknown>(response: Response): Promise<T> {
  const body: unknown = await response.json();
  assertPlainJsonTree(body);
  return body as T;
}

describe("manual onboarding API contract", () => {
  it("reports no-context status and previews without persistence", async () => {
    const { boundary, resolver } = setup();
    const status = await handleStatus(resolver);
    expect(status.status).toBe(200);
    expect(await json(status)).toMatchObject({
      kind: "onboarding_status",
      status: "NOT_STARTED",
      currentContextVersionId: null
    });
    const response = await handlePreview(post("http://localhost/api/v1/financial-context/previews", {
      draft: SARAH_V1_ONBOARDING_DRAFT,
      mode: "initial",
      expectedCurrentContextVersionId: null
    }), resolver);
    const body = await json(response);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(body).toMatchObject({
      kind: "financial_context_preview",
      contextSummary: {
        actualCash: { minorUnits: "275000" },
        currentSafetyBuffer: { minorUnits: "90000" },
        monthlyContributionCapacity: { minorUnits: "60000" }
      }
    });
    expect(boundary.writes).toBe(0);
    expect(boundary.current).toBeNull();
  });

  it("binds confirmation to the preview and enforces idempotency", async () => {
    const { boundary, resolver } = setup();
    const previewResponse = await handlePreview(post("http://localhost/api/v1/financial-context/previews", {
      draft: SARAH_V1_ONBOARDING_DRAFT,
      mode: "initial",
      expectedCurrentContextVersionId: null
    }), resolver);
    const preview = await json<FinancialContextPreviewDTO>(previewResponse);
    const command = {
      draft: SARAH_V1_ONBOARDING_DRAFT,
      mode: "initial",
      expectedCurrentContextVersionId: null,
      requestId: "route-confirm-1",
      reviewedCanonicalRequestHash: preview.candidate.canonicalRequestHash
    };
    const first = await handleConfirm(post("http://localhost/api/v1/financial-context/versions", command), resolver);
    expect(first.status).toBe(201);
    expect(await json(first)).toMatchObject({ created: true, contextVersionId: "sarah-v1@2026-09-01" });
    const retry = await handleConfirm(post("http://localhost/api/v1/financial-context/versions", command), resolver);
    expect(retry.status).toBe(200);
    expect(await json(retry)).toMatchObject({ created: false, contextVersionId: "sarah-v1@2026-09-01" });
    expect(boundary.writes).toBe(1);

    const mismatch = await handleConfirm(post("http://localhost/api/v1/financial-context/versions", {
      ...command,
      reviewedCanonicalRequestHash: "fnv1a64:0000000000000000"
    }), resolver);
    expect(mismatch.status).toBe(400);
    expect(await json(mismatch)).toMatchObject({ error: { code: "ONBOARDING_PREVIEW_MISMATCH" } });
  });

  it("returns field-specific exact-money errors", async () => {
    const { resolver } = setup();
    const response = await handlePreview(post("http://localhost/api/v1/financial-context/previews", {
      draft: {
        ...SARAH_V1_ONBOARDING_DRAFT,
        income: {
          ...SARAH_V1_ONBOARDING_DRAFT.income,
          monthlyNetIncome: {
            ...SARAH_V1_ONBOARDING_DRAFT.income.monthlyNetIncome,
            amount: "2.45e3"
          }
        }
      },
      mode: "initial",
      expectedCurrentContextVersionId: null
    }), resolver);
    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({
      error: {
        code: "MONEY_INPUT_INVALID",
        details: {
          issues: [{ path: "draft.income.monthlyNetIncome.amount" }]
        }
      }
    });
  });

  it.each([
    ["preview", handlePreview, "/api/v1/financial-context/previews", {
      draft: SARAH_V1_ONBOARDING_DRAFT,
      mode: "initial",
      expectedCurrentContextVersionId: null
    }],
    ["initial confirmation", handleConfirm, "/api/v1/financial-context/versions", {}],
    ["revision confirmation", handleRevision, "/api/v1/financial-context/current/revisions", {}]
  ])("rejects cross-origin %s before application work", async (_label, handler, path, body) => {
    const { resolver } = setup();
    const response = await handler(post(`http://localhost${path}`, body, "https://attacker.invalid"), resolver);
    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  });
});
