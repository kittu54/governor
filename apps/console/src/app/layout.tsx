import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/clerk";
import "./globals.css";

export const metadata: Metadata = {
  title: "Governor Control Tower",
  description: "AI Governance Control Tower for tool-using AI agents"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const document = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (!isClerkEnabled) {
    return document;
  }

  return (
    <ClerkProvider>
      {document}
    </ClerkProvider>
  );
}
