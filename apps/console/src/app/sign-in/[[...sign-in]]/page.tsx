import { SignIn } from "@clerk/nextjs";
import { authMode } from "@/lib/clerk";
import { SupabaseSignIn } from "@/components/auth/supabase-auth";

export default function Page() {
  if (authMode === "clerk") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SignIn />
      </div>
    );
  }

  if (authMode === "supabase") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SupabaseSignIn />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <p className="text-lg font-semibold">Auth is disabled in local mode.</p>
        <p className="text-sm text-muted-foreground">
          Set Clerk or Supabase environment variables to enable sign-in.
        </p>
      </div>
    </div>
  );
}
