import { resolveOrgId } from "@/lib/org";
import { apiGet } from "@/lib/api-server";
import { BillingClient } from "@/components/billing/billing-client";

export const metadata = { title: "Billing | Governor" };

interface UsageData {
  plan: string;
  actions_this_month: number;
  evaluations_this_month: number;
  actions_limit: number | null;
  usage_percentage: number;
  billing_email: string | null;
  current_period: string;
}

interface PlansData {
  plans: Array<{
    id: string;
    name: string;
    actions_per_month: number | null;
    price_usd: number | null;
    features: string[];
  }>;
}

export default async function BillingPage() {
  const orgId = await resolveOrgId();

  const [usage, plans] = await Promise.all([
    apiGet<UsageData>(`/v1/billing/usage`).catch(() => null),
    apiGet<PlansData>("/v1/billing/plans").catch(() => ({ plans: [] })),
  ]);

  return (
    <BillingClient
      orgId={orgId}
      usage={usage}
      plans={plans.plans}
    />
  );
}
