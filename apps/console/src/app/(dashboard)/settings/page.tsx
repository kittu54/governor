import { resolveOrgId } from "@/lib/org";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const orgId = await resolveOrgId();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return <SettingsClient orgId={orgId} apiBaseUrl={apiBaseUrl} clerkEnabled={clerkEnabled} />;
}
