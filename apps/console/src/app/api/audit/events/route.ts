import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isClerkEnabled } from "@/lib/clerk";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// GET /api/audit/events?limit=100&agent_id=x&tool_name=y
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const headers: Record<string, string> = {};

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

    // Forward query params (minus org_id which is handled by auth)
    searchParams.delete("org_id");
    const qs = searchParams.toString();

    const response = await fetch(`${API_BASE_URL}/v1/audit/events${qs ? `?${qs}` : ""}`, {
        headers,
        cache: "no-store"
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
