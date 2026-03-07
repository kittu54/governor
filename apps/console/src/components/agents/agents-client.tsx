"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Plus, X } from "lucide-react";

interface Agent {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
}

interface AgentsClientProps {
  initialAgents: Agent[];
  orgId: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export function AgentsClient({ initialAgents, orgId }: AgentsClientProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentId, setNewAgentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateAgent() {
    if (!newAgentName.trim() || !newAgentId.trim()) {
      setError("Both agent name and ID are required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/v1/ingest/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          run: {
            run_id: `register_${newAgentId.trim()}_${Date.now()}`,
            org_id: orgId,
            agent_id: newAgentId.trim(),
            agent_name: newAgentName.trim(),
            source: "CUSTOM",
            task_name: "agent_registration"
          },
          events: []
        })
      });

      if (!response.ok) {
        throw new Error("Failed to register agent");
      }

      setAgents((prev) => [
        ...prev,
        {
          id: newAgentId.trim(),
          orgId,
          name: newAgentName.trim(),
          createdAt: new Date().toISOString()
        }
      ]);

      setNewAgentName("");
      setNewAgentId("");
      setShowAddForm(false);
    } catch {
      setError("Failed to create agent. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Registered Agents</CardTitle>
            <CardDescription>All agents for this organization. Add new agents to start tracking them.</CardDescription>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
            {showAddForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showAddForm ? "Cancel" : "Add Agent"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Agent Form */}
        {showAddForm && (
          <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="mb-3 text-sm font-medium text-foreground">Register New Agent</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input
                  id="agent-name"
                  placeholder="e.g., code-review-bot"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-id">Agent ID</Label>
                <Input
                  id="agent-id"
                  placeholder="e.g., agent_code_review_01"
                  value={newAgentId}
                  onChange={(e) => setNewAgentId(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="mt-4 flex gap-2">
              <Button onClick={handleCreateAgent} disabled={creating} size="sm">
                {creating ? "Creating..." : "Register Agent"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Agents Table */}
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No agents found. Add an agent or ingest events to see agents here.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Agent ID</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => {
                const created = new Date(agent.createdAt);
                const isNew = (Date.now() - created.getTime()) < 7 * 24 * 60 * 60 * 1000;
                return (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="rounded-md bg-muted p-1.5">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{agent.id}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{agent.orgId}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {created.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {isNew ? (
                        <Badge variant="success">New</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/agents/${agent.id}` as Route} className="text-sm font-medium text-primary hover:underline">
                        Details
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
