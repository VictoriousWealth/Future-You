export type AuthenticationErrorCode = "AUTHENTICATION_REQUIRED" | "AUTHENTICATION_INVALID";

export class AuthenticationBoundaryError extends Error {
  constructor(readonly code: AuthenticationErrorCode) {
    super(code === "AUTHENTICATION_REQUIRED" ? "Authentication is required." : "Authentication is invalid.");
    this.name = "AuthenticationBoundaryError";
  }
}
