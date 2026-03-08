"use client";

import dynamic from "next/dynamic";

const OrganizationSwitcher = dynamic(() => import("@clerk/nextjs").then((mod) => mod.OrganizationSwitcher), {
  ssr: false,
});
const UserButton = dynamic(() => import("@clerk/nextjs").then((mod) => mod.UserButton), {
  ssr: false,
});
import { getClerkModeLabel, authMode } from "@/lib/clerk";
import { Badge } from "@/components/ui/badge";
import { SupabaseUserMenu } from "@/components/auth/supabase-user-menu";

export function Topbar() {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-5 py-3.5 shadow-lg shadow-black/5">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI Governance</p>
          <Badge variant="success" className="text-[10px]">Live</Badge>
        </div>
        <h2 className="text-xl font-semibold text-foreground">Operational Command Deck</h2>
      </div>
      <div className="flex items-center gap-3">
        {authMode === "clerk" ? (
          <>
            <OrganizationSwitcher
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "rounded-lg border border-border bg-muted px-3 py-2 text-foreground"
                }
              }}
              hidePersonal
            />
            <UserButton afterSignOutUrl="/sign-in" />
          </>
        ) : authMode === "supabase" ? (
          <SupabaseUserMenu />
        ) : (
          <div className="rounded-lg border border-border bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {getClerkModeLabel()}
          </div>
        )}
      </div>
    </header>
  );
}
