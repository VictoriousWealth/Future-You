import { redirect } from "next/navigation";
import { AuthenticationBoundaryError } from "../../infrastructure/auth/authentication-error";
import { resolveAuthenticatedConversationApplication } from "../../server/authenticated-conversation-application";
import { publicSupabaseConfiguration } from "../../infrastructure/supabase/config";
import { AskConversationShell } from "../../ui/features/ask/ask-conversation-shell";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  let context;
  try {
    context = await resolveAuthenticatedConversationApplication();
  } catch (error) {
    if (error instanceof AuthenticationBoundaryError) redirect("/login");
    throw error;
  }
  if (!context.currentContextVersionId) redirect("/onboarding");
  const list = await context.application.list();
  const first = list.conversations[0];
  const initialConversation = first ? await context.application.get(first.id) : null;
  return (
    <AskConversationShell
      displayName={context.displayName}
      configuration={publicSupabaseConfiguration()}
      initialList={list}
      initialConversation={initialConversation}
    />
  );
}
