import { randomUUID } from "node:crypto";
import { apiErrorResponse, jsonResponse } from "../../../../../../server/http/api-response";
import { readRegistrationTestMail } from "../../../../../../server/registration-test-mailbox";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const correlationId = randomUUID();
  const url = new URL(request.url);
  const registrationId = url.searchParams.get("registrationId") ?? "";
  const purpose = url.searchParams.get("purpose");
  if (purpose !== "WORK_CODE" && purpose !== "PERSONAL_CONFIRMATION") {
    return apiErrorResponse(400, "INVALID_REQUEST", "A valid mail purpose is required.", correlationId);
  }
  let mail;
  try {
    mail = readRegistrationTestMail({
      suppliedToken: request.headers.get("x-registration-test-token"),
      registrationId,
      purpose
    });
  } catch {
    return apiErrorResponse(404, "INVALID_REQUEST", "Not found.", correlationId);
  }
  if (!mail) return apiErrorResponse(404, "INVALID_REQUEST", "No matching test email exists.", correlationId);
  return jsonResponse({ registrationId, purpose, code: mail.code, to: mail.to });
}
