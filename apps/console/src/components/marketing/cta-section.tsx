import Link from "next/link";
import type { Route } from "next";

export function CTASection() {
    return (
        <section className="relative overflow-hidden py-24 md:py-32">
            {/* Background glow */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-[400px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-3xl px-6 text-center">
                <h2 className="text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
                    Start Governing{" "}
                    <span className="text-gradient">AI Actions.</span>
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                    Protect your agents with policies, approvals, and risk controls.
                    Set up in minutes, not weeks.
                </p>

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
                        Read Documentation
                    </Link>
                </div>
            </div>
        </section>
    );
}
