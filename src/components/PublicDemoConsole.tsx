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

export type PublicDemoState = "default" | "verified" | "invalid-link";

type PublicDemoConsoleProps = {
  state: PublicDemoState;
  hasValidDemoAccess: boolean;
  trialLimitReached?: boolean;
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

export function toFriendlyPublicDemoError(rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("verification required") || message.includes("invalid verification token")) {
    return "Verification is required before you can start a demo call. Request a fresh link and try again.";
  }

  if (message.includes("trial limit reached")) {
    return "You have reached the free demo limit for this email.";
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

export function isDemoCallBlocked(state: PublicDemoState, hasValidDemoAccess: boolean) {
  return state === "invalid-link" || !hasValidDemoAccess;
}

function getInitialStatus(state: PublicDemoState, hasValidDemoAccess: boolean) {
  if (state === "verified" && hasValidDemoAccess) {
    return "Your email is verified. Start a demo call whenever you are ready.";
  }

  if (state === "invalid-link") {
    return "This verification link is invalid or expired. Request a fresh demo link from the landing page.";
  }

  if (!hasValidDemoAccess) {
    return "Verification is required before you can start a demo call. Request a fresh link from the landing page.";
  }

  return "Your demo access is ready. Start a call when you want another live rep.";
}

export default function PublicDemoConsole({
  state,
  hasValidDemoAccess,
  trialLimitReached = false,
}: PublicDemoConsoleProps) {
  const demoCallBlocked = isDemoCallBlocked(state, hasValidDemoAccess);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(getInitialStatus(state, hasValidDemoAccess));
  const [callState, setCallState] = useState("ready");
  const [remainingTrialSessions, setRemainingTrialSessions] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(trialLimitReached);
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
      setStatus("Demo call connected. Your prospect is live.");
    });

    client.on("call-end", () => {
      setCallState("ended");
      setStatus("Demo call ended. You can start another call while free sessions remain.");
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
    if (demoCallBlocked) {
      setCallState("blocked");
      setStatus(getInitialStatus(state, hasValidDemoAccess));
      return;
    }

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

  const showRecoveryActions = demoCallBlocked;

  return (
    <div className="glass panel">
      <div className="tag">Demo call access</div>
      <h3>Start a Demo Call</h3>
      <p className="disclaimer">
        Use this public page to launch a short live demo call. Your verified email unlocks up to 3 free sessions
        before you move to a paid plan.
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
        <button className="button" onClick={handleStartTrial} disabled={loading || limitReached || demoCallBlocked}>
          {loading ? "Starting..." : "Start a Demo Call"}
        </button>
        <button className="button secondary" onClick={handleStopTrial} disabled={loading || !vapiRef.current}>
          Stop call
        </button>
      </div>

      {status ? <p className="disclaimer">{status}</p> : null}

      {showRecoveryActions ? (
        <div className="hero-actions">
          <Link className="button" href="/">
            Request a new verification link
          </Link>
          <Link className="button secondary" href="/#pricing">
            View pricing
          </Link>
        </div>
      ) : null}

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
