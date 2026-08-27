import type { Metadata } from "next";
import { requireFinancialContextSummaryPageData } from "../../../server/financial-context-summary-page-data";
import { FinancialContextSummarySurface } from "../../../ui/features/profile/financial-context-summary-surface";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Financial context | Future You" };

export default async function FinancialContextSummaryPage() {
  const data = await requireFinancialContextSummaryPageData();
  return <FinancialContextSummarySurface {...data}/>;
}
