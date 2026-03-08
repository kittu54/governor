import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Governor Control Tower",
  description: "AI Governance Control Tower for tool-using AI agents"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
