import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { isClerkEnabled, isSupabaseEnabled } from "./lib/clerk";
import { getSupabasePublicConfig } from "./lib/runtime-config";

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
      const supabaseConfig = getSupabasePublicConfig("server");
      if (!supabaseConfig) {
        console.error("[console] Supabase middleware enabled without valid config");
        return NextResponse.next();
      }

      const { createServerClient } = await import("@supabase/ssr");
      let supabaseResponse = NextResponse.next({ request });

      const supabase = createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            supabaseResponse = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) {
              supabaseResponse.cookies.set(name, value, options);
            }
          },
        },
      });

      try {
        await supabase.auth.getUser();
      } catch (error) {
        console.warn("[console] Supabase middleware session refresh failed", error);
      }

      return supabaseResponse;
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
