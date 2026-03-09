const steps = [
    {
        number: "01",
        title: "Connect Your Agents",
        description: "Install the Governor SDK and wrap your tools with a single function call. Works with any framework — OpenAI, LangChain, MCP, or custom agents.",
        code: `import { protectAgent } from "@governor/sdk";\n\nconst agent = protectAgent({\n  "stripe.refund": issueRefund,\n  "email.send": sendEmail,\n});`,
    },
    {
        number: "02",
        title: "Define Policies",
        description: "Create rules for risk classes, approval thresholds, budget limits, and rate controls. Or start with zero-config defaults that protect immediately.",
        code: `// Zero-config defaults:\n// CODE_EXECUTION  → DENY\n// MONEY_MOVEMENT  → REQUIRE APPROVAL\n// DATA_WRITE      → ALLOW + AUDIT\n// LOW_RISK        → ALLOW + AUDIT`,
    },
    {
        number: "03",
        title: "Govern Every Action",
        description: "Governor evaluates each tool call in real time — classifying risk, checking policies, enforcing budgets, and logging the decision with a full audit trace.",
        code: `await agent.call("stripe.refund", {\n  amount: 500,\n  charge_id: "ch_abc",\n});\n// → REQUIRE_APPROVAL (> $200 threshold)`,
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="border-y border-border bg-card/30 py-24 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary">How It Works</p>
                    <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                        Three Steps to AI Governance
                    </h2>
                </div>

                <div className="mt-16 space-y-6">
                    {steps.map((step) => (
                        <div key={step.number} className="grid gap-6 rounded-xl border border-border bg-card/50 p-6 md:grid-cols-2 md:p-8">
                            <div className="flex flex-col justify-center">
                                <span className="text-sm font-bold font-mono text-primary">{step.number}</span>
                                <h3 className="mt-2 text-xl font-bold text-foreground">{step.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-background/80 p-4">
                                <pre className="overflow-x-auto text-[13px] leading-relaxed font-mono text-muted-foreground">
                                    <code>{step.code}</code>
                                </pre>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
