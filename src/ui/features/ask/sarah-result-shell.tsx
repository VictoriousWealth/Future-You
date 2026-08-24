"use client";

import { useCallback, useEffect, useState } from "react";
import {
  API_VERSION,
  SCENARIO_OPTIONS_RESPONSE_SCHEMA,
  type ScenarioOptionsRequestDTO,
  type ScenarioOptionsResponseDTO
} from "../../../application/dto/contracts";
import { ResultView } from "./result-view";

export interface SarahResultShellProps {
  readonly command: ScenarioOptionsRequestDTO;
}

type ViewState =
  | Readonly<{ status: "calculating" }>
  | Readonly<{ status: "ready"; response: ScenarioOptionsResponseDTO }>
  | Readonly<{ status: "failed"; message: string }>;

function isExpectedEnvelope(value: unknown): value is ScenarioOptionsResponseDTO {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.apiVersion === API_VERSION &&
    record.schemaVersion === SCENARIO_OPTIONS_RESPONSE_SCHEMA
  );
}

export function SarahResultShell({ command }: SarahResultShellProps) {
  const [state, setState] = useState<ViewState>({ status: "calculating" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const calculate = useCallback(async (signal?: AbortSignal) => {
    setState({ status: "calculating" });
    try {
      const request: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command)
      };
      if (signal) request.signal = signal;
      const response = await fetch("/api/v1/scenarios/options", request);
      const body: unknown = await response.json();
      if (!response.ok || !isExpectedEnvelope(body)) {
        throw new Error("The simulator response could not be rendered safely.");
      }
      setSelectedId(body.selectedScenarioId);
      setState({ status: "ready", response: body });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState({
        status: "failed",
        message: error instanceof Error ? error.message : "The simulator is unavailable."
      });
    }
  }, [command]);

  useEffect(() => {
    const controller = new AbortController();
    void calculate(controller.signal);
    return () => controller.abort();
  }, [calculate]);

  if (state.status === "calculating") {
    return (
      <section className="boundary-state" aria-live="polite" data-testid="calculating-state">
        <span className="pulse" aria-hidden="true" />
        <div>
          <p className="eyebrow">Deterministic simulator</p>
          <h2>Calculating Sarah’s options…</h2>
          <p>The browser is waiting for versioned JSON results from the server.</p>
        </div>
      </section>
    );
  }

  if (state.status === "failed") {
    return (
      <section className="boundary-state error-state" role="alert">
        <div>
          <p className="eyebrow">Couldn’t load the proof</p>
          <h2>{state.message}</h2>
          <button type="button" onClick={() => void calculate()}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  const selected =
    state.response.options.find((option) => option.id === selectedId) ??
    state.response.options[0];
  if (!selected) {
    return <section className="boundary-state error-state">No scenario options were returned.</section>;
  }

  return (
    <>
      <nav className="scenario-selector" aria-label="Scenario selector" data-testid="scenario-selector">
        {state.response.options.map((option) => (
          <button
            type="button"
            key={option.id}
            aria-pressed={option.id === selected.id}
            onClick={() => setSelectedId(option.id)}
          >
            <span>{option.label}</span>
            <small>{option.isCurrent ? "Current" : "What-if"}</small>
          </button>
        ))}
      </nav>
      <ResultView option={selected} />
    </>
  );
}
