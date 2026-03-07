"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRoundCog, CheckCircle, XCircle } from "lucide-react";

interface ApprovalItem {
  id: string;
  orgId: string;
  agentId: string;
  userId?: string | null;
  toolName: string;
  toolAction: string;
  costEstimateUsd: number;
  status: "PENDING" | "APPROVED" | "DENIED";
  requestedAt: string;
}

interface ApprovalsClientProps {
  initialApprovals: ApprovalItem[];
  orgId: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export function ApprovalsClient({ initialApprovals, orgId }: ApprovalsClientProps) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [loading, setLoading] = useState<string | null>(null);

  const pendingCount = useMemo(() => approvals.filter((a) => a.status === "PENDING").length, [approvals]);
  const approvedCount = useMemo(() => approvals.filter((a) => a.status === "APPROVED").length, [approvals]);
  const deniedCount = useMemo(() => approvals.filter((a) => a.status === "DENIED").length, [approvals]);

  async function decide(approvalId: string, action: "APPROVE" | "DENY") {
    setLoading(approvalId);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/approvals/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          approval_id: approvalId,
          action,
          decided_by: "console_user"
        })
      });

      if (!response.ok) {
        throw new Error("Approval decision failed");
      }

      setApprovals((prev) =>
        prev.map((approval) =>
          approval.id === approvalId ? { ...approval, status: action === "APPROVE" ? "APPROVED" : "DENIED" } : approval
        )
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Approved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Denied</p>
            <p className="mt-1 text-2xl font-bold text-red-400">{deniedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Approvals Inbox</CardTitle>
              <CardDescription>Review and decide on tool call approval requests</CardDescription>
            </div>
            {pendingCount > 0 && (
              <Badge variant="warning">{pendingCount} pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <UserRoundCog className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No approval requests yet. Approvals appear when tool calls exceed configured thresholds.</p>
                  </TableCell>
                </TableRow>
              ) : (
                approvals.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell className="text-muted-foreground">{new Date(approval.requestedAt).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{approval.agentId}</TableCell>
                    <TableCell className="font-mono text-xs">{approval.toolName}.{approval.toolAction}</TableCell>
                    <TableCell className="font-mono">${approval.costEstimateUsd.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        approval.status === "PENDING" ? "warning" :
                        approval.status === "APPROVED" ? "success" : "destructive"
                      }>
                        {approval.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {approval.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => decide(approval.id, "APPROVE")}
                            disabled={loading === approval.id}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => decide(approval.id, "DENY")}
                            disabled={loading === approval.id}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Deny
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Decided</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
