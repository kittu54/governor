const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const isClerkEnabled =
  publishableKey.length > 0 &&
  !publishableKey.includes("change_me") &&
  publishableKey.startsWith("pk_");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseEnabled =
  supabaseUrl.length > 0 &&
  supabaseKey.length > 0 &&
  supabaseUrl.startsWith("http");

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
