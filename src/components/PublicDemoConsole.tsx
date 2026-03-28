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

type PublicDemoConsoleProps = {
  organizationName?: string;
  trialLimitReached?: boolean;
};

function PublicDemoStatus({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p className="disclaimer" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </p>
  );
}

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

export function toFriendlyPublicDemoError(rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("sign in")) {
    return "Sign in again to continue your demo.";
  }

  if (message.includes("organization context")) {
    return "Choose your organization before starting the demo.";
  }

  if (message.includes("demo access is unavailable")) {
    return "Demo access is not available for this account yet.";
  }

  if (message.includes("used both demo sessions") || message.includes("trial limit reached")) {
    return "You have used both demo sessions.";
  }

  if (message.includes("network") || message.includes("failed to fetch")) {
    return "We could not start your demo call right now. Check your connection and try again.";
  }

  if (
    message.includes("unable to start trial call") ||
    message.includes("unable to connect trial call") ||
    message.includes("http")
  ) {
    return "We could not start your demo call. Please try again in a moment.";
  }

  return "Something went wrong while starting your demo call. Please try again.";
}

function getInitialStatus(organizationName: string | undefined, trialLimitReached: boolean) {
  if (trialLimitReached) {
    return "You have used both demo sessions.";
  }

  if (organizationName) {
    return `You are signed in for ${organizationName}. Start a demo call whenever you are ready.`;
  }

  return "You are signed in. Start a demo call whenever you are ready.";
}

export default function PublicDemoConsole({
  organizationName,
  trialLimitReached = false,
}: PublicDemoConsoleProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(getInitialStatus(organizationName, trialLimitReached));
  const [callState, setCallState] = useState("ready");
  const [remainingTrialSessions, setRemainingTrialSessions] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(trialLimitReached);
  const [limitCtaUrl, setLimitCtaUrl] = useState("/checkout/start?plan=starter&interval=monthly");
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
      setStatus("Demo call connected. Your prospect is live.");
    });

    client.on("call-end", () => {
      setCallState("ended");
      setStatus("Demo call ended.");
    });

    client.on("error", (error) => {
      setCallState("error");
      setStatus(toFriendlyPublicDemoError(formatUnknownError(error)));
    });

    client.on("call-start-failed", (event) => {
      setCallState("error");
      setStatus(toFriendlyPublicDemoError(`Unable to connect trial call: ${formatUnknownError(event)}`));
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
          setLimitCtaUrl(errorPayload.ctaUrl ?? "/checkout/start?plan=starter&interval=monthly");
          setCallState("limit_reached");
          setStatus(toFriendlyPublicDemoError(errorPayload.message ?? "Trial limit reached."));
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
      setStatus("Demo call is preparing. Connecting now...");
    } catch (error) {
      setCallState("error");
      setStatus(toFriendlyPublicDemoError(formatUnknownError(error)));
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
      setStatus("Demo call stopped.");
    } catch {
      setCallState("error");
      setStatus("We could not end the demo call cleanly. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass panel">
      <div className="tag">Authenticated demo</div>
      <h3>Start a Demo Call</h3>
      <p className="disclaimer">
        Your demo is tied to your authenticated account and organization. You have up to 2 total demo sessions before
        moving into checkout.
      </p>

      <div className="grid">
        <div className="metric">
          <span>Organization</span>
          <strong>{organizationName ?? "Your organization"}</strong>
        </div>
        <div className="metric">
          <span>Sessions remaining</span>
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
          {loading ? "Starting..." : "Start a Demo Call"}
        </button>
        <button className="button secondary" onClick={handleStopTrial} disabled={loading || !vapiRef.current}>
          Stop call
        </button>
      </div>

      <PublicDemoStatus message={status} />

      {limitReached ? (
        <div className="hero-actions">
          <Link className="button" href={limitCtaUrl}>
            Upgrade to continue practice
          </Link>
          <Link className="button secondary" href="/workspace/dashboard">
            Open workspace
          </Link>
        </div>
      ) : null}
    </div>
  );
}
