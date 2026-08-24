import type { Metadata } from "next";
import { Suspense } from "react";
import { requireProductPage } from "../../server/product-page-access";
import { GoalsSurface } from "../../ui/features/product-surfaces/goals-surface";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Goals | Future You" };

export default async function GoalsPage() {
  await requireProductPage("/goals");
  return <Suspense fallback={null}><GoalsSurface/></Suspense>;
}
