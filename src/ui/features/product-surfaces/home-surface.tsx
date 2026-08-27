"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { HomeSurfaceDTO } from "../../../application/product-surfaces/contracts";
import type { ConversationListResponseDTO } from "../../../application/conversation/contracts";
import type { ApiErrorResponseDTO } from "../../../application/dto/contracts";
import { ActionTriangleIcon, ProductIcon } from "../../product-shell/product-icon";
import { ProductShell } from "../../product-shell/product-shell";
import { SurfaceError, SurfaceLoading } from "../../product-shell/surface-state";
import { QUICK_CHAT_OPTIONS, QuickChatIcon, type QuickChatOption } from "../../quick-chat/quick-chat-options";
import { GoalCard } from "./goal-card";

const DEFAULT_DECISION = { label: "Can I afford a £650 trip?", prompt: "Can I afford a £650 trip next month?" } as const;

function decisionHref(decision: QuickChatOption): string {
  return `/ask?prompt=${encodeURIComponent(decision.prompt)}&autosend=1`;
}

function apiMessage(value: unknown): string {
  return (value as Partial<ApiErrorResponseDTO> | null)?.error?.message ?? "Your Home overview is temporarily unavailable.";
}

function balancedQuestionLines(question: string): readonly [string, string] {
  const words = question.trim().split(/\s+/);
  if (words.length < 2) return [question, "\u00a0"];
  let splitAt = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(" ");
    const second = words.slice(index).join(" ");
    const difference = Math.abs(first.length - second.length);
    if (difference < smallestDifference) {
      splitAt = index;
      smallestDifference = difference;
    }
  }
  return [words.slice(0, splitAt).join(" "), words.slice(splitAt).join(" ")];
}

export function HomeSurface() {
  const [data, setData] = useState<HomeSurfaceDTO | null>(null);
  const [recentConversationQuestion, setRecentConversationQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const load = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setError(null);
    fetch("/api/v1/conversations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const body = await response.json() as ConversationListResponseDTO;
        if (active) setRecentConversationQuestion(body.recentConversationQuestion);
      })
      .catch(() => undefined);
    fetch("/api/v1/home", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(apiMessage(body));
        if (active) setData(body as HomeSurfaceDTO);
      })
      .catch((caught: Error) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [attempt]);

  const heroQuestion = recentConversationQuestion ?? DEFAULT_DECISION.label;
  const heroHref = recentConversationQuestion
    ? "/ask"
    : `/ask?prompt=${encodeURIComponent(DEFAULT_DECISION.prompt)}`;
  const heroQuestionLines = balancedQuestionLines(heroQuestion);

  return (
    <ProductShell active="home" className="fy-home-shell" testId="home-surface">
      {!data && !error ? <SurfaceLoading label="future"/> : null}
      {error ? <SurfaceError message={error} retry={load}/> : null}
      {data ? (
        <>
          <section className="fy-home-intro">
            <h1 className="fy-personal-greeting">Good morning,<br/><strong>{data.displayName}!</strong></h1>
            <div className="fy-home-hero" title={heroQuestion}>
              <span className="fy-home-hero-title"><span>Ask</span><span>Future You</span></span>
              <span className="fy-home-hero-latest">
                <strong className="fy-home-hero-question"><span>{heroQuestionLines[0]}</span><span>{heroQuestionLines[1]}</span></strong>
                <Link className="fy-home-hero-action" href={heroHref} aria-label={`Open conversation: ${heroQuestion}`}><ActionTriangleIcon/></Link>
              </span>
            </div>
            <div className="fy-home-decisions fy-quick-chat-layout" aria-label="Questions to try">
              <p>Or Start a Quick Chat With:</p>
              <div className="fy-quick-chat-row is-n">
                {QUICK_CHAT_OPTIONS.slice(0, 2).map((decision) => (
                  <Link className="fy-home-decision fy-quick-chat-card" href={decisionHref(decision)} key={decision.label}>
                    <QuickChatIcon name={decision.icon}/><strong>{decision.label}</strong>
                  </Link>
                ))}
              </div>
              <div className="fy-quick-chat-row is-n-plus-one">
                {QUICK_CHAT_OPTIONS.slice(2).map((decision) => (
                  <Link className="fy-home-decision fy-quick-chat-card" href={decisionHref(decision)} key={decision.label}>
                    <QuickChatIcon name={decision.icon}/><strong>{decision.label}</strong>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="fy-overview-section" aria-labelledby="right-now-title">
            <div className="fy-section-heading">
              <div><p>Your current path</p><h2 id="right-now-title">Your future right now</h2></div>
              <Link href="/goals">All goals</Link>
            </div>
            <article className="fy-buffer-card">
              <span className="fy-buffer-icon"><ProductIcon name="buffer"/></span>
              <div><p>Safety buffer</p><strong>{data.safetyBuffer.current.display}</strong><small>Preferred {data.safetyBuffer.preferred.display}</small></div>
              <i>{data.safetyBuffer.statusLabel}</i>
            </article>
            <div className="fy-home-goals">
              {data.goals.length > 0
                ? data.goals.map((goal) => <GoalCard goal={goal} compact key={goal.id}/>)
                : <section className="fy-inline-empty"><strong>No goals are confirmed yet.</strong><span>Add them through your financial-context settings before modelling their dates.</span></section>}
            </div>
          </section>

        </>
      ) : null}
    </ProductShell>
  );
}
