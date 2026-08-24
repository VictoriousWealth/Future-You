import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { publicSupabaseConfiguration } from "./config";

export async function refreshSupabaseSession(request: NextRequest): Promise<Readonly<{
  response: NextResponse;
  authenticated: boolean;
}>> {
  const configuration = publicSupabaseConfiguration();
  let response = NextResponse.next({ request });
  const client = createServerClient<Database>(configuration.url, configuration.publishableKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
      }
    }
  });
  const { data, error } = await client.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return {
    response,
    authenticated: !error && typeof data?.claims.sub === "string"
  };
}

export function copyRefreshedCookies(source: NextResponse, target: NextResponse): NextResponse {
  for (const value of source.headers.getSetCookie()) target.headers.append("Set-Cookie", value);
  target.headers.set("Cache-Control", "private, no-store, max-age=0");
  return target;
}
