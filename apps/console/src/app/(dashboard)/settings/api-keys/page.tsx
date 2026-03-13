"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ApiKeyItem {
    id: string;
    label: string;
    prefix: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
    createdAt: string;
    createdBy: string | null;
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKeyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyLabel, setNewKeyLabel] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const loadKeys = useCallback(async () => {
        try {
            const res = await fetch("/api/api-keys");
            const data = await res.json();
            setKeys(data.api_keys ?? []);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadKeys();
    }, [loadKeys]);

    const createKey = async () => {
        if (!newKeyLabel.trim()) return;
        setCreating(true);
        try {
            const res = await fetch("/api/api-keys", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ label: newKeyLabel.trim() })
            });
            const data = await res.json();
            if (data.key) {
                setCreatedKey(data.key);
                setNewKeyLabel("");
                loadKeys();
            }
        } catch {
            // ignore
        } finally {
            setCreating(false);
        }
    };

    const revokeKey = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) return;
        try {
            await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
            loadKeys();
        } catch {
            // ignore
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const activeKeys = keys.filter((k) => !k.revokedAt);
    const revokedKeys = keys.filter((k) => k.revokedAt);

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">API Keys</h1>
                    <p className="text-muted-foreground mt-1">Manage API keys for authenticating SDK and API requests.</p>
                </div>
                <button
                    onClick={() => { setShowCreate(true); setCreatedKey(null); }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                    + Create Key
                </button>
            </div>

            {/* Create key modal */}
            {showCreate && (
                <Card className="border-primary/30 border-2">
                    <CardContent className="py-4 space-y-3">
                        {createdKey ? (
                            <div className="space-y-3">
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                    <p className="text-xs font-semibold text-amber-800">⚠️ Copy this key now — it will not be shown again!</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 rounded-lg bg-[#1a2e35] px-3 py-2 text-xs text-green-300 font-mono break-all">
                                        {createdKey}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(createdKey)}
                                        className="shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary"
                                    >
                                        {copied ? "✓ Copied" : "Copy"}
                                    </button>
                                </div>
                                <button
                                    onClick={() => { setShowCreate(false); setCreatedKey(null); }}
                                    className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm font-medium">Create a new API key</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newKeyLabel}
                                        onChange={(e) => setNewKeyLabel(e.target.value)}
                                        placeholder="Key label (e.g. Production, CI/CD)"
                                        className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        onKeyDown={(e) => e.key === "Enter" && createKey()}
                                    />
                                    <button
                                        onClick={createKey}
                                        disabled={creating || !newKeyLabel.trim()}
                                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {creating ? "Creating…" : "Create"}
                                    </button>
                                    <button
                                        onClick={() => setShowCreate(false)}
                                        className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Active keys */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Active Keys</CardTitle>
                    <CardDescription>
                        {activeKeys.length === 0 ? "No active keys" : `${activeKeys.length} key${activeKeys.length !== 1 ? "s" : ""}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : activeKeys.length === 0 ? (
                        <div className="text-center py-6">
                            <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {activeKeys.map((key) => (
                                <div key={key.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{key.label}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <code className="font-mono bg-secondary px-1.5 py-0.5 rounded">{key.prefix}…</code>
                                            <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                                            {key.lastUsedAt && (
                                                <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => revokeKey(key.id)}
                                        className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                                    >
                                        Revoke
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Revoked keys */}
            {revokedKeys.length > 0 && (
                <Card className="opacity-60">
                    <CardHeader>
                        <CardTitle className="text-lg">Revoked Keys</CardTitle>
                        <CardDescription>{revokedKeys.length} revoked</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {revokedKeys.map((key) => (
                                <div key={key.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                                    <div>
                                        <p className="font-medium text-sm line-through">{key.label}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <code className="font-mono bg-secondary px-1.5 py-0.5 rounded">{key.prefix}…</code>
                                            <span>Revoked {key.revokedAt ? new Date(key.revokedAt).toLocaleDateString() : ""}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
