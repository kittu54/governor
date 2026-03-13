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

export async function GET() {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/v1/api-keys`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}

export async function POST(request: Request) {
    const body = await request.json();
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE_URL}/v1/api-keys`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
