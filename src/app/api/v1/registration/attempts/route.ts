import { randomUUID } from "node:crypto";
import { beginRegistrationRequestSchema } from "../../../../../application/registration/contracts";
import type { RegistrationApplicationResolver } from "../../../../../server/http/registration-route";
import { apiErrorResponse, jsonResponse, readJsonBody } from "../../../../../server/http/api-response";
import { registrationRateLimit, withRegistrationApplication } from "../../../../../server/http/registration-route";
import { sameOriginMutationError } from "../../../../../server/http/same-origin";

export const runtime = "nodejs";

export async function handlePOST(request: Request, resolver?: RegistrationApplicationResolver): Promise<Response> {
  const correlationId = randomUUID();
  const originError = sameOriginMutationError(request, correlationId);
  if (originError) return originError;
  const limited = registrationRateLimit(request, "begin", correlationId, 12);
  if (limited) return limited;
  const body = await readJsonBody(request);
  if (!body.ok) return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", correlationId);
  const parsed = beginRegistrationRequestSchema.safeParse(body.value);
  if (!parsed.success) return apiErrorResponse(400, "INVALID_REQUEST", "Enter a valid Company ID and work email.", correlationId);
  return withRegistrationApplication(correlationId, async (application) => jsonResponse(await application.begin(parsed.data), 202), resolver);
}

export async function POST(request: Request): Promise<Response> { return handlePOST(request); }
