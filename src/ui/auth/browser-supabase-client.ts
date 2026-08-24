"use client";

import { createBrowserClient } from "@supabase/ssr";

export interface BrowserSupabaseConfiguration {
  readonly url: string;
  readonly publishableKey: string;
}

export function createBrowserSupabaseClient(configuration: BrowserSupabaseConfiguration) {
  return createBrowserClient(configuration.url, configuration.publishableKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  });
}
