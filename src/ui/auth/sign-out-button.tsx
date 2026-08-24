"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createBrowserSupabaseClient,
  type BrowserSupabaseConfiguration
} from "./browser-supabase-client";

export function SignOutButton({ configuration }: Readonly<{
  configuration: BrowserSupabaseConfiguration;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="sign-out"
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const client = createBrowserSupabaseClient(configuration);
        await client.auth.signOut({ scope: "local" });
        router.replace("/login");
        router.refresh();
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
