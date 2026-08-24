import type { FinancialContextSource } from "../../application/ports/financial-context-source";
import type { FinancialContextSnapshot } from "../../domain/simulator/types";
import { SARAH_V1_CONTEXT } from "../../fixtures/sarah-v1";

export class SarahV1ContextSource implements FinancialContextSource {
  async getCurrentContextVersionId(): Promise<string> {
    return Promise.resolve(SARAH_V1_CONTEXT.version);
  }

  async getContextVersion(contextVersionId: string): Promise<FinancialContextSnapshot | null> {
    return Promise.resolve(
      contextVersionId === SARAH_V1_CONTEXT.version ? SARAH_V1_CONTEXT : null
    );
  }
}
