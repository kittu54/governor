"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Zap, TrendingUp, CheckCircle, ArrowRight } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  actions_per_month: number | null;
  price_usd: number | null;
  features: string[];
}

interface Usage {
  plan: string;
  actions_this_month: number;
  evaluations_this_month: number;
  actions_limit: number | null;
  usage_percentage: number;
  billing_email: string | null;
  current_period: string;
}

interface BillingClientProps {
  orgId: string;
  usage: Usage | null;
  plans: Plan[];
}

export function BillingClient({ orgId, usage, plans }: BillingClientProps) {
  const currentPlan = usage?.plan ?? "free";
  const actionsUsed = usage?.actions_this_month ?? 0;
  const actionsLimit = usage?.actions_limit;
  const usagePct = usage?.usage_percentage ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Billing & Usage
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your plan and monitor usage
        </p>
      </div>

      {/* Current usage */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Plan</div>
              <Badge variant={currentPlan === "free" ? "outline" : "default"} className="text-[10px] capitalize">
                {currentPlan}
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-2 capitalize">{currentPlan}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions This Month</div>
            <p className="text-2xl font-bold mt-2">{actionsUsed.toLocaleString()}</p>
            {actionsLimit && (
              <p className="text-[11px] text-muted-foreground">
                of {actionsLimit.toLocaleString()} ({usagePct}%)
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Evaluations</div>
            <p className="text-2xl font-bold mt-2">{(usage?.evaluations_this_month ?? 0).toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage bar */}
      {actionsLimit && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Usage</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {actionsUsed.toLocaleString()} / {actionsLimit.toLocaleString()} actions
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted">
              <div
                className={`h-3 rounded-full transition-all ${
                  usagePct > 90 ? "bg-red-500" : usagePct > 70 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${Math.min(usagePct, 100)}%` }}
              />
            </div>
            {usagePct > 80 && (
              <p className="text-xs text-amber-400 mt-2">
                You&apos;re approaching your plan limit. Consider upgrading for uninterrupted service.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Available Plans
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <Card key={plan.id} className={isCurrent ? "border-primary/40 ring-1 ring-primary/20" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {isCurrent && <Badge variant="default" className="text-[9px]">Current</Badge>}
                  </div>
                  <CardDescription>
                    {plan.price_usd === 0
                      ? "Free forever"
                      : plan.price_usd
                        ? `$${plan.price_usd}/month`
                        : "Custom pricing"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <Button
                      variant={plan.id === "pro" ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      disabled={plan.id === "enterprise"}
                    >
                      {plan.id === "enterprise" ? (
                        "Contact Sales"
                      ) : (
                        <>
                          Upgrade <ArrowRight className="h-3 w-3 ml-1" />
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing Information</CardTitle>
          <CardDescription>
            {usage?.billing_email
              ? `Invoices sent to ${usage.billing_email}`
              : "No billing email configured"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organization</span>
              <span className="font-mono text-xs">{orgId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Period</span>
              <span>{usage?.current_period ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="text-muted-foreground">Not configured</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
