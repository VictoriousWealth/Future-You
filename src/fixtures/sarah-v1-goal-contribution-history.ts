import type { GoalContributionHistorySource } from "../application/ports/goal-contribution-history-source";
import { gbp } from "../domain/shared/money";
import { SARAH_V1_IDS } from "./sarah-v1";

const periods = [
  ["2026-03", 5_000, 40_000, 10_000],
  ["2026-04", 5_000, 45_000, 10_000],
  ["2026-05", 5_000, 45_000, 10_000],
  ["2026-06", 5_000, 40_000, 15_000],
  ["2026-07", 5_000, 45_000, 10_000],
  ["2026-08", 5_000, 45_000, 10_000]
] as const;

export const SARAH_V1_GOAL_CONTRIBUTION_HISTORY_SOURCE: GoalContributionHistorySource = {
  async getHistory(contextVersion) {
    if (contextVersion !== "sarah-v1@2026-09-01") return null;
    return {
      sourceLabel: "Contributions recorded in Future You",
      throughPeriod: "2026-08",
      periods: periods.map(([period, emergency, house, holiday]) => ({
        period,
        contributions: [
          { goalId: SARAH_V1_IDS.emergencyFund, amount: gbp(emergency) },
          { goalId: SARAH_V1_IDS.houseDeposit, amount: gbp(house) },
          { goalId: SARAH_V1_IDS.holiday, amount: gbp(holiday) }
        ]
      }))
    };
  }
};
