import { NextRequest } from "next/server";

import { API_BASE_URL } from "@/lib/api";

function buildTargetUrl(path: string[], request: NextRequest): string {
  const url = new URL(request.url);
  const query = url.search;
  return `${API_BASE_URL}/v1/${path.join("/")}${query}`;
}

function forwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const auth = request.headers.get("authorization");
  if (auth) headers["authorization"] = auth;
  const govKey = request.headers.get("x-governor-key");
  if (govKey) headers["x-governor-key"] = govKey;
  const orgId = request.headers.get("x-org-id");
  if (orgId) headers["x-org-id"] = orgId;
  return headers;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const response = await fetch(buildTargetUrl(path, request), {
    method: "GET",
    headers: forwardHeaders(request),
    cache: "no-store"
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json"
    }
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const body = await request.text();

  const response = await fetch(buildTargetUrl(path, request), {
    method: "POST",
    headers: forwardHeaders(request),
    body
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json"
    }
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const body = await request.text();

  const response = await fetch(buildTargetUrl(path, request), {
    method: "PUT",
    headers: forwardHeaders(request),
    body
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json"
    }
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;

  const response = await fetch(buildTargetUrl(path, request), {
    method: "DELETE",
    headers: forwardHeaders(request),
    cache: "no-store"
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json"
    }
  });
}
