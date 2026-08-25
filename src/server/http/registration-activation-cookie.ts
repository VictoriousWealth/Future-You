import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE_NAME = "fy-registration-activation";

export interface RegistrationActivationCookie {
  readonly registrationId: string;
  readonly token: string;
}

export function setRegistrationActivationCookie(
  response: NextResponse,
  value: RegistrationActivationCookie
): void {
  response.cookies.set(COOKIE_NAME, `${value.registrationId}.${value.token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60
  });
}

export function clearRegistrationActivationCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export async function readRegistrationActivationCookie(): Promise<RegistrationActivationCookie | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const separator = raw.indexOf(".");
  if (separator < 1) return null;
  const registrationId = raw.slice(0, separator);
  const token = raw.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/i.test(registrationId) || token.length < 32) return null;
  return { registrationId, token };
}
