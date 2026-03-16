"use client";

import { useRef, useState } from "react";

type SessionStartSuccess = {
  sessionKey: string;
  assistantId: string;
  publicKey: string;
  variableValues: Record<string, string>;
  metadata: Record<string, string>;
};

type VapiClient = {
  start: (assistant: string, options?: Record<string, unknown>) => Promise<unknown>;
  stop: () => Promise<void>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

type AssignedSessionStartConsoleProps = {
  sessionKey: string;
};

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

export default function AssignedSessionStartConsole({ sessionKey }: AssignedSessionStartConsoleProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [callState, setCallState] = useState("ready");
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
      setStatus("Call connected. Your trainer-assigned prospect is live.");
    });

    client.on("call-end", () => {
      setCallState("ended");
      setStatus("Call ended. Returning you to the dashboard.");
      window.setTimeout(() => {
        window.location.href = "/dashboard/trainee?refresh=1";
      }, 2000);
    });

    client.on("error", (error) => {
      setCallState("error");
      setStatus(formatUnknownError(error));
    });

    vapiRef.current = client;
    return client;
  }

  async function handleStart() {
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/vapi/trainee/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey }),
      });
      const payload = (await response.json().catch(() => ({}))) as SessionStartSuccess & { error?: string };
      if (!response.ok || !payload.assistantId) {
        throw new Error(payload.error ?? "Unable to start assigned session.");
      }

      const client = await ensureClient(payload.publicKey);
      await client.start(payload.assistantId, {
        variableValues: payload.variableValues,
        metadata: payload.metadata,
      });

      setCallState("starting");
      setStatus("Connecting your assigned session...");
    } catch (error) {
      setCallState("error");
      setStatus(formatUnknownError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    if (!vapiRef.current) {
      return;
    }

    setLoading(true);
    try {
      await vapiRef.current.stop();
      setCallState("ended");
      setStatus("Call stopped. Returning to dashboard.");
      window.setTimeout(() => {
        window.location.href = "/dashboard/trainee?refresh=1";
      }, 1500);
    } catch {
      setCallState("error");
      setStatus("We could not end the call cleanly. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass panel">
      <div className="tag">Assigned Session</div>
      <h3>Start your trainer-assigned call</h3>
      <p className="disclaimer">This call will use the exact objection sequence your trainer assigned to you.</p>

      <div className="grid">
        <div className="metric">
          <span>Session key</span>
          <strong>{sessionKey}</strong>
        </div>
        <div className="metric">
          <span>Call status</span>
          <strong>{callState}</strong>
        </div>
      </div>

      <div className="hero-actions">
        <button className="button" onClick={handleStart} disabled={loading}>
          {loading ? "Starting..." : "Start assigned session"}
        </button>
        <button className="button secondary" onClick={handleStop} disabled={loading || !vapiRef.current}>
          Stop call
        </button>
      </div>

      {status ? <p className="disclaimer">{status}</p> : null}
    </div>
  );
}
