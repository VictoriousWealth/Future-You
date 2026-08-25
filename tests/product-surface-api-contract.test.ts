import { describe, expect, it } from "vitest";
import { ProductSurfaceApplication } from "../src/application/product-surfaces/application";
import type { WorkplaceAssociationSource } from "../src/application/ports/workplace-association-source";
import { SarahV1ContextSource } from "../src/infrastructure/context/sarah-v1-context-source";
import { createSimulatorApplication } from "../src/server/simulator-application";
import type { AuthenticatedProductSurfaceResolver } from "../src/server/authenticated-product-surface-application";
import { handleGET as homeGET } from "../src/app/api/v1/home/route";
import { handleGET as goalsGET } from "../src/app/api/v1/goals/route";
import { handleGET as previewGET } from "../src/app/api/v1/goals/preview/route";
import { handleGET as benefitsGET } from "../src/app/api/v1/benefits/route";
import { slice2TestDependencies } from "./helpers/slice-2";
import { AuthenticationBoundaryError } from "../src/infrastructure/auth/authentication-error";
import { AccountActivationRequiredError } from "../src/infrastructure/auth/account-activation-error";
import { SARAH_EMPLOYER_BENEFIT_SOURCE } from "./fixtures/employer-benefits";

function resolver(): AuthenticatedProductSurfaceResolver {
  const contextSource = new SarahV1ContextSource();
  const simulator = createSimulatorApplication({ ...slice2TestDependencies(), contextSource });
  const workplaceSource: WorkplaceAssociationSource = {
    async getWorkplace() {
      return { name: "OniBank", associationSource: "employer_provisioned", verificationStatus: "verified" };
    }
  };
  const application = new ProductSurfaceApplication({
    displayName: "Sarah Wonk",
    contextSource,
    workplaceSource,
    employerBenefitSource: SARAH_EMPLOYER_BENEFIT_SOURCE,
    simulator
  });
  return async () => ({
    principal: { userId: "surface-test-user" },
    currentContextVersionId: "sarah-v1@2026-09-01",
    application
  });
}

async function expectPrivateJson(response: Response, kind: string) {
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  const body = await response.json();
  expect(body.kind).toBe(kind);
  expect(() => JSON.stringify(body)).not.toThrow();
  return body;
}

describe("Slice 6 product-surface API contracts", () => {
  it("returns versioned, private JSON for Home, Goals and Benefits", async () => {
    const appResolver = resolver();
    const home = await expectPrivateJson(await homeGET(appResolver), "home_surface");
    const goals = await expectPrivateJson(await goalsGET(appResolver), "goals_surface");
    const benefits = await expectPrivateJson(await benefitsGET(appResolver), "benefits_surface");
    expect(home.apiVersion).toBe("future-you.product-surfaces/v1");
    expect(goals.schemaVersion).toBe("goals-surface/1.0.0");
    expect(benefits.opportunities).toHaveLength(2);
    expect(benefits.opportunities.map((opportunity: { benefitKey: string }) => opportunity.benefitKey)).toEqual([
      "ADDITIONAL_PENSION_MATCH",
      "SEASON_TICKET_LOAN"
    ]);
  });

  it("validates preview IDs before application access", async () => {
    const response = await previewGET(new Request("http://localhost/api/v1/goals/preview?runId=wrong"), resolver());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  });

  it("protects every surface read with the same private 401 envelope", async () => {
    const unauthenticated: AuthenticatedProductSurfaceResolver = async () => {
      throw new AuthenticationBoundaryError("AUTHENTICATION_REQUIRED");
    };
    const responses = [
      await homeGET(unauthenticated),
      await goalsGET(unauthenticated),
      await benefitsGET(unauthenticated),
      await previewGET(
        new Request("http://localhost/api/v1/goals/preview?runId=run-0000000000000000"),
        unauthenticated
      )
    ];
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
      expect(await response.json()).toMatchObject({ error: { code: "AUTHENTICATION_REQUIRED" } });
    }
  });

  it("distinguishes a signed-in account that has not completed activation", async () => {
    const pendingActivation: AuthenticatedProductSurfaceResolver = async () => {
      throw new AccountActivationRequiredError();
    };
    const response = await homeGET(pendingActivation);
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(await response.json()).toMatchObject({
      error: {
        code: "ACCOUNT_ACTIVATION_REQUIRED",
        message: expect.stringContaining("onboarding")
      }
    });
  });
});
