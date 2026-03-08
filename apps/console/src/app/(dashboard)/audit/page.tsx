import { apiGet } from "@/lib/api";
import { resolveOrgId } from "@/lib/org";
import { AuditExplorerClient } from "@/components/audit/audit-explorer-client";

interface AuditResponse {
  entries: {
    id: string;
    org_id: string;
    actor_type: string;
    actor_id: string | null;
    event_type: string;
    entity_type: string;
    entity_id: string | null;
    summary: string;
    payload: unknown;
    created_at: string;
  }[];
  total: number;
}

export default async function AuditPage() {
  const orgId = await resolveOrgId();

  const data = await apiGet<AuditResponse>(
    `/v1/audit-log?org_id=${encodeURIComponent(orgId)}&limit=100`
  ).catch(() => ({ entries: [] as AuditResponse["entries"], total: 0 }));

  return <AuditExplorerClient entries={data.entries} total={data.total} orgId={orgId} />;
}
