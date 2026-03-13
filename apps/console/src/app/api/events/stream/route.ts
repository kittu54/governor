import { auth } from "@clerk/nextjs/server";
import { isClerkEnabled } from "@/lib/clerk";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// SSE proxy: streams /v1/events/stream with auth headers to the client
export async function GET() {
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

    const upstream = await fetch(`${API_BASE_URL}/v1/events/stream`, {
        headers,
        cache: "no-store"
    });

    if (!upstream.ok || !upstream.body) {
        return new Response("Upstream stream unavailable", { status: 502 });
    }

    return new Response(upstream.body, {
        headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive"
        }
    });
}
