import "server-only";

export interface PublicSupabaseConfiguration {
  readonly url: string;
  readonly publishableKey: string;
}

function requiredEnvironmentValue(name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server configuration: ${name}.`);
  return value;
}

export function publicSupabaseConfiguration(): PublicSupabaseConfiguration {
  const url = requiredEnvironmentValue("SUPABASE_URL");
  try {
    new URL(url);
  } catch {
    throw new Error("SUPABASE_URL must be an absolute URL.");
  }
  return {
    url,
    publishableKey: requiredEnvironmentValue("SUPABASE_PUBLISHABLE_KEY")
  };
}
