import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { publicSupabaseConfiguration } from "./config";

export type RequestSupabaseClient = ReturnType<typeof createRequestSupabaseClient> extends Promise<infer T>
  ? T
  : never;

export async function createRequestSupabaseClient() {
  const configuration = publicSupabaseConfiguration();
  const cookieStore = await cookies();
  return createServerClient<Database>(configuration.url, configuration.publishableKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          for (const { name, value, options } of values) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The request proxy owns refresh writes there.
        }
      }
    }
  });
}
