import "server-only";
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import type { RegistrationSecurityPort, WorkChallengeMaterial } from "../../application/registration/ports";

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

export class NodeRegistrationSecurity implements RegistrationSecurityPort {
  constructor(
    private readonly codePepper: string,
    private readonly fingerprintPepper: string,
    private readonly keyVersion = "registration-code-hmac/1"
  ) {
    if (codePepper.length < 32 || fingerprintPepper.length < 32) {
      throw new Error("Registration peppers must each contain at least 32 characters.");
    }
  }

  normalizeCompanyId(value: string): string {
    return value.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
  }

  normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  fingerprint(value: string): string {
    return createHmac("sha256", this.fingerprintPepper).update(value).digest("hex");
  }

  requestFingerprint(value: unknown): string {
    return createHmac("sha256", this.fingerprintPepper).update(canonical(value)).digest("hex");
  }

  issueWorkChallenge(registrationId: string): WorkChallengeMaterial {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const salt = randomBytes(24).toString("base64url");
    return {
      code,
      salt,
      keyVersion: this.keyVersion,
      digest: this.digestWorkCode(registrationId, code, salt, this.keyVersion)
    };
  }

  digestWorkCode(registrationId: string, code: string, salt: string, keyVersion: string): string {
    if (keyVersion !== this.keyVersion) throw new Error("Unsupported registration code key version.");
    return createHmac("sha256", this.codePepper)
      .update(`${registrationId}\u0000${salt}\u0000${code}`)
      .digest("hex");
  }

  issueOpaqueToken(): Readonly<{ token: string; digest: string }> {
    const token = randomBytes(32).toString("base64url");
    return { token, digest: this.digestOpaqueToken(token) };
  }

  digestOpaqueToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  digestAuthClaim(nonce: string): string {
    return createHash("sha256").update(nonce).digest("hex");
  }
}
