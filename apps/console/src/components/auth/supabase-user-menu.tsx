"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export function SupabaseUserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/sign-in" as Route);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {user && (
        <span className="text-xs text-muted-foreground">{user.email}</span>
      )}
      <button
        onClick={handleSignOut}
        className="rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
