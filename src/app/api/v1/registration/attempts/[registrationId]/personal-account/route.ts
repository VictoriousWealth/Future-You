import { randomUUID } from "node:crypto";
import { createPersonalAccountRequestSchema } from "../../../../../../../application/registration/contracts";
import type { RegistrationApplicationResolver } from "../../../../../../../server/http/registration-route";
import { apiErrorResponse, jsonResponse, readJsonBody } from "../../../../../../../server/http/api-response";
import { readRegistrationActivationCookie, setRegistrationActivationCookie } from "../../../../../../../server/http/registration-activation-cookie";
import { registrationRateLimit, withRegistrationApplication } from "../../../../../../../server/http/registration-route";
import { sameOriginMutationError } from "../../../../../../../server/http/same-origin";

export const runtime = "nodejs";

export async function handlePOST(request: Request, context: Readonly<{ params: Promise<{ registrationId: string }> }>, resolver?: RegistrationApplicationResolver): Promise<Response> {
  const correlationId = randomUUID();
  const originError = sameOriginMutationError(request, correlationId);
  if (originError) return originError;
  const limited = registrationRateLimit(request, "personal-account", correlationId, 8);
  if (limited) return limited;
  const { registrationId } = await context.params;
  const activation = await readRegistrationActivationCookie();
  if (!activation || activation.registrationId !== registrationId) return apiErrorResponse(401, "REGISTRATION_ACTIVATION_INVALID", "Your activation has expired. Start registration again.", correlationId);
  const body = await readJsonBody(request);
  if (!body.ok) return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", correlationId);
  const parsed = createPersonalAccountRequestSchema.safeParse(body.value);
  if (!parsed.success) return apiErrorResponse(400, "INVALID_REQUEST", "Check the personal account details.", correlationId);
  return withRegistrationApplication(correlationId, async (application) => {
    const result = await application.createPersonalAccount(registrationId, activation.token, parsed.data);
    const response = jsonResponse(result.dto, 201);
    setRegistrationActivationCookie(response, { registrationId, token: result.rotatedActivationToken });
    return response;
  }, resolver);
}

export async function POST(request: Request, context: Readonly<{ params: Promise<{ registrationId: string }> }>): Promise<Response> { return handlePOST(request, context); }
