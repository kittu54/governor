"use client";

import { useState } from "react";

export function QuickstartActions() {
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [result, setResult] = useState<{ decision: string; request_id: string } | null>(null);

    const sendTestAction = async () => {
        setStatus("loading");
        try {
            const response = await fetch("/api/gateway-check", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    tool_name: "http",
                    tool_action: "GET",
                    cost_estimate_usd: 0.01
                })
            });

            if (!response.ok) {
                throw new Error(`Failed: ${response.status}`);
            }

            const data = await response.json();
            setResult(data);
            setStatus("success");
        } catch {
            setStatus("error");
        }
    };

    return (
        <div className="space-y-2">
            <button
                onClick={sendTestAction}
                disabled={status === "loading"}
                className="inline-flex items-center rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-accent/90 disabled:opacity-50"
            >
                {status === "loading" ? "Sending…" : "🚀 Send Test Action"}
            </button>

            {status === "success" && result && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs">
                    <p className="font-medium text-green-800">✓ Action governed successfully!</p>
                    <p className="text-green-700 mt-1">
                        Decision: <span className="font-mono font-bold">{result.decision}</span>
                    </p>
                    <p className="text-green-600 mt-0.5 font-mono text-[10px]">
                        ID: {result.request_id}
                    </p>
                    <a
                        href="/timeline"
                        className="mt-1 inline-block text-green-800 underline underline-offset-2"
                    >
                        View in Timeline →
                    </a>
                </div>
            )}

            {status === "error" && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    Failed to send test action. Make sure the API is running and you have an API key configured.
                </div>
            )}
        </div>
    );
}
