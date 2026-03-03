"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ConsentResponse = {
  ok?: boolean;
  error?: string;
  traineeName?: string;
  difficultyLevel?: string;
  numObjections?: number;
  expectedRebuttals?: string[];
};

type SessionStartResponse = {
  sessionKey: string;
  assistantId: string;
  publicKey: string;
  variableValues: Record<string, string>;
  metadata: Record<string, string>;
  error?: string;
  code?: string;
};

type VapiClient = {
  start: (assistant: string, options?: Record<string, unknown>) => Promise<unknown>;
  stop: () => Promise<void>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

type TraineeTrainingStartConsoleProps = {
  inviteToken: string | null;
};

function toFriendlyError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("ip consent")) {
    return "Please approve identity linking before starting training.";
  }
  if (normalized.includes("invalid or expired invite")) {
    return "This invite link is invalid or expired. Ask your trainer for a new link.";
  }
  if (normalized.includes("network") || normalized.includes("failed to fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  return message;
}

export default function TraineeTrainingStartConsole({ inviteToken }: TraineeTrainingStartConsoleProps) {
  const [consenting, setConsenting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);
  const [traineeName, setTraineeName] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [numObjections, setNumObjections] = useState<number | null>(null);
  const [callState, setCallState] = useState("ready");
  const [showResultsCta, setShowResultsCta] = useState(false);
  const vapiRef = useRef<VapiClient | null>(null);

  useEffect(() => {
    if (!inviteToken) {
      return;
    }

    void fetch("/api/trainee/session-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteToken }),
    }).catch(() => null);
  }, [inviteToken]);

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
      setShowResultsCta(true);
      setStatus("Call ended. Your score will appear in your dashboard shortly.");
    });

    client.on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      setCallState("error");
      setStatus(toFriendlyError(message));
    });

    vapiRef.current = client;
    return client;
  }

  async function handleConsent() {
    if (!inviteToken) {
      setStatus("Invite token is missing.");
      return;
    }

    setConsenting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/trainee/consent-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken }),
      });

      const payload = (await response.json().catch(() => ({}))) as ConsentResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to capture consent.");
      }

      setConsented(true);
      setTraineeName(payload.traineeName ?? null);
      setDifficulty(payload.difficultyLevel ?? null);
      setNumObjections(payload.numObjections ?? null);
      setStatus("Identity link complete. You can now start training.");
    } catch (error) {
      setStatus(toFriendlyError(error instanceof Error ? error.message : "Unable to capture consent."));
    } finally {
      setConsenting(false);
    }
  }

  async function handleStartTraining() {
    if (!inviteToken) {
      setStatus("Invite token is missing.");
      return;
    }

    setStarting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/vapi/trainee/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken }),
      });

      const payload = (await response.json().catch(() => ({}))) as SessionStartResponse;
      if (!response.ok || !payload.assistantId) {
        throw new Error(payload.error ?? "Unable to start training.");
      }

      const client = await ensureClient(payload.publicKey);
      await client.start(payload.assistantId, {
        variableValues: payload.variableValues,
        metadata: payload.metadata,
      });

      setCallState("starting");
      setStatus("Preparing your session. Connecting now...");
    } catch (error) {
      setCallState("error");
      setStatus(toFriendlyError(error instanceof Error ? error.message : "Unable to start training."));
    } finally {
      setStarting(false);
    }
  }

  async function handleStopTraining() {
    if (!vapiRef.current) {
      return;
    }

    setStarting(true);
    try {
      await vapiRef.current.stop();
      setCallState("ended");
      setShowResultsCta(true);
      setStatus("Call stopped.");
    } catch {
      setCallState("error");
      setStatus("Unable to stop call cleanly. Please retry.");
    } finally {
      setStarting(false);
    }
  }

  if (!inviteToken) {
    return (
      <div className="glass panel">
        <div className="tag">Training link</div>
        <h3>Invite link is missing</h3>
        <p className="disclaimer">Ask your trainer to resend your training invitation email.</p>
        <Link className="button secondary" href="/">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="glass panel">
      <div className="tag">Trainee start</div>
      <h3>{traineeName ? `Welcome ${traineeName}` : "Start your training session"}</h3>
      <p className="disclaimer">
        The app links your training identity to your network IP after consent. Your trainer does not enter your IP manually.
      </p>

      <div className="grid">
        <div className="metric">
          <span>Difficulty</span>
          <strong>{difficulty ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>Objections</span>
          <strong>{numObjections ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>Identity linked</span>
          <strong>{consented ? "Yes" : "No"}</strong>
        </div>
        <div className="metric">
          <span>Call status</span>
          <strong>{callState}</strong>
        </div>
      </div>

      <div className="hero-actions">
        <button className="button secondary" onClick={handleConsent} disabled={consenting || consented}>
          {consented ? "Identity linked" : consenting ? "Linking..." : "Allow IP identity link"}
        </button>
        <button className="button" onClick={handleStartTraining} disabled={starting || !consented}>
          {starting ? "Starting..." : "Start Training"}
        </button>
        <button className="button secondary" onClick={handleStopTraining} disabled={starting || !vapiRef.current}>
          Stop Call
        </button>
        {showResultsCta ? (
          <Link
            className="button"
            href={`/dashboard/trainee?refresh=1${inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : ""}`}
          >
            View Results
          </Link>
        ) : null}
      </div>

      {status ? <p className="disclaimer">{status}</p> : null}
    </div>
  );
}
