import type { Metadata } from "next";
import { isClerkEnabled } from "@/lib/clerk";
import "./globals.css";

export const metadata: Metadata = {
  title: "Governor Control Tower",
  description: "AI Governance Control Tower for tool-using AI agents"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const document = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (!isClerkEnabled) {
    return document;
  }

  const { ClerkProvider } = await import("@clerk/nextjs");

  return (
    <ClerkProvider>
      {document}
    </ClerkProvider>
  );
}
