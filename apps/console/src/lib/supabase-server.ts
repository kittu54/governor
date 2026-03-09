import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const hasSupabaseConfig = supabaseUrl.length > 0 && supabaseKey.length > 0 && supabaseUrl.startsWith("http");

/**
 * Creates a Supabase server client that can read/write cookies
 * for server-side auth in Next.js Server Components and Route Handlers.
 */
export async function getSupabaseServerClient() {
  if (!hasSupabaseConfig) {
    // Return a stub when Supabase is not configured
    return {
      auth: {
        async getSession() {
          return { data: { session: null }, error: null };
        },
        async getUser() {
          return { data: { user: null }, error: null };
        },
      },
    } as unknown as ReturnType<typeof createServerClient>;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll can throw in Server Components (read-only)
          // This is expected when called from a Server Component.
        }
      },
    },
  });
}
