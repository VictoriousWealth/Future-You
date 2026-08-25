import { randomUUID } from "node:crypto";
import type { RegistrationApplicationResolver } from "../../../../../server/http/registration-route";
import { apiErrorResponse, jsonResponse } from "../../../../../server/http/api-response";
import { readRegistrationActivationCookie } from "../../../../../server/http/registration-activation-cookie";
import { withRegistrationApplication } from "../../../../../server/http/registration-route";

export const runtime = "nodejs";

export async function handleGET(_request: Request, resolver?: RegistrationApplicationResolver): Promise<Response> {
  const correlationId = randomUUID();
  const activation = await readRegistrationActivationCookie();
  if (!activation) return apiErrorResponse(401, "REGISTRATION_ACTIVATION_INVALID", "Your activation has expired. Start registration again.", correlationId);
  return withRegistrationApplication(correlationId, async (application) => jsonResponse(await application.status(activation.registrationId, activation.token)), resolver);
}

export async function GET(request: Request): Promise<Response> { return handleGET(request); }
