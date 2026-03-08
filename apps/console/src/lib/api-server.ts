import { isClerkEnabled, isSupabaseEnabled } from "./clerk";

export const API_BASE_URL = (() => {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return "https://agentgovernor.vercel.app";
  return "http://localhost:4000";
})();

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (isClerkEnabled) {
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { getToken } = await auth();
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers.authorization = `Bearer ${token}`;
      return headers;
    } catch (error) {
      console.warn("[console] Clerk auth header resolution failed", error);
      return {};
    }
  }

  if (isSupabaseEnabled) {
    try {
      const { getSupabaseServerClient } = await import("./supabase-server");
      const supabase = await getSupabaseServerClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.authorization = `Bearer ${session.access_token}`;
      }
      return headers;
    } catch (error) {
      console.warn("[console] Supabase auth header resolution failed", error);
      return {};
    }
  }

  const orgId = process.env.GOVERNOR_ORG_ID;
  if (orgId) {
    return { "x-org-id": orgId };
  }
  return {};
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...authHeaders,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error("[console] API request failed", { path, method: init.method ?? "GET", error });
    throw error;
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, {
    ...init,
    method: "GET",
  });
}

export async function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
}
