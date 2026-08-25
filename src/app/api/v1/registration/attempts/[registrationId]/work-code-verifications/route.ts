import { randomUUID } from "node:crypto";
import { verifyWorkCodeRequestSchema } from "../../../../../../../application/registration/contracts";
import type { RegistrationApplicationResolver } from "../../../../../../../server/http/registration-route";
import { apiErrorResponse, jsonResponse, readJsonBody } from "../../../../../../../server/http/api-response";
import { setRegistrationActivationCookie } from "../../../../../../../server/http/registration-activation-cookie";
import { registrationRateLimit, withRegistrationApplication } from "../../../../../../../server/http/registration-route";
import { sameOriginMutationError } from "../../../../../../../server/http/same-origin";

export const runtime = "nodejs";

export async function handlePOST(
  request: Request,
  context: Readonly<{ params: Promise<{ registrationId: string }> }>,
  resolver?: RegistrationApplicationResolver
): Promise<Response> {
  const correlationId = randomUUID();
  const originError = sameOriginMutationError(request, correlationId);
  if (originError) return originError;
  const limited = registrationRateLimit(request, "verify-work", correlationId, 10);
  if (limited) return limited;
  const body = await readJsonBody(request);
  if (!body.ok) return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", correlationId);
  const parsed = verifyWorkCodeRequestSchema.safeParse(body.value);
  if (!parsed.success) return apiErrorResponse(400, "INVALID_REQUEST", "Enter the six-digit code.", correlationId);
  const { registrationId } = await context.params;
  return withRegistrationApplication(correlationId, async (application) => {
    const result = await application.verifyWorkCode(registrationId, parsed.data);
    const response = jsonResponse(result.dto);
    setRegistrationActivationCookie(response, { registrationId, token: result.activationToken });
    return response;
  }, resolver);
}

export async function POST(request: Request, context: Readonly<{ params: Promise<{ registrationId: string }> }>): Promise<Response> {
  return handlePOST(request, context);
}
