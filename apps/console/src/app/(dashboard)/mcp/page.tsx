import { MCPServersClient } from "@/components/mcp/mcp-servers-client";
import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api-server";

interface MCPServer {
  id: string;
  org_id: string;
  name: string;
  base_url: string;
  description: string | null;
  auth_type: string;
  is_active: boolean;
  tool_count: number;
  last_sync_at: string | null;
  created_at: string;
}

interface MCPServersResponse {
  servers: MCPServer[];
}

export default async function MCPServersPage() {
  const orgId = await resolveOrgId();

  const data = await apiGet<MCPServersResponse>(
    `/v1/mcp/servers?org_id=${encodeURIComponent(orgId)}`
  ).catch(() => ({ servers: [] }));

  return <MCPServersClient orgId={orgId} initialServers={data.servers} />;
}
