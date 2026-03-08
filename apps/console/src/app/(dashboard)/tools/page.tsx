import { apiGet } from "@/lib/api";
import { resolveOrgId } from "@/lib/org";
import { ToolRegistryClient } from "@/components/tools/tool-registry-client";

interface ToolsResponse {
  tools: {
    id: string;
    org_id: string;
    tool_name: string;
    tool_action: string;
    display_name: string | null;
    description: string | null;
    risk_class: string;
    risk_severity: number;
    is_sensitive: boolean;
    created_at: string;
    updated_at: string;
  }[];
}

interface RiskClassesResponse {
  risk_classes: {
    id: string;
    label: string;
    severity: number;
    description: string;
  }[];
}

export default async function ToolsPage() {
  const orgId = await resolveOrgId();

  const [toolsData, riskClassesData] = await Promise.all([
    apiGet<ToolsResponse>(`/v1/tools?org_id=${encodeURIComponent(orgId)}`).catch(() => ({ tools: [] as ToolsResponse["tools"] })),
    apiGet<RiskClassesResponse>(`/v1/tools/risk-classes`).catch(() => ({ risk_classes: [] as RiskClassesResponse["risk_classes"] })),
  ]);

  return (
    <ToolRegistryClient
      tools={toolsData.tools}
      riskClasses={riskClassesData.risk_classes}
      orgId={orgId}
    />
  );
}
