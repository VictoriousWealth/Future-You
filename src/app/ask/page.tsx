import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthenticationBoundaryError } from "../../infrastructure/auth/authentication-error";
import { AccountActivationRequiredError } from "../../infrastructure/auth/account-activation-error";
import { resolveAuthenticatedConversationApplication } from "../../server/authenticated-conversation-application";
import { publicSupabaseConfiguration } from "../../infrastructure/supabase/config";
import { AskConversationShell } from "../../ui/features/ask/ask-conversation-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ask | Future You" };

const SUPPORTED_HOME_PROMPTS = new Set([
  "Can I afford a £650 trip next month?",
  "Can I afford something next month?",
  "What would a cheaper option change?",
  "Explain my current path"
]);

export default async function AskPage({ searchParams }: Readonly<{
  searchParams: Promise<{ prompt?: string }>;
}>) {
  let context;
  try {
    context = await resolveAuthenticatedConversationApplication();
  } catch (error) {
    if (error instanceof AccountActivationRequiredError) redirect("/onboarding");
    if (error instanceof AuthenticationBoundaryError) redirect("/login");
    throw error;
  }
  if (!context.currentContextVersionId) redirect("/onboarding");
  const list = await context.application.list();
  const first = list.conversations[0];
  const initialConversation = first ? await context.application.get(first.id) : null;
  const requestedPrompt = (await searchParams).prompt;
  const initialPrompt = requestedPrompt && SUPPORTED_HOME_PROMPTS.has(requestedPrompt)
    ? requestedPrompt
    : "";
  return (
    <AskConversationShell
      displayName={context.displayName}
      configuration={publicSupabaseConfiguration()}
      initialList={list}
      initialConversation={initialConversation}
      initialPrompt={initialPrompt}
    />
  );
}
