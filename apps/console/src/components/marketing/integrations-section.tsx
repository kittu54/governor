const integrations = [
    { name: "OpenAI", label: "GPT / Assistants API" },
    { name: "Anthropic", label: "Claude / Tool Use" },
    { name: "LangChain", label: "Agents & Tools" },
    { name: "MCP", label: "Model Context Protocol" },
    { name: "CrewAI", label: "Multi-Agent Crews" },
    { name: "Custom", label: "Any Framework" },
];

export function IntegrationsSection() {
    return (
        <section id="integrations" className="py-24 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary">Integrations</p>
                    <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                        Works With Every Agent Framework
                    </h2>
                    <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                        One governance layer for your entire AI stack. Install the SDK, wrap your tools, and Governor handles the rest.
                    </p>
                </div>

                <div className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {integrations.map((integration) => (
                        <div key={integration.name} className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 px-6 py-8 text-center transition-colors hover:border-primary/30 hover:bg-card">
                            <span className="text-lg font-bold text-foreground">{integration.name}</span>
                            <span className="mt-1 text-xs text-muted-foreground">{integration.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
