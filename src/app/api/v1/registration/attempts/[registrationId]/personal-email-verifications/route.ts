import { randomUUID } from "node:crypto";
import { verifyPersonalEmailRequestSchema } from "../../../../../../../application/registration/contracts";
import type { RegistrationApplicationResolver } from "../../../../../../../server/http/registration-route";
import { apiErrorResponse, jsonResponse, readJsonBody } from "../../../../../../../server/http/api-response";
import { readRegistrationActivationCookie } from "../../../../../../../server/http/registration-activation-cookie";
import { registrationRateLimit, withRegistrationApplication } from "../../../../../../../server/http/registration-route";
import { sameOriginMutationError } from "../../../../../../../server/http/same-origin";
import { resolveRegistrationApplication } from "../../../../../../../server/registration-application";

export const runtime = "nodejs";

export async function handlePOST(request: Request, context: Readonly<{ params: Promise<{ registrationId: string }> }>, resolver?: RegistrationApplicationResolver): Promise<Response> {
  const correlationId = randomUUID();
  const originError = sameOriginMutationError(request, correlationId);
  if (originError) return originError;
  const limited = registrationRateLimit(request, "verify-personal", correlationId, 10);
  if (limited) return limited;
  const { registrationId } = await context.params;
  const activation = await readRegistrationActivationCookie();
  if (!activation || activation.registrationId !== registrationId) return apiErrorResponse(401, "REGISTRATION_ACTIVATION_INVALID", "Your activation has expired. Start registration again.", correlationId);
  const body = await readJsonBody(request);
  if (!body.ok) return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", correlationId);
  const parsed = verifyPersonalEmailRequestSchema.safeParse(body.value);
  if (!parsed.success) return apiErrorResponse(400, "INVALID_REQUEST", "Enter the six-digit code.", correlationId);
  return withRegistrationApplication(correlationId, async (application) => jsonResponse(await application.verifyPersonalEmail(registrationId, activation.token, parsed.data)), resolver ?? (() => resolveRegistrationApplication({ personalEmailVerification: true })));
}

export async function POST(request: Request, context: Readonly<{ params: Promise<{ registrationId: string }> }>): Promise<Response> { return handlePOST(request, context); }
