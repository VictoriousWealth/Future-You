import type { ApiErrorResponseDTO } from "../../application/dto/contracts";
import type { NextResponse } from "next/server";
import { apiErrorResponse } from "./api-response";

export function sameOriginMutationError(
  request: Request,
  correlationId: string
): NextResponse<ApiErrorResponseDTO> | null {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.slice(0, -1);
  const expectedOrigin = host ? `${protocol}://${host}` : requestUrl.origin;
  if (
    contentType !== "application/json" ||
    (origin !== null && origin !== expectedOrigin) ||
    (fetchSite !== null && fetchSite !== "same-origin" && fetchSite !== "none")
  ) {
    return apiErrorResponse(
      403,
      "INVALID_REQUEST",
      "Cross-origin mutation requests are not permitted.",
      correlationId
    );
  }
  return null;
}
