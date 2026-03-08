"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

interface SupabaseUserLike {
  email?: string | null;
}

export function SupabaseUserMenu() {
  const [user, setUser] = useState<SupabaseUserLike | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function loadUser() {
      try {
        const result = await supabase.auth.getUser();
        setUser(result.data.user ?? null);
      } catch (error) {
        console.warn("[console] Failed to load Supabase user", error);
        setUser(null);
      }
    }

    void loadUser();
  }, []);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("[console] Supabase sign-out failed", error);
    }
    router.push("/sign-in" as Route);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {user && <span className="text-xs text-muted-foreground">{user.email}</span>}
      <button
        onClick={handleSignOut}
        className="rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
