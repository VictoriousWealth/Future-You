import "server-only";
import type { RegistrationMail, RegistrationMailerPort } from "../../application/registration/ports";
import type { RegistrationConfiguration } from "./registration-configuration";

export interface RegistrationMailRecord extends RegistrationMail {
  readonly sentAt: string;
}

const MAIL_STORE = Symbol.for("future-you.registration-mail-store/1");

function memoryStore(): RegistrationMailRecord[] {
  const globalState = globalThis as typeof globalThis & { [MAIL_STORE]?: RegistrationMailRecord[] };
  globalState[MAIL_STORE] ??= [];
  return globalState[MAIL_STORE];
}

export class MemoryRegistrationMailer implements RegistrationMailerPort {
  async send(message: RegistrationMail): Promise<void> {
    memoryStore().push({ ...message, sentAt: new Date().toISOString() });
  }
}

export class HttpRegistrationMailer implements RegistrationMailerPort {
  constructor(private readonly endpoint: string, private readonly token: string) {}

  async send(message: RegistrationMail): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        template: message.purpose === "WORK_CODE" ? "future-you-work-verification" : "future-you-personal-confirmation",
        to: message.to,
        variables: { code: message.code },
        idempotencyReference: `${message.registrationId}:${message.purpose}:${message.deliveryId}`
      }),
      signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok) throw new Error("Registration email provider rejected the request.");
  }
}

export function createRegistrationMailer(configuration: RegistrationConfiguration): RegistrationMailerPort {
  if (configuration.mailMode === "memory") return new MemoryRegistrationMailer();
  if (!configuration.mailEndpoint || !configuration.mailToken) {
    throw new Error("The HTTP registration mail provider is not configured.");
  }
  return new HttpRegistrationMailer(configuration.mailEndpoint, configuration.mailToken);
}

export function latestRegistrationMail(input: Readonly<{
  registrationId: string;
  purpose: RegistrationMail["purpose"];
}>): RegistrationMailRecord | null {
  const store = memoryStore();
  for (let index = store.length - 1; index >= 0; index -= 1) {
    const item = store[index];
    if (item?.registrationId === input.registrationId && item.purpose === input.purpose) return item;
  }
  return null;
}

export function clearRegistrationMailStore(): void {
  memoryStore().length = 0;
}
