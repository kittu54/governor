import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { isClerkEnabled, isSupabaseEnabled } from "./lib/clerk";

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  try {
    if (isClerkEnabled) {
      const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
      const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
      const protectedMiddleware = clerkMiddleware(async (auth, req) => {
        if (!isPublicRoute(req)) {
          await auth.protect();
        }
      });
      const res = await protectedMiddleware(request, event);
      if (res) return res;
    }

    if (isSupabaseEnabled) {
      // Supabase auth is handled client-side in this deployment profile.
      // Keep middleware pass-through to avoid edge/runtime package incompatibilities.
      return NextResponse.next();
    }
  } catch (error) {
    console.error("[console] Middleware runtime failure", error);
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
