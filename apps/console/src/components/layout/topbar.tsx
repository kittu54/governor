"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { getClerkModeLabel, isClerkEnabled } from "@/lib/clerk";

export function Topbar() {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI Governance</p>
        <h2 className="text-xl font-semibold">Operational Command Deck</h2>
      </div>
      <div className="flex items-center gap-3">
        {isClerkEnabled ? (
          <>
            <OrganizationSwitcher
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "rounded-md border px-3 py-2"
                }
              }}
              hidePersonal
            />
            <UserButton afterSignOutUrl="/sign-in" />
          </>
        ) : (
          <div className="rounded-md border bg-secondary px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em]">
            {getClerkModeLabel()}
          </div>
        )}
      </div>
    </header>
  );
}
