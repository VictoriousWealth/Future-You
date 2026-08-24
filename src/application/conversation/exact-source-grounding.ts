import { parseExactGbpInput } from "../onboarding/exact-gbp-input";
import type { AmountInterpretation } from "./contracts";
import { ConversationApplicationError } from "./application-error";

export function sourceContainsQuote(source: string, quote: string): boolean {
  return source.toLocaleLowerCase("en-GB").includes(quote.toLocaleLowerCase("en-GB"));
}

export function exactMinorUnitsFromInterpretation(
  amount: AmountInterpretation,
  currentMessage: string,
  allowedPriorQuote: string | null = null
): string {
  if (!amount.quote || amount.currency !== "GBP") {
    throw new ConversationApplicationError(
      "CONVERSATION_INPUT_INVALID",
      "The purchase amount was missing or was not GBP."
    );
  }
  const groundedInCurrent = sourceContainsQuote(currentMessage, amount.quote);
  const groundedInPrior = allowedPriorQuote !== null && amount.quote === allowedPriorQuote;
  if (!groundedInCurrent && !groundedInPrior) {
    throw new ConversationApplicationError(
      "AI_INTERPRETATION_INVALID",
      "The interpreted amount could not be traced to the user's message."
    );
  }
  const numeric = amount.quote.match(/(?:0|[1-9]\d*)(?:\.\d{1,2})?/);
  if (!numeric) {
    throw new ConversationApplicationError(
      "CONVERSATION_INPUT_INVALID",
      "Use a numeric GBP amount such as £650 or 500 quid."
    );
  }
  const parsed = parseExactGbpInput(
    { currency: "GBP", amount: numeric[0] },
    "purchaseAmount",
    "POSITIVE"
  );
  if (!parsed.ok) {
    throw new ConversationApplicationError("CONVERSATION_INPUT_INVALID", parsed.error.message);
  }
  return parsed.value.minor.toString();
}
