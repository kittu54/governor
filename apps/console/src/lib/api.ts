import { getApiBaseUrl, getSupabasePublicConfig } from "./runtime-config";

export const API_BASE_URL = getApiBaseUrl("client");

/**
 * Get auth headers for client-side API calls.
 * Supports Supabase (browser client token) and local dev (x-org-id).
 * Clerk sessions are handled via cookies automatically.
 */
export async function getClientAuthHeaders(): Promise<Record<string, string>> {
  const supabaseConfig = getSupabasePublicConfig("client");

  if (supabaseConfig) {
    try {
      const { getSupabaseBrowserClient } = await import("./supabase-browser");
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        return { authorization: `Bearer ${session.access_token}` };
      }
    } catch (error) {
      console.warn("[console] Failed to resolve Supabase browser session", error);
    }
  }

  return {};
}

/**
 * Authenticated fetch wrapper for client components.
 * Automatically adds auth headers (Supabase token, etc).
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const authHeaders = await getClientAuthHeaders();
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });
}
