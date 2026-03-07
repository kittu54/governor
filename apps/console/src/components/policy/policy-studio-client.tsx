"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

interface PolicyStudioClientProps {
  orgId: string;
}

export function PolicyStudioClient({ orgId }: PolicyStudioClientProps) {
  const [message, setMessage] = useState("Ready");
  const [simResult, setSimResult] = useState<{
    decision: string;
    trace: Array<{ code: string; message: string }>;
  } | null>(null);

  async function createRule(formData: FormData) {
    const payload = {
      org_id: orgId,
      agent_id: (formData.get("agent_id") as string) || null,
      tool_name: formData.get("tool_name"),
      tool_action: formData.get("tool_action"),
      effect: formData.get("effect"),
      priority: Number(formData.get("priority") || 100),
      reason: formData.get("reason")
    };

    const response = await fetch(`${API_BASE_URL}/v1/policies/rules`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    setMessage(response.ok ? "Rule created" : "Failed to create rule");
  }

  async function createThreshold(formData: FormData) {
    const payload = {
      org_id: orgId,
      agent_id: (formData.get("agent_id") as string) || null,
      tool_name: formData.get("tool_name"),
      tool_action: formData.get("tool_action"),
      amount_usd: Number(formData.get("amount_usd"))
    };

    const response = await fetch(`${API_BASE_URL}/v1/policies/thresholds`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    setMessage(response.ok ? "Threshold created" : "Failed to create threshold");
  }

  async function createBudget(formData: FormData) {
    const payload = {
      org_id: orgId,
      agent_id: (formData.get("agent_id") as string) || null,
      daily_limit_usd: Number(formData.get("daily_limit_usd"))
    };

    const response = await fetch(`${API_BASE_URL}/v1/policies/budgets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    setMessage(response.ok ? "Budget created" : "Failed to create budget");
  }

  async function createRateLimit(formData: FormData) {
    const payload = {
      org_id: orgId,
      agent_id: (formData.get("agent_id") as string) || null,
      calls_per_minute: Number(formData.get("calls_per_minute"))
    };

    const response = await fetch(`${API_BASE_URL}/v1/policies/rate-limits`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    setMessage(response.ok ? "Rate limit created" : "Failed to create rate limit");
  }

  async function simulate(formData: FormData) {
    const payload = {
      org_id: orgId,
      agent_id: formData.get("agent_id"),
      tool_name: formData.get("tool_name"),
      tool_action: formData.get("tool_action"),
      cost_estimate_usd: Number(formData.get("cost_estimate_usd") || 0)
    };

    const response = await fetch(`${API_BASE_URL}/v1/policies/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setMessage("Simulation failed");
      return;
    }

    const data = await response.json();
    setSimResult({ decision: data.decision, trace: data.trace ?? [] });
    setMessage("Simulation complete");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Policy Studio</CardTitle>
          <CardDescription>Visual policy controls for rule authoring, thresholds, budgets, and simulator.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Org: {orgId} • Status: {message}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Allow/Deny Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" action={createRule}>
              <Field label="Agent ID (optional)">
                <Input name="agent_id" placeholder="agent_finance_1 or *" />
              </Field>
              <Field label="Tool Name">
                <Input name="tool_name" defaultValue="stripe" required />
              </Field>
              <Field label="Tool Action">
                <Input name="tool_action" defaultValue="refund" required />
              </Field>
              <Field label="Effect">
                <select name="effect" className="h-10 w-full rounded-md border bg-white px-3 text-sm" defaultValue="DENY">
                  <option value="ALLOW">ALLOW</option>
                  <option value="DENY">DENY</option>
                </select>
              </Field>
              <Field label="Priority">
                <Input name="priority" type="number" defaultValue="10" min={0} required />
              </Field>
              <Field label="Reason">
                <Textarea name="reason" placeholder="Business justification" />
              </Field>
              <Button type="submit">Add Rule</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" action={createThreshold}>
              <Field label="Agent ID (optional)">
                <Input name="agent_id" placeholder="agent_finance_1" />
              </Field>
              <Field label="Tool Name">
                <Input name="tool_name" defaultValue="stripe" required />
              </Field>
              <Field label="Tool Action">
                <Input name="tool_action" defaultValue="refund" required />
              </Field>
              <Field label="Amount USD">
                <Input name="amount_usd" type="number" step="0.01" defaultValue="50" required />
              </Field>
              <Button type="submit">Add Threshold</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" action={createBudget}>
              <Field label="Agent ID (optional)">
                <Input name="agent_id" placeholder="agent_ops_1" />
              </Field>
              <Field label="Daily Limit USD">
                <Input name="daily_limit_usd" type="number" step="0.01" defaultValue="500" required />
              </Field>
              <Button type="submit">Add Budget</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate Limit Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" action={createRateLimit}>
              <Field label="Agent ID (optional)">
                <Input name="agent_id" placeholder="agent_ops_1" />
              </Field>
              <Field label="Calls per Minute">
                <Input name="calls_per_minute" type="number" defaultValue="30" min={1} required />
              </Field>
              <Button type="submit">Add Rate Limit</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy Simulator</CardTitle>
          <CardDescription>Run a virtual tool call and inspect matched rules and decision trace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5" action={simulate}>
            <Input name="agent_id" placeholder="agent_id" defaultValue="agent_finance_1" required />
            <Input name="tool_name" placeholder="tool_name" defaultValue="stripe" required />
            <Input name="tool_action" placeholder="tool_action" defaultValue="refund" required />
            <Input name="cost_estimate_usd" type="number" step="0.01" defaultValue="75" required />
            <Button type="submit">Simulate</Button>
          </form>

          {simResult && (
            <div className="mt-4 rounded-lg border bg-secondary/40 p-4">
              <p className="mb-2 text-sm font-medium">Decision: {simResult.decision}</p>
              <div className="space-y-2 text-sm">
                {simResult.trace.map((item, index) => (
                  <div key={`${item.code}-${index}`} className="rounded border bg-white p-2">
                    <p className="font-medium">{item.code}</p>
                    <p>{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
