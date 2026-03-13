import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isClerkEnabled } from "@/lib/clerk";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function getHeaders() {
    const headers: Record<string, string> = {
        "content-type": "application/json"
    };

    if (isClerkEnabled) {
        const { getToken } = await auth();
        const token = await getToken();
        if (token) {
            headers.authorization = `Bearer ${token}`;
        }
    } else {
        const orgId = process.env.GOVERNOR_ORG_ID ?? "org_demo_1";
        headers["x-org-id"] = orgId;
        headers["x-user-id"] = "user_local";
    }

    return headers;
}

// GET /api/policies → GET /v1/policies
export async function GET() {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/v1/policies`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}

// POST /api/policies → POST /v1/policies/{subpath}
// Body must include { _action: "rules" | "thresholds" | "budgets" | "rate-limits" | "simulate", ...payload }
export async function POST(request: Request) {
    const body = await request.json();
    const { _action, ...payload } = body;

    const validActions = ["rules", "thresholds", "budgets", "rate-limits", "simulate"];
    if (!validActions.includes(_action)) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/v1/policies/${_action}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
