"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type TrialStartSuccess = {
  sessionKey: string;
  assistantId: string;
  publicKey: string;
  remainingTrialSessions: number;
  variableValues: Record<string, string>;
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

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error";
    }
  }
  return "Unknown error";
}

export default function TrialConsole() {
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [callState, setCallState] = useState("ready");
  const [remainingTrialSessions, setRemainingTrialSessions] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [limitCtaUrl, setLimitCtaUrl] = useState("/sign-up");
  const [sequenceStage, setSequenceStage] = useState<string>("Pending");
  const [agentBrand, setAgentBrand] = useState<string>("Cream No Sugar");
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
      setStatus(`Call error: ${formatUnknownError(error)}`);
    });

    client.on("call-start-failed", (event) => {
      setCallState("error");
      setStatus(`Unable to connect trial call: ${formatUnknownError(event)}`);
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

      const payloadText = await response.text();
      const payload = (() => {
        try {
          return JSON.parse(payloadText) as TrialStartSuccess | TrialStartError;
        } catch {
          return {};
        }
      })();
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
      setSequenceStage(successPayload.variableValues.email_sequence_stage ?? "trainee_invitation");
      setAgentBrand(successPayload.variableValues.brand_name ?? "Cream No Sugar");
      setCallState("starting");
      setStatus(
        `Initializing trial call... Email sequence stage: ${successPayload.variableValues.email_sequence_stage ?? "trainee_invitation"}.`,
      );
    } catch (error) {
      setCallState("error");
      setStatus(formatUnknownError(error));
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
          <span>Agent brand</span>
          <strong>{agentBrand}</strong>
        </div>
        <div className="metric">
          <span>Email sequence stage</span>
          <strong>{sequenceStage}</strong>
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
