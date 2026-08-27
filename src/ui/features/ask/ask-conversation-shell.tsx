"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type {
  ConversationDetailDTO,
  ConversationListResponseDTO,
  ConversationTurnResponseDTO
} from "../../../application/conversation/contracts";
import type { ApiErrorResponseDTO } from "../../../application/dto/contracts";
import { ConversationResultView } from "./conversation-result-view";
import { SignOutButton } from "../../auth/sign-out-button";
import type { BrowserSupabaseConfiguration } from "../../auth/browser-supabase-client";
import { ModalSheet } from "../../product-shell/modal-sheet";
import { ActionTriangleIcon } from "../../product-shell/product-icon";
import { ProductShell } from "../../product-shell/product-shell";
import { QUICK_CHAT_OPTIONS, QuickChatIcon } from "../../quick-chat/quick-chat-options";

type RequestState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "sending"; message: string }>
  | Readonly<{ status: "failed"; message: string; retryable: boolean; originalMessage: string | null }>;

function requestId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

async function responseBody(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return null; }
}

function errorFrom(body: unknown): { message: string; retryable: boolean } {
  const possible = body as Partial<ApiErrorResponseDTO> | null;
  return {
    message: possible?.error?.message ?? "Future You could not complete that request.",
    retryable: possible?.error?.retryable ?? false
  };
}

