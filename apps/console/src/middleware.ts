import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { isClerkEnabled, isSupabaseEnabled } from "./lib/clerk";

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  try {
    // 1. Clerk Middleware (Dynamic Import)
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

    // 2. Supabase Middleware (Dynamic Import for safety)
    if (isSupabaseEnabled) {
      const { createServerClient } = await import("@supabase/ssr");
      let supabaseResponse = NextResponse.next({ request });

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll(); },
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

      // Refresh session 
      try {
        await supabase.auth.getUser();
      } catch (e) {
        // Ignore session refresh errors in middleware
      }

      return supabaseResponse;
    }
  } catch (err) {
    console.error("Middleware Error Caught:", err);
    // On edge error, try to at least let the request through
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
