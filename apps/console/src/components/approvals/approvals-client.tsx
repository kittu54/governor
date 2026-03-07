"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  const pendingCount = useMemo(() => approvals.filter((approval) => approval.status === "PENDING").length, [approvals]);

  async function decide(approvalId: string, action: "APPROVE" | "DENY") {
    setLoading(approvalId);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/approvals/decision`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
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
    <Card>
      <CardHeader>
        <CardTitle>Approvals Inbox</CardTitle>
        <p className="text-sm text-muted-foreground">Org: {orgId} • Pending: {pendingCount}</p>
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
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No approval requests yet. Approvals appear when tool calls exceed configured thresholds.
                </TableCell>
              </TableRow>
            ) : (
              approvals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell>{new Date(approval.requestedAt).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{approval.agentId}</TableCell>
                  <TableCell className="font-mono text-xs">{approval.toolName}.{approval.toolAction}</TableCell>
                  <TableCell>${approval.costEstimateUsd.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={approval.status === "PENDING" ? "secondary" : approval.status === "APPROVED" ? "default" : "destructive"}>
                      {approval.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => decide(approval.id, "APPROVE")}
                        disabled={approval.status !== "PENDING" || loading === approval.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => decide(approval.id, "DENY")}
                        disabled={approval.status !== "PENDING" || loading === approval.id}
                      >
                        Deny
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
