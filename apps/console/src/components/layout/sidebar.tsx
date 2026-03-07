"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { ShieldCheck, Activity, UserRoundCog, Building2, Bot, Scale, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/overview", label: "Overview", icon: Activity },
  { href: "/timeline", label: "Live Timeline", icon: ShieldCheck },
  { href: "/approvals", label: "Approvals", icon: UserRoundCog },
  { href: "/policy-studio", label: "Policy Studio", icon: Scale },
  { href: "/runs", label: "Run Explorer", icon: FileSearch },
  { href: "/tenants/org_demo_1", label: "Tenant Explorer", icon: Building2 },
  { href: "/agents/agent_support_1", label: "Agent Explorer", icon: Bot }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="grid-glow sticky top-0 hidden h-screen w-[260px] shrink-0 border-r bg-white/70 px-4 py-6 backdrop-blur lg:block">
      <div className="mb-8 px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Governor</p>
        <h1 className="mt-2 text-2xl font-semibold">Control Tower</h1>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-primary text-white" : "text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
