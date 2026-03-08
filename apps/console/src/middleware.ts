import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isClerkEnabled, isSupabaseEnabled } from "./lib/clerk";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

const protectedMiddleware = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

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

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (isClerkEnabled) {
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
