import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSupabaseEnabled } from "./lib/clerk";

export default function middleware(request: NextRequest) {
  // Supabase auth is handled client-side via the browser Supabase client.
  // Middleware is pass-through — protected pages redirect on the client via
  // session checks (see supabase-browser.ts).
  void request;
  void isSupabaseEnabled;
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
