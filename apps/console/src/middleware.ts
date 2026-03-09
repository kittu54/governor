import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const hasSupabase = supabaseUrl.length > 0 && supabaseKey.length > 0;

/** Routes that don't require authentication */
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/api/proxy"];

function isPublicPath(pathname: string): boolean {
  // Exact match for root (landing page)
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If Supabase is not configured, redirect everything to sign-in
  // (except sign-in/sign-up pages themselves to avoid infinite loop)
  if (!hasSupabase) {
    if (!isPublicPath(pathname)) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    return NextResponse.next();
  }

  // Create a Supabase client that can read cookies from the request
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Forward cookie changes to the response
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh the session (important: must call getUser, not getSession, for security)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to sign-in (except public paths)
  if (!user && !isPublicPath(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from sign-in/sign-up to the dashboard
  if (user && isPublicPath(pathname) && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