export function AskConversationShell({
  displayName,
  configuration,
  initialList,
  initialConversation,
  initialPrompt = "",
  autoSubmitInitialPrompt = false
}: Readonly<{
  displayName: string;
  configuration: BrowserSupabaseConfiguration;
  initialList: ConversationListResponseDTO;
  initialConversation: ConversationDetailDTO | null;
  initialPrompt?: string;
  autoSubmitInitialPrompt?: boolean;
}>) {
  const [list, setList] = useState(initialList);
  const [conversation, setConversation] = useState(initialConversation);
  const [message, setMessage] = useState(initialPrompt);
  const [request, setRequest] = useState<RequestState>({ status: "idle" });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<"idle" | "loading" | "failed">("idle");
  const automaticPrompt = useRef(autoSubmitInitialPrompt ? initialPrompt : null);

  async function refreshList() {
    const response = await fetch("/api/v1/conversations", { cache: "no-store" });
    const body = await responseBody(response);
    if (response.ok) setList(body as ConversationListResponseDTO);
  }

  async function createConversation(): Promise<ConversationDetailDTO> {
    const response = await fetch("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: requestId("create") })
    });
    const body = await responseBody(response);
    if (!response.ok) throw errorFrom(body);
    const detail = body as ConversationDetailDTO;
    setConversation(detail);
    await refreshList();
    return detail;
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || request.status === "sending") return;
    setRequest({ status: "sending", message: trimmed });
    setMessage("");
    try {
      const active = conversation ?? await createConversation();
      const response = await fetch(`/api/v1/conversations/${active.conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId("turn"), message: trimmed })
      });
      const body = await responseBody(response);
      if (!response.ok) throw errorFrom(body);
      const turn = body as ConversationTurnResponseDTO;
      setConversation(turn.conversation);
      setRequest({ status: "idle" });
      await refreshList();
    } catch (caught) {
      const error = caught as { message?: string; retryable?: boolean };
      setRequest({
        status: "failed",
        message: error.message ?? "Future You could not complete that request.",
        retryable: error.retryable ?? false,
        originalMessage: trimmed
      });
    }
  }

  useEffect(() => {
    const prompt = automaticPrompt.current;
    if (!prompt) return;
    automaticPrompt.current = null;
    window.history.replaceState(window.history.state, "", "/ask");
    void submit(prompt);
    // This is deliberately a one-shot navigation action guarded by automaticPrompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openConversation(id: string) {
    setRequest({ status: "idle" });
    setHistoryStatus("loading");
    const response = await fetch(`/api/v1/conversations/${id}`, { cache: "no-store" });
    const body = await responseBody(response);
    if (response.ok) {
      setConversation(body as ConversationDetailDTO);
      setHistoryOpen(false);
      setHistoryStatus("idle");
    } else {
      setHistoryStatus("failed");
    }
  }

  async function selectScenario(runId: string | null) {
    if (!conversation) return;
    const response = await fetch(`/api/v1/conversations/${conversation.conversation.id}/selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: requestId("select"), runId })
    });
    const body = await responseBody(response);
    if (response.ok) {
      setConversation(body as ConversationDetailDTO);
      setScenarioOpen(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(message);
  }

  const isInitial = (!conversation || conversation.messages.length === 0) && request.status === "idle";
  return (
    <ProductShell
      active="ask"
      className={`fy-ask-shell ${isInitial ? "is-initial" : "is-conversation"}`}
      testId="ask-visual-shell"
      headerAction={(
        <button type="button" className="fy-history-button" aria-label="Open conversation history" onClick={() => setHistoryOpen(true)}>
          <span/><span/><span/>
        </button>
      )}
    >

      {isInitial ? (
        <section className="fy-ask-intro">
          <h1 className="fy-welcome">Good morning,<br/>{displayName}!</h1>
          <div className="fy-prompt-rail fy-quick-chat-layout" aria-label="Suggested questions">
            <p>Or Start a Quick Chat With:</p>
            <div className="fy-quick-chat-row is-n">
              {QUICK_CHAT_OPTIONS.slice(0, 2).map((prompt) => (
                <button type="button" className="fy-prompt-card fy-quick-chat-card" key={prompt.label} onClick={() => { if ("prompt" in prompt) void submit(prompt.prompt); }}>
                  <QuickChatIcon/><strong>{prompt.label}</strong>
                </button>
              ))}
            </div>
            <div className="fy-quick-chat-row is-n-plus-one">
              {QUICK_CHAT_OPTIONS.slice(2).map((prompt) => (
                <button type="button" className="fy-prompt-card fy-quick-chat-card" key={prompt.label} onClick={() => void submit(prompt.prompt)}>
                  <QuickChatIcon/><strong>{prompt.label}</strong>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="fy-thread" aria-label="Ask conversation">
          <div className="fy-thread-heading">
            <div><p>Future You</p><h1>Let’s look at what changes.</h1></div>
            {(conversation?.scenarios.length ?? 0) > 0 && (
              <button type="button" onClick={() => setScenarioOpen(true)}>{conversation!.scenarios.length + 1} paths</button>
            )}
          </div>
          {conversation && !conversation.conversation.contextIsCurrent && (
            <aside className="fy-stale-card" data-testid="stale-context-state">
              <strong>This thread uses an earlier plan</strong>
              <p>You can still read its results. Start a new conversation to model a new decision.</p>
              <button type="button" onClick={() => { setConversation(null); setRequest({ status: "idle" }); }}>Start with current plan</button>
            </aside>
          )}
          {(conversation?.messages ?? []).map((item) => (
            <article className={`fy-message ${item.kind === "USER_TEXT" ? "user" : "assistant"}`} key={item.id} data-kind={item.kind}>
              {item.kind !== "USER_TEXT" && <span className="fy-assistant-mark" aria-hidden="true">FY</span>}
              <div className="fy-message-content">
                {(item.kind !== "ASSISTANT_RESULT" || item.templateId?.startsWith("DEMO_")) && <p>{item.text}</p>}
                {item.result && <ConversationResultView result={item.result}/>} 
                {item.explanationFallbackUsed && <small className="fy-fallback-note">Trusted fallback explanation used</small>}
              </div>
            </article>
          ))}
          {request.status === "sending" && (
            <>
              <article className="fy-message user pending"><div className="fy-message-content"><p>{request.message}</p></div></article>
              <div className="fy-thinking" role="status" aria-live="polite" data-testid="interpreting-state"><span/><span/><span/> Understanding your request and preparing a trusted result…</div>
            </>
          )}
          {request.status === "failed" && (
            <aside className="fy-error-card" role="alert" data-testid="provider-error-state">
              <strong>We couldn’t finish that safely</strong><p>{request.message}</p>
              {request.retryable && request.originalMessage && <button type="button" onClick={() => void submit(request.originalMessage!)}>Try again</button>}
            </aside>
          )}
        </section>
      )}

      <form className="fy-composer" onSubmit={onSubmit} data-testid="ask-composer">
        <label className="sr-only" htmlFor="ask-message">Ask Future You</label>
        <input id="ask-message" value={message} maxLength={1000} onChange={(event) => setMessage(event.target.value)} placeholder="Ask Future You..." disabled={request.status === "sending"}/>
        <button type="submit" aria-label="Send message" disabled={!message.trim() || request.status === "sending"}><ActionTriangleIcon direction="up"/></button>
      </form>

      {historyOpen && (
        <ModalSheet labelledBy="history-title" onClose={() => setHistoryOpen(false)} testId="conversation-history">
            <div className="fy-sheet-handle" aria-hidden="true"/><header><h2 id="history-title">Your conversations</h2><button type="button" data-dialog-initial-focus onClick={() => setHistoryOpen(false)}>Close</button></header>
            <button className="fy-new-thread" type="button" onClick={() => { setConversation(null); setHistoryOpen(false); }}>+ New conversation</button>
            <div className="fy-history-list" aria-busy={historyStatus === "loading"}>
              {list.conversations.length === 0 ? <p>No saved conversations yet.</p> : list.conversations.map((item) => (
                <button type="button" key={item.id} disabled={historyStatus === "loading"} onClick={() => void openConversation(item.id)}>
                  <span><strong>{item.title}</strong><small>{item.contextIsCurrent ? "Current plan" : "Earlier plan"}</small></span><ActionTriangleIcon/>
                </button>
              ))}
            </div>
            {historyStatus === "loading" ? <p className="fy-sheet-status" role="status">Retrieving conversation history…</p> : null}
            {historyStatus === "failed" ? <p className="fy-sheet-status error" role="alert">That conversation could not be opened safely. You can try again.</p> : null}
            <SignOutButton configuration={configuration}/>
        </ModalSheet>
      )}

      {scenarioOpen && conversation && (
        <ModalSheet labelledBy="scenario-title" onClose={() => setScenarioOpen(false)} testId="scenario-selector">
            <div className="fy-sheet-handle" aria-hidden="true"/><header><div><p>Compare paths</p><h2 id="scenario-title">What would you like to view?</h2></div><button type="button" data-dialog-initial-focus onClick={() => setScenarioOpen(false)}>Close</button></header>
            <div className="fy-scenario-list">
              <button className={conversation.conversation.selectedRunId === null ? "selected" : ""} type="button" onClick={() => void selectScenario(null)}><span><strong>Current path</strong><small>No hypothetical purchase</small></span><i>Current</i></button>
              {conversation.scenarios.map((item) => (
                <button className={conversation.conversation.selectedRunId === item.runId ? "selected" : ""} type="button" key={item.runId} onClick={() => void selectScenario(item.runId)}>
                  <span><strong>{item.label}</strong><small>{item.amount} · {item.paymentPeriod}</small></span><i>What-if</i>
                </button>
              ))}
            </div>
        </ModalSheet>
      )}
    </ProductShell>
  );
}
