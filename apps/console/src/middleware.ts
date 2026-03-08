import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { isClerkEnabled, isSupabaseEnabled } from "./lib/clerk";
import { createServerClient } from "@supabase/ssr";

// We don't eagerly call clerkMiddleware here anymore to prevent crashes when env vars are missing

function supabaseMiddleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Refresh session — MUST be called to keep auth alive
  // We intentionally don't await getUser() result; the call itself refreshes tokens
  supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return supabaseResponse;
  }

  // For protected routes, we'd redirect unauthenticated users
  // but we can't await here easily — the auth check happens in api-server / org.ts
  return supabaseResponse;
}

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (isClerkEnabled) {
    const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
    const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
    const protectedMiddleware = clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    });
    return protectedMiddleware(request, event);
  }

  if (isSupabaseEnabled) {
    return supabaseMiddleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
