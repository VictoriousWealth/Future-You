import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PersonalEmailVerificationPort,
  RegistrationIdentityPort
} from "../../application/registration/ports";

export class SupabaseRegistrationIdentity implements RegistrationIdentityPort {
  constructor(private readonly administrativeClient: SupabaseClient) {}

  async createPendingIdentity(input: Parameters<RegistrationIdentityPort["createPendingIdentity"]>[0]) {
    const { data, error } = await this.administrativeClient.auth.admin.generateLink({
      type: "signup",
      email: input.personalEmail,
      password: input.password,
      options: {
        data: {
          display_name: input.displayName,
          future_you_registration_id: input.registrationId,
          future_you_claim_nonce: input.claimNonce
        }
      }
    });
    if (error) {
      if (error.code === "email_exists" || /already.*register|already.*exist/i.test(error.message)) {
        return { kind: "EXISTS" as const, personalConfirmationCode: null };
      }
      throw new Error("Supabase could not create the pending registration identity.");
    }
    return {
      kind: "CREATED" as const,
      personalConfirmationCode: data.properties.email_otp
    };
  }

  async resendPersonalConfirmation(authUserId: string) {
    const { data: userData, error: userError } = await this.administrativeClient.auth.admin.getUserById(authUserId);
    const personalEmail = userData.user?.email;
    if (userError || !personalEmail) throw new Error("The pending personal identity could not be loaded.");
    const { data, error } = await this.administrativeClient.auth.admin.generateLink({
      type: "magiclink",
      email: personalEmail
    });
    if (error || !data.properties.email_otp) throw new Error("A replacement personal confirmation code could not be generated.");
    return { personalEmail, personalConfirmationCode: data.properties.email_otp };
  }
}

export class SupabaseRequestPersonalEmailVerifier implements PersonalEmailVerificationPort {
  constructor(
    private readonly administrativeClient: SupabaseClient,
    private readonly requestClient: SupabaseClient
  ) {}

  async verify(input: Parameters<PersonalEmailVerificationPort["verify"]>[0]): Promise<boolean> {
    const { data: userData, error: userError } = await this.administrativeClient.auth.admin.getUserById(input.authUserId);
    const email = userData.user?.email;
    if (userError || !email) return false;
    const { error } = await this.requestClient.auth.verifyOtp({
      email,
      token: input.code,
      type: "signup"
    });
    if (error === null) return true;
    const magicLink = await this.requestClient.auth.verifyOtp({
      email,
      token: input.code,
      type: "email"
    });
    return magicLink.error === null;
  }
}
