import { authMode } from "@/lib/clerk";
import { SupabaseSignUp } from "@/components/auth/supabase-auth";

export default async function Page() {
  if (authMode === "clerk") {
    const { SignUp } = await import("@clerk/nextjs");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SignUp />
      </div>
    );
  }

  if (authMode === "supabase") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SupabaseSignUp />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <p className="text-lg font-semibold">Auth is disabled in local mode.</p>
        <p className="text-sm text-muted-foreground">
          Set Clerk or Supabase environment variables to enable sign-up.
        </p>
      </div>
    </div>
  );
}
