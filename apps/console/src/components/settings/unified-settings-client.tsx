"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api";
import {
  Settings, User, CreditCard, Key, Globe, Shield, Bell, Palette, Database,
  Check, LogOut, Copy, Eye, EyeOff, Zap, TrendingUp, CheckCircle, ArrowRight,
  Bot, Building2, Clock, Layers, Loader2, Trash2,
} from "lucide-react";

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

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  framework?: string | null;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

interface AgentItem {
  id: string;
  name: string;
  status: string;
}

interface Props {
  orgId: string;
  apiBaseUrl: string;
  clerkEnabled: boolean;
  usage: Usage | null;
  plans: Plan[];
  agents: AgentItem[];
  overview: { tool_calls: number; blocked_pct: number; pending_approvals: number; estimated_cost_usd: number };
  apiKeys: ApiKeyItem[];
}

type Tab = "general" | "profile" | "billing" | "keys";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "profile", label: "Profile", icon: User },
  { id: "billing", label: "Billing & Plan", icon: CreditCard },
  { id: "keys", label: "API Keys", icon: Key },
];

export function UnifiedSettingsClient({ orgId, apiBaseUrl, clerkEnabled, usage, plans, agents, overview, apiKeys }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as Tab) || "general";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account, organization, billing, and API keys</p>
        </div>
        <LogoutButton clerkEnabled={clerkEnabled} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border/60">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "general" && (
        <GeneralTab orgId={orgId} apiBaseUrl={apiBaseUrl} clerkEnabled={clerkEnabled} />
      )}
      {activeTab === "profile" && (
        <ProfileTab orgId={orgId} clerkEnabled={clerkEnabled} agents={agents} overview={overview} />
      )}
      {activeTab === "billing" && (
        <BillingTab orgId={orgId} usage={usage} plans={plans} />
      )}
      {activeTab === "keys" && (
        <ApiKeysTab orgId={orgId} initialKeys={apiKeys} />
      )}
    </div>
  );
}

/* ─── Logout Button ──────────────────────────────────────── */

const ClerkSignOut = lazy(() =>
  import("@clerk/nextjs").then((mod) => ({
    default: ({ children }: { children: React.ReactNode }) => (
      <mod.SignOutButton redirectUrl="/sign-in">{children}</mod.SignOutButton>
    ),
  }))
);

function LogoutButton({ clerkEnabled }: { clerkEnabled: boolean }) {
  const btn = (
    <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300">
      <LogOut className="h-4 w-4 mr-2" />
      Sign Out
    </Button>
  );

  if (clerkEnabled) {
    return (
      <Suspense fallback={btn}>
        <ClerkSignOut>{btn}</ClerkSignOut>
      </Suspense>
    );
  }

  return <div onClick={() => { window.location.href = "/"; }}>{btn}</div>;
}

/* ─── General Tab ────────────────────────────────────────── */

