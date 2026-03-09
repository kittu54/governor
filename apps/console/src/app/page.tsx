import { redirect } from "next/navigation";

export default function HomePage() {
  // No marketing page — send users straight to sign-in.
  // Authenticated users will be caught by middleware and sent to /overview.
  redirect("/sign-in");
}
