import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isClerkEnabled } from "@/lib/clerk";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

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

    const response = await fetch(`${API_BASE_URL}/v1/api-keys/${id}`, {
        method: "DELETE",
        headers
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