function GeneralTab({ orgId, apiBaseUrl, clerkEnabled }: { orgId: string; apiBaseUrl: string; clerkEnabled: boolean }) {
  const [liveTimeline, setLiveTimeline] = useState(true);
  const [sseStreaming, setSseStreaming] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("governor_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.liveTimeline === "boolean") setLiveTimeline(parsed.liveTimeline);
        if (typeof parsed.sseStreaming === "boolean") setSseStreaming(parsed.sseStreaming);
        if (typeof parsed.autoRefresh === "boolean") setAutoRefresh(parsed.autoRefresh);
      }
    } catch { }
  }, []);

  function persist(updates: Record<string, boolean>) {
    const current = { liveTimeline, sseStreaming, autoRefresh, ...updates };
    localStorage.setItem("governor_settings", JSON.stringify(current));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-6">
      {saved && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 animate-in fade-in">
          <Check className="h-4 w-4" /> Saved
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><CardTitle>API Configuration</CardTitle></div>
            <CardDescription>Backend API connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingRow label="API Base URL"><p className="font-mono text-sm text-foreground">{apiBaseUrl}</p></SettingRow>
            <SettingRow label="Organization"><p className="font-mono text-sm text-foreground">{orgId}</p></SettingRow>
            <SettingRow label="Status"><Badge variant="success">Connected</Badge></SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /><CardTitle>Authentication</CardTitle></div>
            <CardDescription>Authentication provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingRow label="Provider"><p className="text-sm font-medium text-foreground">{clerkEnabled ? "Clerk" : "Local Mode"}</p></SettingRow>
            <SettingRow label="Status"><Badge variant={clerkEnabled ? "success" : "warning"}>{clerkEnabled ? "Enabled" : "Demo"}</Badge></SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-muted-foreground" /><CardTitle>Appearance</CardTitle></div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Theme"><Badge variant="secondary">Dark</Badge></Row>
            <Row label="Accent"><div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full bg-primary" /><span className="text-sm text-muted-foreground">Cyan</span></div></Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" /><CardTitle>Notifications</CardTitle></div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Live Timeline"><Toggle checked={liveTimeline} onChange={(v) => { setLiveTimeline(v); persist({ liveTimeline: v }); }} /></Row>
            <Row label="SSE Streaming"><Toggle checked={sseStreaming} onChange={(v) => { setSseStreaming(v); persist({ sseStreaming: v }); }} /></Row>
            <Row label="Auto-refresh"><Toggle checked={autoRefresh} onChange={(v) => { setAutoRefresh(v); persist({ autoRefresh: v }); }} /></Row>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><Database className="h-4 w-4 text-muted-foreground" /><CardTitle>System Info</CardTitle></div></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <SettingRow label="Console"><p className="text-sm font-medium">Next.js 15</p></SettingRow>
            <SettingRow label="API"><p className="text-sm font-medium">Fastify 5</p></SettingRow>
            <SettingRow label="Database"><p className="text-sm font-medium">PostgreSQL</p></SettingRow>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Profile Tab ────────────────────────────────────────── */

function ProfileTab({ orgId, clerkEnabled, agents, overview }: { orgId: string; clerkEnabled: boolean; agents: AgentItem[]; overview: Props["overview"] }) {
  const activeAgents = agents.filter((a) => a.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{clerkEnabled ? "Clerk User" : "Console Admin"}</h2>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{clerkEnabled ? "Authenticated via Clerk" : "Local Mode"}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Badge variant="secondary"><Shield className="mr-1 h-3 w-3" />Admin</Badge>
                <Badge variant="secondary"><Building2 className="mr-1 h-3 w-3" />{orgId}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Bot} label="Active Agents" value={String(activeAgents)} />
        <StatCard icon={Layers} label="Tool Calls" value={overview.tool_calls.toLocaleString()} />
        <StatCard icon={Clock} label="Pending Approvals" value={String(overview.pending_approvals)} color={overview.pending_approvals > 0 ? "text-amber-400" : undefined} />
        <StatCard icon={CreditCard} label="Total Cost" value={`$${overview.estimated_cost_usd.toFixed(2)}`} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <SettingRow label="Role"><p className="text-sm font-medium">Administrator</p></SettingRow>
            <SettingRow label="Organization"><p className="font-mono text-sm">{orgId}</p></SettingRow>
            <SettingRow label="Auth Provider"><p className="text-sm font-medium">{clerkEnabled ? "Clerk" : "Local Mode"}</p></SettingRow>
            <SettingRow label="Agents Managed"><p className="text-sm font-medium">{agents.length}</p></SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Agents</CardTitle>
              <a href="/agents" className="flex items-center gap-1 text-sm text-primary hover:underline">View all <ArrowRight className="h-3 w-3" /></a>
            </div>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No agents registered yet.</p>
            ) : (
              <div className="space-y-2">
                {agents.slice(0, 5).map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">{agent.name}</span>
                    </div>
                    <Badge variant={agent.status === "ACTIVE" ? "success" : "secondary"} className="text-[10px]">{agent.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Billing Tab ────────────────────────────────────────── */

function BillingTab({ orgId, usage, plans }: { orgId: string; usage: Usage | null; plans: Plan[] }) {
  const currentPlan = usage?.plan ?? "free";
  const actionsUsed = usage?.actions_this_month ?? 0;
  const actionsLimit = usage?.actions_limit;
  const usagePct = usage?.usage_percentage ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Plan</div>
            <Badge variant={currentPlan === "free" ? "outline" : "default"} className="text-[10px] capitalize">{currentPlan}</Badge>
          </div>
          <p className="text-2xl font-bold mt-2 capitalize">{currentPlan}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions This Month</div>
          <p className="text-2xl font-bold mt-2">{actionsUsed.toLocaleString()}</p>
          {actionsLimit && <p className="text-[11px] text-muted-foreground">of {actionsLimit.toLocaleString()} ({usagePct}%)</p>}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Evaluations</div>
          <p className="text-2xl font-bold mt-2">{(usage?.evaluations_this_month ?? 0).toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">this month</p>
        </CardContent></Card>
      </div>

      {actionsLimit && (
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Usage</span></div>
            <span className="text-sm text-muted-foreground">{actionsUsed.toLocaleString()} / {actionsLimit.toLocaleString()}</span>
          </div>
          <div className="h-3 rounded-full bg-muted">
            <div className={`h-3 rounded-full transition-all ${usagePct > 90 ? "bg-red-500" : usagePct > 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
          </div>
          {usagePct > 80 && <p className="text-xs text-amber-400 mt-2">Approaching plan limit. Consider upgrading.</p>}
        </CardContent></Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Available Plans</h2>
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
                  <CardDescription>{plan.price_usd === 0 ? "Free forever" : plan.price_usd ? `$${plan.price_usd}/month` : "Custom pricing"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <Button variant={plan.id === "pro" ? "default" : "outline"} size="sm" className="w-full" disabled={plan.id === "enterprise"}>
                      {plan.id === "enterprise" ? "Contact Sales" : <>Upgrade <ArrowRight className="h-3 w-3 ml-1" /></>}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Billing Information</CardTitle><CardDescription>{usage?.billing_email ? `Invoices sent to ${usage.billing_email}` : "No billing email configured"}</CardDescription></CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Organization</span><span className="font-mono text-xs">{orgId}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Current Period</span><span>{usage?.current_period ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="text-muted-foreground">Not configured</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── API Keys Tab ───────────────────────────────────────── */

function ApiKeysTab({ orgId, initialKeys }: { orgId: string; initialKeys: ApiKeyItem[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/api-keys`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: orgId, name: newKeyName }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.key);
        setShowKey(true);
        setNewKeyName("");
        setKeys((prev) => [{ id: data.id, name: data.name, keyPrefix: data.key_prefix, createdAt: new Date().toISOString(), revokedAt: null, lastUsedAt: null, expiresAt: null }, ...prev]);
      }
    } catch { } finally { setLoading(false); }
  }

  async function revokeKey(keyId: string) {
    try {
      await fetch(`${API_BASE_URL}/v1/api-keys/${keyId}`, { method: "DELETE" });
      setKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, revokedAt: new Date().toISOString() } : k));
    } catch { }
  }

  function copyKey() {
    if (createdKey) { navigator.clipboard.writeText(createdKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Create API Key</CardTitle><CardDescription>Keys authenticate SDK and API requests for this organization</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input placeholder="Key name (e.g. production, staging)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            <Button onClick={createKey} disabled={loading || !newKeyName.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </div>
          {createdKey && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-4">
              <p className="text-xs font-medium text-emerald-400 mb-2">Key created — save it now. It won&apos;t be shown again.</p>
              <div className="flex items-center gap-2 rounded bg-muted/50 p-3 font-mono text-xs">
                <code className="flex-1 break-all">{showKey ? createdKey : "gov_•••••••••••••••••••••••"}</code>
                <button onClick={() => setShowKey(!showKey)} className="text-muted-foreground hover:text-foreground">{showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                <button onClick={copyKey} className="text-muted-foreground hover:text-foreground">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active Keys ({activeKeys.length})</CardTitle></CardHeader>
        <CardContent>
          {activeKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">No active API keys. Create one above.</p>
              <Link href="/quickstart" className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                Go to Quickstart
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activeKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{k.name}</span>
                      <code className="text-xs text-muted-foreground font-mono">{k.keyPrefix}•••</code>
                      {k.framework && <Badge variant="outline" className="text-[9px]">{k.framework}</Badge>}
                    </div>
                    <div className="flex gap-4 mt-1 text-[11px] text-muted-foreground">
                      <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                      {k.lastUsedAt && <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => revokeKey(k.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-muted-foreground">Revoked Keys ({revokedKeys.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 opacity-60">
              {revokedKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 px-4 py-3">
                  <div>
                    <span className="text-sm font-medium line-through">{k.name}</span>
                    <code className="ml-2 text-xs text-muted-foreground font-mono">{k.keyPrefix}•••</code>
                  </div>
                  <Badge variant="destructive" className="text-[9px]">Revoked</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Shared Components ──────────────────────────────────── */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}>
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
      <span className="text-sm text-foreground">{label}</span>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color?: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color ?? "text-primary"}`} /><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p></div>
      <p className={`mt-1 text-2xl font-bold ${color ?? "text-foreground"}`}>{value}</p>
    </CardContent></Card>
  );
}
