import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./runtime-config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const config = getSupabasePublicConfig("client");
  if (!config) {
    throw new Error("Supabase public configuration is missing or invalid.");
  }

  browserClient = createBrowserClient(config.url, config.anonKey);
  return browserClient;
}
