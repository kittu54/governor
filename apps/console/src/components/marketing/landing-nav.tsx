"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";

export function LandingNav() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                {/* Logo */}
                <Link href={"/" as Route} className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <span className="text-lg font-semibold text-foreground">Governor</span>
                </Link>

                {/* Desktop links */}
                <div className="hidden items-center gap-8 md:flex">
                    <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Features</a>
                    <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">How It Works</a>
                    <a href="#integrations" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Integrations</a>
                    <a href="#use-cases" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Use Cases</a>
                </div>

                {/* CTAs */}
                <div className="hidden items-center gap-3 md:flex">
                    <Link href={"/sign-in" as Route} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                        Sign In
                    </Link>
                    <Link href={"/sign-up" as Route} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                        Get Started
                    </Link>
                </div>

                {/* Mobile menu button */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border md:hidden"
                    aria-label="Toggle menu"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-foreground">
                        {mobileOpen ? (
                            <>
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </>
                        ) : (
                            <>
                                <line x1="4" y1="8" x2="20" y2="8" />
                                <line x1="4" y1="16" x2="20" y2="16" />
                            </>
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="border-t border-border bg-background px-6 py-4 md:hidden">
                    <div className="flex flex-col gap-3">
                        <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground">Features</a>
                        <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground">How It Works</a>
                        <a href="#integrations" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground">Integrations</a>
                        <a href="#use-cases" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground">Use Cases</a>
                        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                            <Link href={"/sign-in" as Route} className="text-sm font-medium text-muted-foreground">Sign In</Link>
                            <Link href={"/sign-up" as Route} className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Get Started</Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
