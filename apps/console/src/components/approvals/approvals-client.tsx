"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRoundCog, CheckCircle, XCircle, Loader2, Search, Filter } from "lucide-react";

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
const STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "DENIED"] as const;

export function ApprovalsClient({ initialApprovals, orgId }: ApprovalsClientProps) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [loading, setLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ text: string; variant: "success" | "error" } | null>(null);

  const pendingCount = useMemo(() => approvals.filter((a) => a.status === "PENDING").length, [approvals]);
  const approvedCount = useMemo(() => approvals.filter((a) => a.status === "APPROVED").length, [approvals]);
  const deniedCount = useMemo(() => approvals.filter((a) => a.status === "DENIED").length, [approvals]);

  const filtered = useMemo(() => {
    return approvals.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.agentId.toLowerCase().includes(q) ||
          a.toolName.toLowerCase().includes(q) ||
          a.toolAction.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [approvals, statusFilter, search]);

  function showToast(text: string, variant: "success" | "error" = "success") {
    setToast({ text, variant });
    setTimeout(() => setToast(null), 3000);
  }

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
        showToast("Decision failed — try again", "error");
        return;
      }

      setApprovals((prev) =>
        prev.map((approval) =>
          approval.id === approvalId ? { ...approval, status: action === "APPROVE" ? "APPROVED" : "DENIED" } : approval
        )
      );
      showToast(`Request ${action === "APPROVE" ? "approved" : "denied"}`);
    } catch {
      showToast("Network error", "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 animate-in fade-in slide-in-from-top-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.variant === "error"
            ? "border-red-500/30 bg-red-950/80 text-red-300"
            : "border-emerald-500/30 bg-emerald-950/80 text-emerald-300"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className={statusFilter === "PENDING" ? "ring-1 ring-amber-500/50" : ""}>
          <CardContent className="cursor-pointer p-4" onClick={() => setStatusFilter(statusFilter === "PENDING" ? "ALL" : "PENDING")}>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === "APPROVED" ? "ring-1 ring-emerald-500/50" : ""}>
          <CardContent className="cursor-pointer p-4" onClick={() => setStatusFilter(statusFilter === "APPROVED" ? "ALL" : "APPROVED")}>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Approved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === "DENIED" ? "ring-1 ring-red-500/50" : ""}>
          <CardContent className="cursor-pointer p-4" onClick={() => setStatusFilter(statusFilter === "DENIED" ? "ALL" : "DENIED")}>
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

          {/* Filters */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by agent, tool, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</option>
                ))}
              </select>
            </div>
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <UserRoundCog className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {approvals.length === 0
                        ? "No approval requests yet. Approvals appear when tool calls exceed configured thresholds."
                        : "No approvals match your current filters."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell className="text-muted-foreground">{new Date(approval.requestedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Link href={`/agents/${approval.agentId}?org_id=${encodeURIComponent(orgId)}` as Route} className="font-mono text-xs text-primary hover:underline">
                        {approval.agentId}
                      </Link>
                    </TableCell>
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
                            {loading === approval.id
                              ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              : <CheckCircle className="mr-1 h-3.5 w-3.5" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => decide(approval.id, "DENY")}
                            disabled={loading === approval.id}
                          >
                            {loading === approval.id
                              ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              : <XCircle className="mr-1 h-3.5 w-3.5" />}
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
