import type { Metadata } from "next";
import { LandingNav } from "@/components/marketing/landing-nav";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { SolutionSection } from "@/components/marketing/solution-section";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { IntegrationsSection } from "@/components/marketing/integrations-section";
import { UseCases } from "@/components/marketing/use-cases";
import { CTASection } from "@/components/marketing/cta-section";
import { LandingFooter } from "@/components/marketing/landing-footer";

export const metadata: Metadata = {
  title: "Governor — Control Plane for AI Actions",
  description:
    "Governor enforces policies, approvals, and risk controls before AI agents execute real-world tools. One governance layer for every agent framework.",
  openGraph: {
    title: "Governor — Control Plane for AI Actions",
    description:
      "Enforce policies, approvals, and risk controls before AI agents execute real-world tools.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesGrid />
        <HowItWorks />
        <IntegrationsSection />
        <UseCases />
        <CTASection />
      </main>
      <LandingFooter />
    </>
  );
}
