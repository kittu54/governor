"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  ShieldCheck, Activity, UserRoundCog, Bot, Scale, FileSearch,
  Menu, X, Settings, Plug, Shield, ScrollText, Server, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Monitor",
    items: [
      { href: "/overview", label: "Overview", icon: Activity },
      { href: "/runs", label: "Run Explorer", icon: FileSearch },
      { href: "/audit", label: "Audit Log", icon: ScrollText },
    ],
  },
  {
    title: "Govern",
    items: [
      { href: "/policy-studio", label: "Policy Studio", icon: Scale },
      { href: "/approvals", label: "Approvals", icon: UserRoundCog },
      { href: "/agents", label: "Agents", icon: Bot },
      { href: "/tools", label: "Tool Registry", icon: Shield },
    ],
  },
  {
    title: "Connect",
    items: [
      { href: "/mcp", label: "MCP Servers", icon: Server },
      { href: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href as Route}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
        active
          ? "bg-primary/15 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="mb-6 px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Governor
            </p>
            <h1 className="text-base font-semibold leading-tight text-foreground">
              Control Tower
            </h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/60 pt-3 space-y-0.5">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-lg border border-border bg-card p-2 shadow-lg lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[240px] border-r border-border/60 bg-card px-3 py-5 transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {navContent}
      </aside>

      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 border-r border-border/60 bg-card px-3 py-5 lg:block">
        {navContent}
      </aside>
    </>
  );
}
