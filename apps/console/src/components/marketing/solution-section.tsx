const decisions = [
    { label: "ALLOW", color: "text-green-400 bg-green-400/10 border-green-400/20", description: "Action is safe to execute" },
    { label: "DENY", color: "text-red-400 bg-red-400/10 border-red-400/20", description: "Action is blocked by policy" },
    { label: "REQUIRE APPROVAL", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", description: "Human review needed first" },
];

export function SolutionSection() {
    return (
        <section className="border-y border-border bg-card/30 py-24 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary">The Solution</p>
                    <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                        A Control Plane Between Agents and Actions
                    </h2>
                    <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                        Governor evaluates every tool call before execution — checking policies, risk classification,
                        budgets, rate limits, and approval requirements.
                    </p>
                </div>

                {/* Flow diagram */}
                <div className="mt-16 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-0">
                    {/* Agent */}
                    <div className="flex h-20 w-48 items-center justify-center rounded-xl border border-border bg-card text-center">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Agent</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">Tool Call</p>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center sm:px-2">
                        <svg width="40" height="20" viewBox="0 0 40 20" className="hidden text-muted-foreground sm:block">
                            <line x1="0" y1="10" x2="32" y2="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                            <polyline points="30,5 37,10 30,15" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <svg width="20" height="40" viewBox="0 0 20 40" className="text-muted-foreground sm:hidden">
                            <line x1="10" y1="0" x2="10" y2="32" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                            <polyline points="5,30 10,37 15,30" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                    </div>

                    {/* Governor */}
                    <div className="flex h-20 w-48 items-center justify-center rounded-xl border-2 border-primary/40 bg-primary/5 text-center glow-primary">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-primary">Governor</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">Evaluate</p>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center sm:px-2">
                        <svg width="40" height="20" viewBox="0 0 40 20" className="hidden text-muted-foreground sm:block">
                            <line x1="0" y1="10" x2="32" y2="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                            <polyline points="30,5 37,10 30,15" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <svg width="20" height="40" viewBox="0 0 20 40" className="text-muted-foreground sm:hidden">
                            <line x1="10" y1="0" x2="10" y2="32" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                            <polyline points="5,30 10,37 15,30" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                    </div>

                    {/* Decision */}
                    <div className="flex h-20 w-48 items-center justify-center rounded-xl border border-border bg-card text-center">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Decision</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">Execute or Block</p>
                        </div>
                    </div>
                </div>

                {/* Decision outcomes */}
                <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
                    {decisions.map((d) => (
                        <div key={d.label} className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 ${d.color}`}>
                            <span className="text-xs font-bold font-mono tracking-wider">{d.label}</span>
                            <span className="hidden text-xs opacity-70 sm:inline">— {d.description}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
