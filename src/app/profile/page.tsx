import type { Metadata } from "next";
import { publicSupabaseConfiguration } from "../../infrastructure/supabase/config";
import { requireProfilePageData } from "../../server/profile-page-data";
import { ProfileSurface } from "../../ui/features/profile/profile-surface";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile | Future You" };

export default async function ProfilePage() {
  const profile = await requireProfilePageData("/profile");
  return <ProfileSurface {...profile} configuration={publicSupabaseConfiguration()}/>;
}
