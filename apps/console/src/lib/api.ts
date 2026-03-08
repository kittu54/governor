export const API_BASE_URL = (() => {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return "https://api.governor.run";
  return "http://localhost:4000";
})();

/**
 * Get auth headers for client-side API calls.
 * Supports Supabase (browser client token) and local dev (x-org-id).
 * Clerk sessions are handled via cookies automatically.
 */
export async function getClientAuthHeaders(): Promise<Record<string, string>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (supabaseUrl && supabaseKey && supabaseUrl.startsWith("http")) {
    try {
      const { getSupabaseBrowserClient } = await import("./supabase-browser");
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return { authorization: `Bearer ${session.access_token}` };
      }
    } catch {
      // fall through
    }
  }

  return {};
}

/**
 * Authenticated fetch wrapper for client components.
 * Automatically adds auth headers (Supabase token, etc).
 */
export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
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
