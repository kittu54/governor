const features = [
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
        ),
        title: "Policy Engine",
        description: "Define rules controlling which tools agents can use, with conditions, priorities, and enforcement modes.",
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
        ),
        title: "Risk Classification",
        description: "Automatically classify every tool by risk level — from LOW_RISK reads to critical MONEY_MOVEMENT actions.",
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" />
            </svg>
        ),
        title: "Approval Workflows",
        description: "Require human approval for sensitive actions with multi-level chains, escalation, and SLA tracking.",
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        ),
        title: "Spend Limits",
        description: "Set daily, weekly, or monthly budgets per agent or org. Prevent runaway AI spending before it happens.",
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        ),
        title: "Audit Trails",
        description: "Every action is logged with decision trace, risk class, enforcement mode, and cryptographic hash chain.",
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
            </svg>
        ),
        title: "Framework Integrations",
        description: "Works with OpenAI, Anthropic, LangChain, MCP servers, and custom agent frameworks out of the box.",
    },
];

export function FeaturesGrid() {
    return (
        <section id="features" className="py-24 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary">Features</p>
                    <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                        Everything You Need to Govern AI Actions
                    </h2>
                </div>

                <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature) => (
                        <div key={feature.title} className="group rounded-xl border border-border bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-card">
                            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                                {feature.icon}
                            </div>
                            <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
