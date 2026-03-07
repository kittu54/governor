const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const isClerkEnabled =
  publishableKey.length > 0 &&
  !publishableKey.includes("change_me") &&
  publishableKey.startsWith("pk_");

export function getClerkModeLabel() {
  return isClerkEnabled ? "Clerk Enabled" : "Local Mode";
}
