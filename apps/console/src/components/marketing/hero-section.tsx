import Link from "next/link";
import type { Route } from "next";

export function HeroSection() {
    return (
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
            {/* Background grid */}
            <div className="absolute inset-0 grid-pattern opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-3xl" />

            <div className="relative mx-auto max-w-4xl px-6 text-center">
                {/* Badge */}
                <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
                    AI Governance Control Plane
                </div>

                {/* Headline */}
                <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                    Control What AI{" "}
                    <br className="hidden sm:block" />
                    Agents Can{" "}
                    <span className="text-gradient">Do.</span>
                </h1>

                {/* Subheadline */}
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                    Governor enforces policies, approvals, and risk controls before AI agents execute real-world tools.
                    One control plane for every agent framework.
                </p>

                {/* CTAs */}
                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                    <Link
                        href={"/sign-up" as Route}
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
                    >
                        Start Using Governor
                    </Link>
                    <Link
                        href={"/docs" as Route}
                        className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card/50 px-8 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-card"
                    >
                        View Documentation
                    </Link>
                </div>

                {/* Code preview */}
                <div className="mx-auto mt-16 max-w-xl rounded-xl border border-border bg-card/80 p-1 shadow-2xl shadow-black/20 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 px-4 pt-3 pb-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                        <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                        <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
                        <span className="ml-3 text-xs text-muted-foreground font-mono">agent.ts</span>
                    </div>
                    <pre className="overflow-x-auto px-4 pb-4 pt-1 text-left text-[13px] leading-relaxed font-mono">
                        <code>
                            <span className="text-muted-foreground">{"// Protect your agent in one line"}</span>{"\n"}
                            <span className="text-primary/80">const</span>{" "}
                            <span className="text-foreground">agent</span>{" "}
                            <span className="text-muted-foreground">=</span>{" "}
                            <span className="text-primary">protectAgent</span>
                            <span className="text-muted-foreground">{"({"}</span>{"\n"}
                            {"  "}
                            <span className="text-accent/90">{'"stripe.refund"'}</span>
                            <span className="text-muted-foreground">:</span>{" "}
                            <span className="text-foreground">issueRefund</span>
                            <span className="text-muted-foreground">,</span>{"\n"}
                            {"  "}
                            <span className="text-accent/90">{'"email.send"'}</span>
                            <span className="text-muted-foreground">:</span>{" "}
                            <span className="text-foreground">sendEmail</span>
                            <span className="text-muted-foreground">,</span>{"\n"}
                            {"  "}
                            <span className="text-accent/90">{'"shell.exec"'}</span>
                            <span className="text-muted-foreground">:</span>{" "}
                            <span className="text-foreground">runShell</span>
                            <span className="text-muted-foreground">,</span>{"\n"}
                            <span className="text-muted-foreground">{"});"}</span>{"\n\n"}
                            <span className="text-muted-foreground">{"// Every tool call is now governed"}</span>{"\n"}
                            <span className="text-primary/80">await</span>{" "}
                            <span className="text-foreground">agent</span>
                            <span className="text-muted-foreground">.</span>
                            <span className="text-primary">call</span>
                            <span className="text-muted-foreground">(</span>
                            <span className="text-accent/90">{'"stripe.refund"'}</span>
                            <span className="text-muted-foreground">,</span>{" "}
                            <span className="text-muted-foreground">{"{ "}</span>
                            <span className="text-foreground">amount</span>
                            <span className="text-muted-foreground">:</span>{" "}
                            <span className="text-primary/80">500</span>
                            <span className="text-muted-foreground">{" });"}</span>{"\n"}
                            <span className="text-success/80">{"// → REQUIRE_APPROVAL"}</span>
                        </code>
                    </pre>
                </div>
            </div>
        </section>
    );
}
