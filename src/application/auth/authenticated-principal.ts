export interface AuthenticatedPrincipal {
  readonly userId: string;
  readonly email?: string;
  readonly assuranceLevel?: string;
}

export interface AuthenticatedPrincipalProvider {
  requirePrincipal(): Promise<AuthenticatedPrincipal>;
}
