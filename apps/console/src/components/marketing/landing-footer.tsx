import Link from "next/link";
import type { Route } from "next";

const links = {
    product: [
        { label: "Features", href: "#features" },
        { label: "How It Works", href: "#how-it-works" },
        { label: "Integrations", href: "#integrations" },
        { label: "Use Cases", href: "#use-cases" },
    ],
    resources: [
        { label: "Documentation", href: "/docs" },
        { label: "GitHub", href: "https://github.com/kittu54/governor" },
        { label: "API Reference", href: "/docs" },
        { label: "SDK", href: "https://github.com/kittu54/governor/tree/main/packages/sdk" },
    ],
    company: [
        { label: "Security", href: "#" },
        { label: "Privacy", href: "#" },
        { label: "Terms", href: "#" },
        { label: "Contact", href: "#" },
    ],
};

export function LandingFooter() {
    return (
        <footer className="border-t border-border bg-card/30">
            <div className="mx-auto max-w-6xl px-6 py-16">
                <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
                    {/* Brand */}
                    <div>
                        <Link href={"/" as Route} className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <span className="text-base font-semibold text-foreground">Governor</span>
                        </Link>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            The control plane for AI actions.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="mb-4 text-sm font-semibold text-foreground">Product</h4>
                        <ul className="space-y-2.5">
                            {links.product.map((link) => (
                                <li key={link.label}>
                                    <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="mb-4 text-sm font-semibold text-foreground">Resources</h4>
                        <ul className="space-y-2.5">
                            {links.resources.map((link) => (
                                <li key={link.label}>
                                    <a href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="mb-4 text-sm font-semibold text-foreground">Company</h4>
                        <ul className="space-y-2.5">
                            {links.company.map((link) => (
                                <li key={link.label}>
                                    <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-12 border-t border-border pt-6 text-center">
                    <p className="text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Governor. Open-source AI governance.
                    </p>
                </div>
            </div>
        </footer>
    );
}
