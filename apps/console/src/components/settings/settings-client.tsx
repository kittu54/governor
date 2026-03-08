"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Database, Shield, Bell, Palette, Check } from "lucide-react";

interface SettingsClientProps {
  orgId: string;
  apiBaseUrl: string;
  clerkEnabled: boolean;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function SettingsClient({ orgId, apiBaseUrl, clerkEnabled }: SettingsClientProps) {
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
    } catch {}
  }, []);

  function persist(updates: Record<string, boolean>) {
    const current = { liveTimeline, sseStreaming, autoRefresh, ...updates };
    localStorage.setItem("governor_settings", JSON.stringify(current));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">System configuration and preferences</p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 animate-in fade-in">
            <Check className="h-4 w-4" /> Saved
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* API Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <CardTitle>API Configuration</CardTitle>
            </div>
            <CardDescription>Backend API connection settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <SettingRow label="API Base URL">
                <p className="font-mono text-sm text-foreground">{apiBaseUrl}</p>
              </SettingRow>
              <SettingRow label="Organization">
                <p className="font-mono text-sm text-foreground">{orgId}</p>
              </SettingRow>
              <SettingRow label="Status">
                <Badge variant="success">Connected</Badge>
              </SettingRow>
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Authentication</CardTitle>
            </div>
            <CardDescription>Authentication provider settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <SettingRow label="Provider">
                <p className="text-sm font-medium text-foreground">{clerkEnabled ? "Clerk" : "Local / Demo Mode"}</p>
              </SettingRow>
              <SettingRow label="Status">
                <Badge variant={clerkEnabled ? "success" : "warning"}>
                  {clerkEnabled ? "Enabled" : "Demo Mode"}
                </Badge>
              </SettingRow>
              {!clerkEnabled && (
                <p className="text-xs text-muted-foreground">
                  Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable authentication.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Interface theme and display preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm text-foreground">Theme</span>
                <Badge variant="secondary">Dark</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm text-foreground">Accent Color</span>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">Cyan</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Event streaming and alert preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm text-foreground">Live Timeline</span>
                <Toggle checked={liveTimeline} onChange={(v) => { setLiveTimeline(v); persist({ liveTimeline: v }); }} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm text-foreground">SSE Streaming</span>
                <Toggle checked={sseStreaming} onChange={(v) => { setSseStreaming(v); persist({ sseStreaming: v }); }} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm text-foreground">Auto-refresh</span>
                <Toggle checked={autoRefresh} onChange={(v) => { setAutoRefresh(v); persist({ autoRefresh: v }); }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <CardTitle>System Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <SettingRow label="Framework">
              <p className="text-sm font-medium text-foreground">Next.js 15</p>
            </SettingRow>
            <SettingRow label="UI Library">
              <p className="text-sm font-medium text-foreground">shadcn/ui</p>
            </SettingRow>
            <SettingRow label="Charts">
              <p className="text-sm font-medium text-foreground">Recharts</p>
            </SettingRow>
          </div>
        </CardContent>
      </Card>
    </div>
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
