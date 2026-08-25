import "server-only";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { RegistrationApplication } from "../application/registration/application";
import { NodeRegistrationSecurity } from "../infrastructure/registration/node-registration-security";
import { registrationConfiguration } from "../infrastructure/registration/registration-configuration";
import { SupabaseRegistrationIdentity, SupabaseRequestPersonalEmailVerifier } from "../infrastructure/registration/supabase-registration-identity";
import { createRegistrationMailer } from "../infrastructure/registration/registration-mailer";
import { SupabaseRegistrationPersistence } from "../infrastructure/registration/supabase-registration-persistence";
import { createRequestSupabaseClient } from "../infrastructure/supabase/server-client";

function administrativeClient() {
  const configuration = registrationConfiguration();
  return createClient(configuration.supabaseUrl, configuration.supabaseRegistrationSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { transport: WebSocket as never }
  });
}

export async function resolveRegistrationApplication(input: Readonly<{
  personalEmailVerification?: boolean;
}> = {}): Promise<RegistrationApplication> {
  const configuration = registrationConfiguration();
  const admin = administrativeClient();
  return new RegistrationApplication({
    persistence: new SupabaseRegistrationPersistence(admin),
    security: new NodeRegistrationSecurity(configuration.codePepper, configuration.fingerprintPepper),
    mailer: createRegistrationMailer(configuration),
    identity: new SupabaseRegistrationIdentity(admin),
    ...(input.personalEmailVerification
      ? { verifyPersonalEmail: new SupabaseRequestPersonalEmailVerifier(admin, await createRequestSupabaseClient()) }
      : {})
  });
}
