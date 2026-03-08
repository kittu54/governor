"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Plus, Trash2, TestTube, Webhook, MessageSquare, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface AlertConfig {
  id: string;
  org_id: string;
  name: string;
  channel: string;
  alert_types: string[];
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AlertsClientProps {
  initialConfigs: AlertConfig[];
  orgId: string;
}

const ALERT_TYPES = [
  "HIGH_RISK_ACTION",
  "POLICY_DENIAL",
  "MONEY_MOVEMENT",
  "APPROVAL_REQUIRED",
  "BUDGET_WARNING",
];

export function AlertsClient({ initialConfigs, orgId }: AlertsClientProps) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState<"webhook" | "slack" | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [toast, setToast] = useState<{ text: string; variant: "success" | "error" } | null>(null);

  function showToast(text: string, variant: "success" | "error" = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

  async function addWebhook() {
    if (!formUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/alerts/webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: orgId, name: formName || "Webhook Alert", url: formUrl, alert_types: ["*"] }),
      });
      if (res.ok) {
        showToast("Webhook alert created");
        setShowForm(null);
        setFormName("");
        setFormUrl("");
        await reload();
      } else {
        const err = await res.json().catch(() => null);
        showToast((err as any)?.error ?? "Failed to create", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setLoading(false);
    }
  }

  async function addSlack() {
    if (!formUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/alerts/slack`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: orgId, name: formName || "Slack Alert", webhook_url: formUrl, alert_types: ["*"] }),
      });
      if (res.ok) {
        showToast("Slack alert created");
        setShowForm(null);
        setFormName("");
        setFormUrl("");
        await reload();
      } else {
        const err = await res.json().catch(() => null);
        showToast((err as any)?.error ?? "Failed to create", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteConfig(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/alerts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfigs((prev) => prev.filter((c) => c.id !== id));
        showToast("Alert deleted");
      }
    } catch {
      showToast("Failed to delete", "error");
    }
  }

  async function testAlert() {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/alerts/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: orgId }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Test sent to ${data.delivered} endpoint(s)`);
      }
    } catch {
      showToast("Failed to send test", "error");
    }
  }

  async function reload() {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/alerts?org_id=${encodeURIComponent(orgId)}`);
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs ?? []);
      }
    } catch { /* */ }
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed right-6 top-6 z-50 animate-in fade-in slide-in-from-top-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.variant === "error" ? "border-red-500/30 bg-red-950/80 text-red-300" : "border-emerald-500/30 bg-emerald-950/80 text-emerald-300"
        }`}>
          {toast.text}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Action Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get notified when high-risk actions are attempted, policies are denied, or budgets are exceeded
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Configured</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{configs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{configs.filter((c) => c.is_active).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Webhook</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{configs.filter((c) => c.channel === "WEBHOOK").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Slack</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{configs.filter((c) => c.channel === "SLACK").length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Alert Configurations
              </CardTitle>
              <CardDescription>Manage webhook and Slack alert destinations</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={testAlert}>
                <TestTube className="h-3.5 w-3.5 mr-1.5" /> Test
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm("webhook")}>
                <Webhook className="h-3.5 w-3.5 mr-1.5" /> Webhook
              </Button>
              <Button size="sm" onClick={() => setShowForm("slack")}>
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Slack
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-4 rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium">Add {showForm === "webhook" ? "Webhook" : "Slack"} Alert</p>
              <Input placeholder="Alert name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              <Input
                placeholder={showForm === "webhook" ? "https://your-endpoint.com/webhook" : "https://hooks.slack.com/services/..."}
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={showForm === "webhook" ? addWebhook : addSlack} disabled={loading || !formUrl}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                  Create
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowForm(null); setFormName(""); setFormUrl(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Alert Types</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No alert configurations yet. Add a Webhook or Slack integration to get started.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {config.channel === "WEBHOOK" ? <Webhook className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                        {config.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(config.alert_types as string[]).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[9px]">
                            {t === "*" ? "ALL" : t}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.is_active ? "success" : "secondary"}>
                        {config.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(config.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteConfig(config.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Types</CardTitle>
          <CardDescription>Events that trigger notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ALERT_TYPES.map((type) => (
              <div key={type} className="rounded-lg border border-border/60 p-3">
                <p className="font-mono text-xs font-medium">{type}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {type === "HIGH_RISK_ACTION" && "Critical risk tool invocation attempted"}
                  {type === "POLICY_DENIAL" && "Action blocked by governance policy"}
                  {type === "MONEY_MOVEMENT" && "Financial transaction above threshold"}
                  {type === "APPROVAL_REQUIRED" && "Action requires human approval"}
                  {type === "BUDGET_WARNING" && "Spending approaching budget limit"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
