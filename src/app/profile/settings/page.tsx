import type { Metadata } from "next";
import { publicSupabaseConfiguration } from "../../../infrastructure/supabase/config";
import { requireProfilePageData } from "../../../server/profile-page-data";
import { SettingsSurface } from "../../../ui/features/profile/settings-surface";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings | Future You" };

export default async function ProfileSettingsPage() {
  const profile = await requireProfilePageData("/profile/settings");
  return <SettingsSurface personalEmail={profile.personalEmail} configuration={publicSupabaseConfiguration()}/>;
}
