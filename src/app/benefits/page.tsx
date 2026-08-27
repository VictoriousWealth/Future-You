import type { Metadata } from "next";
import { requireProductPage } from "../../server/product-page-access";
import { BenefitsSurface } from "../../ui/features/product-surfaces/benefits-surface";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Benefits & opportunities | Future You" };

export default async function BenefitsPage() {
  await requireProductPage("/benefits");
  return <BenefitsSurface/>;
}
