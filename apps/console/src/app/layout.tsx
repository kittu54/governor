import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Governor — Control Plane for AI Actions",
  description: "Governor enforces policies, approvals, and risk controls before AI agents execute real-world tools.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
