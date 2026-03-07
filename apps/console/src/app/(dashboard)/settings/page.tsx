import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveOrgId } from "@/lib/org";
import { Settings, Globe, Database, Shield, Bell, Palette } from "lucide-react";

export default async function SettingsPage() {
  const orgId = await resolveOrgId();

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration and preferences</p>
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
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">API Base URL</p>
                <p className="mt-1 font-mono text-sm text-foreground">{apiBaseUrl}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Organization</p>
                <p className="mt-1 font-mono text-sm text-foreground">{orgId}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</p>
                <Badge variant="success" className="mt-1">Connected</Badge>
              </div>
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
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Provider</p>
                <p className="mt-1 text-sm font-medium text-foreground">{clerkEnabled ? "Clerk" : "Local / Demo Mode"}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</p>
                <Badge variant={clerkEnabled ? "success" : "warning"} className="mt-1">
                  {clerkEnabled ? "Enabled" : "Demo Mode"}
                </Badge>
              </div>
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
                <Badge variant="success">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm text-foreground">SSE Streaming</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm text-foreground">Auto-refresh</span>
                <Badge variant="success">On</Badge>
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
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Framework</p>
              <p className="mt-1 text-sm font-medium text-foreground">Next.js 15</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">UI Library</p>
              <p className="mt-1 text-sm font-medium text-foreground">shadcn/ui</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Charts</p>
              <p className="mt-1 text-sm font-medium text-foreground">Recharts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
