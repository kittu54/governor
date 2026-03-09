const useCases = [
    {
        title: "AI Customer Support",
        description: "Prevent agents from sending emails, issuing refunds, or modifying accounts without policy checks and approval workflows.",
        tags: ["EXTERNAL_COMMUNICATION", "MONEY_MOVEMENT"],
        decision: "REQUIRE APPROVAL",
        decisionColor: "text-yellow-400",
    },
    {
        title: "Finance Operations",
        description: "Enforce spend limits on payment processing agents. Require human approval before agents move money above thresholds.",
        tags: ["MONEY_MOVEMENT", "ADMIN_ACTION"],
        decision: "DENY > $500",
        decisionColor: "text-red-400",
    },
    {
        title: "Internal Copilots",
        description: "Control which databases, APIs, and internal systems your AI assistants can access. Block code execution and credential access.",
        tags: ["CODE_EXECUTION", "CREDENTIAL_USE"],
        decision: "ALLOW + AUDIT",
        decisionColor: "text-green-400",
    },
];

export function UseCases() {
    return (
        <section id="use-cases" className="border-y border-border bg-card/30 py-24 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary">Use Cases</p>
                    <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                        Governance for Every AI Workflow
                    </h2>
                </div>

                <div className="mt-16 grid gap-5 md:grid-cols-3">
                    {useCases.map((uc) => (
                        <div key={uc.title} className="flex flex-col rounded-xl border border-border bg-card/50 p-6">
                            <h3 className="text-base font-semibold text-foreground">{uc.title}</h3>
                            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{uc.description}</p>
                            <div className="mt-5 flex flex-wrap items-center gap-2">
                                {uc.tags.map((tag) => (
                                    <span key={tag} className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">{tag}</span>
                                ))}
                                <span className={`ml-auto text-xs font-bold font-mono ${uc.decisionColor}`}>{uc.decision}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
