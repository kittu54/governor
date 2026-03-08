import { getSupabasePublicConfig } from "./runtime-config";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const isClerkEnabled =
  publishableKey.length > 0 &&
  !publishableKey.includes("change_me") &&
  publishableKey.startsWith("pk_");

export const isSupabaseEnabled = !!getSupabasePublicConfig("server");

/** Auth mode: "clerk" | "supabase" | "local" */
export const authMode: "clerk" | "supabase" | "local" = isClerkEnabled
  ? "clerk"
  : isSupabaseEnabled
    ? "supabase"
    : "local";

export function getClerkModeLabel() {
  if (isClerkEnabled) return "Clerk Enabled";
  if (isSupabaseEnabled) return "Supabase Auth";
  return "Local Mode";
}
