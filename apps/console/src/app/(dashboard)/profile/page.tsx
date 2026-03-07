import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveOrgId } from "@/lib/org";
import { User, Shield, Building2, Key, Clock } from "lucide-react";

export default async function ProfilePage() {
  const orgId = await resolveOrgId();

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Console User</h1>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Governor Control Tower Administrator</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Badge variant="secondary">
                  <Shield className="mr-1 h-3 w-3" />
                  Admin
                </Badge>
                <Badge variant="secondary">
                  <Building2 className="mr-1 h-3 w-3" />
                  {orgId}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Account Details</CardTitle>
            </div>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="text-sm font-medium text-foreground">Administrator</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">Organization</span>
                <span className="text-sm font-mono font-medium text-foreground">{orgId}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">Auth Provider</span>
                <span className="text-sm font-medium text-foreground">
                  {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "Clerk" : "Local Mode"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Permissions</CardTitle>
            </div>
            <CardDescription>Your access level and capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "View Dashboard", granted: true },
                { label: "Manage Policies", granted: true },
                { label: "Approve/Deny Requests", granted: true },
                { label: "Register Agents", granted: true },
                { label: "View Audit Logs", granted: true },
                { label: "Manage Organization", granted: true }
              ].map((perm) => (
                <div key={perm.label} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2.5">
                  <span className="text-sm text-foreground">{perm.label}</span>
                  <Badge variant={perm.granted ? "success" : "destructive"}>
                    {perm.granted ? "Granted" : "Denied"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Recent Activity</CardTitle>
          </div>
          <CardDescription>Your recent actions in the control tower</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <div className="flex-1">
                <p className="text-sm text-foreground">Logged into Control Tower</p>
                <p className="text-xs text-muted-foreground">Current session</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
