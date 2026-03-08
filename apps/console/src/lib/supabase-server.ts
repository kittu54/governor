import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./runtime-config";

export async function getSupabaseServerClient() {
  const config = getSupabasePublicConfig("server");
  if (!config) {
    throw new Error("Supabase public configuration is missing or invalid.");
  }

  const cookieStore = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // setAll can be called from Server Components where cookies
            // are read-only. The middleware will handle refresh.
          }
        }
      },
    },
  });
}
