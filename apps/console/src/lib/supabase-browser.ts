import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const hasSupabaseConfig = supabaseUrl.length > 0 && supabaseKey.length > 0 && supabaseUrl.startsWith("http");

let _client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a real Supabase browser client when env vars are set,
 * or a stub that returns friendly error messages when not configured.
 */
export function getSupabaseBrowserClient() {
  if (hasSupabaseConfig) {
    if (!_client) {
      _client = createBrowserClient(supabaseUrl, supabaseKey);
    }
    return _client;
  }

  // Fallback stub when Supabase is not configured
  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async signInWithPassword() {
        return { data: { user: null, session: null }, error: { message: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.", name: "AuthError", status: 500 } };
      },
      async signUp() {
        return { data: { user: null, session: null }, error: { message: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.", name: "AuthError", status: 500 } };
      },
      async signOut() {
        return { error: null };
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() { } } } };
      },
    },
  } as unknown as ReturnType<typeof createBrowserClient>;
}
