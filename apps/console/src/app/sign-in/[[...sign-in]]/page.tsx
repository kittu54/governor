import { SignIn } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/clerk";

export default function Page() {
  if (!isClerkEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Clerk is disabled in local mode.</p>
          <p className="text-sm text-muted-foreground">Set a valid NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable sign-in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
