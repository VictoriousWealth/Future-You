import type { FinancialContextSnapshot } from "../../domain/simulator/types";

export interface FinancialContextSource {
  getCurrentContextVersionId(): Promise<string | null>;
  getContextVersion(contextVersionId: string): Promise<FinancialContextSnapshot | null>;
}
