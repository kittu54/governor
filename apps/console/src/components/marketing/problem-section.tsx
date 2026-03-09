const risks = [
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
        title: "Security Risk",
        description: "Agents can execute shell commands, access credentials, and modify infrastructure without oversight.",
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        ),
        title: "Compliance Risk",
        description: "No audit trail, no approval workflows, no way to prove governance over AI-driven actions.",
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        ),
        title: "Financial Risk",
        description: "Uncontrolled agent spending — refunds, transfers, and API costs with no budget limits.",
    },
    {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
        ),
        title: "Operational Risk",
        description: "Agents sending emails, deleting records, and modifying systems with no human in the loop.",
    },
];

export function ProblemSection() {
    return (
        <section className="py-24 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                {/* Section header */}
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary">The Problem</p>
                    <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                        AI Agents Act Without Governance
                    </h2>
                    <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                        Agents can now send emails, move money, export data, modify systems, and execute code.
                        Most companies have <span className="text-foreground font-medium">no control layer</span> between the AI and these real-world actions.
                    </p>
                </div>

                {/* Risk grid */}
                <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {risks.map((risk) => (
                        <div key={risk.title} className="rounded-xl border border-border bg-card/50 p-6 transition-colors hover:bg-card">
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                {risk.icon}
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">{risk.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{risk.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
