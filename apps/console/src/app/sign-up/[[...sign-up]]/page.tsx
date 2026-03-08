import { SupabaseSignUp } from "@/components/auth/supabase-auth";
import { isSupabaseEnabled } from "@/lib/clerk";

export default function Page() {
  if (isSupabaseEnabled) {
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
          Set Supabase environment variables to enable sign-up.
        </p>
      </div>
    </div>
  );
}
