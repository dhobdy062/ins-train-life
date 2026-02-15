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

function toFriendlyTrialError(rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("trial limit reached")) {
    return "You have reached the free practice limit for this email.";
  }

  if (message.includes("network") || message.includes("failed to fetch")) {
    return "We could not connect right now. Check your connection and try again.";
  }

  if (
    message.includes("unable to start trial call") ||
    message.includes("unable to connect trial call") ||
    message.includes("http")
  ) {
    return "We could not start your practice call. Please try again in a moment.";
  }

  return "Something went wrong while starting your practice call. Please try again.";
}

export default function TrialConsole() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [callState, setCallState] = useState("ready");
  const [remainingTrialSessions, setRemainingTrialSessions] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [limitCtaUrl, setLimitCtaUrl] = useState("/sign-up");
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
      setStatus("Call connected. Your prospect is live.");
    });

    client.on("call-end", () => {
      setCallState("ended");
      setStatus("Call ended. Great work.");
    });

    client.on("error", (error) => {
      setCallState("error");
      setStatus(toFriendlyTrialError(formatUnknownError(error)));
    });

    client.on("call-start-failed", (event) => {
      setCallState("error");
      setStatus(toFriendlyTrialError(`Unable to connect trial call: ${formatUnknownError(event)}`));
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
          setStatus(toFriendlyTrialError(errorPayload.message ?? "Trial limit reached."));
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

      setRemainingTrialSessions(successPayload.remainingTrialSessions);
      setAgentBrand(successPayload.variableValues.brand_name ?? "Cream No Sugar");
      setCallState("starting");
      setStatus("Practice call is preparing. Connecting now...");
    } catch (error) {
      setCallState("error");
      setStatus(toFriendlyTrialError(formatUnknownError(error)));
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
      setStatus("Call stopped.");
    } catch {
      setCallState("error");
      setStatus("We could not end the call cleanly. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass panel">
      <div className="tag">Practice session</div>
      <h3>Start a short practice call</h3>
      <p className="disclaimer">
        You can run up to 3 free practice sessions with this verified email before moving to a paid plan.
      </p>

      <div className="grid">
        <div className="metric">
          <span>Free sessions remaining</span>
          <strong>{remainingTrialSessions ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>Brand</span>
          <strong>{agentBrand}</strong>
        </div>
        <div className="metric">
          <span>Call status</span>
          <strong>{callState}</strong>
        </div>
      </div>

      <div className="hero-actions">
        <button className="button" onClick={handleStartTrial} disabled={loading || limitReached}>
          {loading ? "Starting..." : "Start practice call"}
        </button>
        <button className="button secondary" onClick={handleStopTrial} disabled={loading || !vapiRef.current}>
          Stop call
        </button>
      </div>

      {status ? <p className="disclaimer">{status}</p> : null}

      {limitReached ? (
        <div className="hero-actions">
          <Link className="button" href={limitCtaUrl}>
            Upgrade to continue practice
          </Link>
          <Link className="button secondary" href="/#pricing">
            Back to pricing
          </Link>
        </div>
      ) : null}
    </div>
  );
}
