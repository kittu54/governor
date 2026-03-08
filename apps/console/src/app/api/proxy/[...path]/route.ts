import { NextRequest, NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/runtime-config";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ path: string[] }> };

function buildTargetUrl(path: string[], request: NextRequest): string {
  const url = new URL(request.url);
  const query = url.search;
  const apiBaseUrl = getApiBaseUrl("server");
  return `${apiBaseUrl}/v1/${path.join("/")}${query}`;
}

function forwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const auth = request.headers.get("authorization");
  if (auth) headers.authorization = auth;
  const govKey = request.headers.get("x-governor-key");
  if (govKey) headers["x-governor-key"] = govKey;
  const orgId = request.headers.get("x-org-id");
  if (orgId) headers["x-org-id"] = orgId;
  return headers;
}

async function forwardRequest(request: NextRequest, path: string[], method: string): Promise<NextResponse> {
  const targetUrl = buildTargetUrl(path, request);

  try {
    const body = method === "GET" || method === "DELETE" ? undefined : await request.text();
    const upstream = await fetch(targetUrl, {
      method,
      headers: forwardHeaders(request),
      body,
      cache: method === "GET" || method === "DELETE" ? "no-store" : undefined,
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[console] API proxy request failed", { method, targetUrl, error });
    return NextResponse.json(
      {
        error: "Upstream API request failed",
        target: targetUrl,
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return forwardRequest(request, path, "GET");
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return forwardRequest(request, path, "POST");
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return forwardRequest(request, path, "PUT");
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return forwardRequest(request, path, "DELETE");
}
