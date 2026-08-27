import type { Money } from "../../domain/shared/money";

export interface GoalContributionHistory {
  readonly sourceLabel: string;
  readonly throughPeriod: string;
  readonly periods: readonly Readonly<{
    readonly period: string;
    readonly contributions: readonly Readonly<{
      readonly goalId: string;
      readonly amount: Money;
    }>[];
  }>[];
}

export interface GoalContributionHistorySource {
  getHistory(contextVersion: string): Promise<GoalContributionHistory | null>;
}

export const EMPTY_GOAL_CONTRIBUTION_HISTORY_SOURCE: GoalContributionHistorySource = {
  async getHistory() { return null; }
};
