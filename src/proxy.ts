import { NextResponse, type NextRequest } from "next/server";
import {
  copyRefreshedCookies,
  refreshSupabaseSession
} from "./infrastructure/supabase/proxy-session";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = await refreshSupabaseSession(request);
  if (request.nextUrl.pathname.startsWith("/story/sarah")) {
    session.response.headers.set("Cache-Control", "private, no-store, max-age=0");
    session.response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return session.response;
  }
  if (
    (request.nextUrl.pathname.startsWith("/ask") ||
      request.nextUrl.pathname.startsWith("/onboarding") ||
      request.nextUrl.pathname.startsWith("/settings")) &&
    !session.authenticated
  ) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return copyRefreshedCookies(session.response, NextResponse.redirect(login));
  }
  if (request.nextUrl.pathname === "/login" && session.authenticated) {
    return copyRefreshedCookies(
      session.response,
      NextResponse.redirect(new URL("/ask", request.url))
    );
  }
  return session.response;
}

export const config = {
  matcher: ["/ask/:path*", "/onboarding/:path*", "/settings/:path*", "/story/sarah/:path*", "/login", "/api/v1/:path*"]
};
