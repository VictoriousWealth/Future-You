import type { Metadata } from "next";
import { requireProductPage } from "../../server/product-page-access";
import { HomeSurface } from "../../ui/features/product-surfaces/home-surface";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Home | Future You" };

export default async function HomePage() {
  await requireProductPage("/home");
  return <HomeSurface/>;
}
