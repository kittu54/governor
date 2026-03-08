import { NextRequest } from "next/server";

import { API_BASE_URL } from "@/lib/api-server";

function buildTargetUrl(path: string[], request: NextRequest): string {
  const url = new URL(request.url);
  const query = url.search;
  return `${API_BASE_URL}/v1/${path.join("/")}${query}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const response = await fetch(buildTargetUrl(path, request), {
    method: "GET",
    headers: {
      "content-type": "application/json"
    },
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
    headers: {
      "content-type": "application/json"
    },
    body
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json"
    }
  });
}
