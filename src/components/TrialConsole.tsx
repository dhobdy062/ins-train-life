"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type TrialStartSuccess = {
  sessionKey: string;
  assistantId: string;
  publicKey: string;
  remainingTrialSessions: number;
  variableValues: {
    difficulty: string;
    objectionsRequired: string;
    rebuttals: string;
  };
  metadata: Record<string, string>;
};

type TrialStartError = {
  error?: string;
  code?: string;
  message?: string;
  ctaUrl?: string;
};

type VapiClient = {
  start: (assistant: string, options?: Record<string, unknown>) => Promise<unknown>;
  stop: () => Promise<void>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

export default function TrialConsole() {
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [callState, setCallState] = useState("ready");
  const [remainingTrialSessions, setRemainingTrialSessions] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [limitCtaUrl, setLimitCtaUrl] = useState("/sign-up");
  const vapiRef = useRef<VapiClient | null>(null);

  async function ensureClient(publicKey: string) {
    if (vapiRef.current) {
      return vapiRef.current;
    }

    const vapiModule = await import("@vapi-ai/web");
    const VapiCtor = (vapiModule.default ?? vapiModule) as unknown as new (key: string) => VapiClient;
    const client = new VapiCtor(publicKey);

    client.on("call-start", () => {
      setCallState("in_call");
      setStatus("Trial call connected.");
    });

    client.on("call-end", () => {
      setCallState("ended");
      setStatus("Trial call ended.");
    });

    client.on("error", (error) => {
      setCallState("error");
      setStatus(`VAPI error: ${String(error)}`);
    });

    vapiRef.current = client;
    return client;
  }

  async function handleStartTrial() {
    setLoading(true);
    setStatus(null);
    setLimitReached(false);

    try {
      const response = await fetch("/api/vapi/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const payload = (await response.json()) as TrialStartSuccess | TrialStartError;
      if (!response.ok) {
        const errorPayload = payload as TrialStartError;
        if (errorPayload.code === "TRIAL_LIMIT_REACHED") {
          setLimitReached(true);
          setLimitCtaUrl(errorPayload.ctaUrl ?? "/sign-up");
          setStatus(errorPayload.message ?? "Trial limit reached.");
          return;
        }

        throw new Error(errorPayload.error ?? errorPayload.message ?? "Unable to start trial call.");
      }

      const successPayload = payload as TrialStartSuccess;
      const client = await ensureClient(successPayload.publicKey);
      await client.start(successPayload.assistantId, {
        variableValues: successPayload.variableValues,
        metadata: successPayload.metadata,
      });

      setSessionKey(successPayload.sessionKey);
      setRemainingTrialSessions(successPayload.remainingTrialSessions);
      setCallState("starting");
      setStatus("Initializing trial call...");
    } catch (error) {
      setCallState("error");
      setStatus(error instanceof Error ? error.message : "Unable to start trial call.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStopTrial() {
    if (!vapiRef.current) {
      return;
    }

    setLoading(true);
    try {
      await vapiRef.current.stop();
      setCallState("ended");
      setStatus("Trial call stopped.");
    } catch {
      setCallState("error");
      setStatus("Unable to stop call cleanly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass panel">
      <div className="tag">Web trial</div>
      <h3>Start a 2-minute practice call</h3>
      <p className="disclaimer">
        You can run up to 3 lifetime trial sessions with this verified email before moving to a paid plan.
      </p>

      <div className="grid">
        <div className="metric">
          <span>Session key</span>
          <strong>{sessionKey ?? "Pending"}</strong>
        </div>
        <div className="metric">
          <span>Trial sessions remaining</span>
          <strong>{remainingTrialSessions ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>Call status</span>
          <strong>{callState}</strong>
        </div>
      </div>

      <div className="hero-actions">
        <button className="button" onClick={handleStartTrial} disabled={loading || limitReached}>
          {loading ? "Starting..." : "Start web trial"}
        </button>
        <button className="button secondary" onClick={handleStopTrial} disabled={loading || !vapiRef.current}>
          Stop call
        </button>
      </div>

      {status ? <p className="disclaimer">{status}</p> : null}

      {limitReached ? (
        <div className="hero-actions">
          <Link className="button" href={limitCtaUrl}>
            Upgrade to continue training
          </Link>
          <Link className="button secondary" href="/#pricing">
            Back to pricing
          </Link>
        </div>
      ) : null}
    </div>
  );
}
