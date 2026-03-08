import { isClerkEnabled, isSupabaseEnabled } from "./clerk";
import { API_BASE_URL } from "./api";

export { API_BASE_URL };

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Clerk auth
  if (isClerkEnabled) {
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const { getToken } = await auth();
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["authorization"] = `Bearer ${token}`;
      return headers;
    } catch {
      return {};
    }
  }

  // Supabase auth
  if (isSupabaseEnabled) {
    try {
      const { getSupabaseServerClient } = await import("./supabase-server");
      const supabase = await getSupabaseServerClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["authorization"] = `Bearer ${session.access_token}`;
      }
      return headers;
    } catch {
      return {};
    }
  }

  // Local mode fallback
  const orgId = process.env.GOVERNOR_ORG_ID;
  if (orgId) {
    return { "x-org-id": orgId };
  }
  return {};
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    ...init,
    headers: {
      "content-type": "application/json",
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
