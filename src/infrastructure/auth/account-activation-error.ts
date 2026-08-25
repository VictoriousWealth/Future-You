export class AccountActivationRequiredError extends Error {
  constructor() {
    super("Complete personal-email confirmation and financial onboarding before opening the full app.");
    this.name = "AccountActivationRequiredError";
  }
}
