import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api-server";
import { AlertsClient } from "@/components/alerts/alerts-client";

export const metadata = { title: "Alerts | Governor" };

export default async function AlertsPage() {
  const orgId = await resolveOrgId();

  const data = await apiGet<{ configs: unknown[] }>(
    `/v1/alerts?org_id=${encodeURIComponent(orgId)}`
  ).catch(() => ({ configs: [] as unknown[] }));

  return <AlertsClient initialConfigs={data.configs as any} orgId={orgId} />;
}
