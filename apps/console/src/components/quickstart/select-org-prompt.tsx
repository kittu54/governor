"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Route } from "next";
import { authMode } from "@/lib/clerk";
import { Building2, ArrowRight } from "lucide-react";

const ClerkCreateOrg = dynamic(() =>
  import("@clerk/nextjs").then((mod) => mod.CreateOrganization),
  { ssr: false }
);

export function SelectOrgPrompt() {
  if (authMode === "local") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-xl">Set Up Your Organization</CardTitle>
            <CardDescription>
              Running in local mode. Set the <code className="text-primary">GOVERNOR_ORG_ID</code> environment variable to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 font-mono text-sm text-muted-foreground">
              <p># Add to your .env file</p>
              <p className="text-foreground">GOVERNOR_ORG_ID=org_dev</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Then restart the console to begin using Governor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authMode === "supabase") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-primary mb-4" />
            <CardTitle className="text-xl">Welcome to Governor</CardTitle>
            <CardDescription>
              Your organization has been automatically created.
              Generate an API key in Settings to start governing your AI agents.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Link
              href={"/settings" as Route}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Go to Settings <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-xl">Create Your Organization</CardTitle>
          <CardDescription>
            Create or select an organization to get started with Governor.
            Your organization will be automatically provisioned.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Suspense
            fallback={
              <Button disabled>
                Loading...
              </Button>
            }
          >
            <ClerkCreateOrg
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-card border-border shadow-none",
                },
              }}
              afterCreateOrganizationUrl="/quickstart"
            />
          </Suspense>
          <p className="text-xs text-muted-foreground text-center flex items-center gap-1">
            Already have an org? Use the org switcher in the top bar
            <ArrowRight className="h-3 w-3" />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
