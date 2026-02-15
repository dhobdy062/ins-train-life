"use client";

import { useMemo, useRef, useState } from "react";

type Difficulty = "D1" | "D2" | "D3" | "D4" | "D5";

type SessionBootstrapResponse = {
  sessionKey: string;
  assistantId: string;
  publicKey: string;
  variableValues: Record<string, string>;
  metadata: {
    orgId: string;
    trainerId: string;
    sessionKey: string;
    sequenceStage?: string;
  };
};

type SessionBootstrapError = {
  code?: string;
  error?: string;
  message?: string;
  minutesUsed?: number;
  minutesLimit?: number | null;
  minutesRemaining?: number;
};

type VapiClient = {
  start: (assistant: string, options?: Record<string, unknown>) => Promise<unknown>;
  stop: () => Promise<void>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

const DEFAULT_REBUTTALS: Record<string, string> = {
  busy: "I understand you are busy. This is a quick 15-minute policy review.",
  send_info: "I can send info, and a quick review helps tailor it to your current policy.",
  spouse: "That makes sense. We can schedule a time when your spouse can join.",
  timing: "No problem. We can pick a short time next week that works for you.",
  already_covered: "Great. This is exactly a review of what you already have.",
  not_interested: "Understood. This is a no-pressure policy review, not a sales pitch.",
  dont_remember: "No problem. I am following up on your previous life insurance request.",
};

const REBUTTAL_FIELDS = Object.keys(DEFAULT_REBUTTALS);

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

function toFriendlyCallError(rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("trial talk-time limit reached") || message.includes("trial limit reached")) {
    return "You have reached your current talk-time limit. Upgrade to continue starting new calls.";
  }

  if (message.includes("network") || message.includes("failed to fetch")) {
    return "We could not connect right now. Check your connection and try again.";
  }

  if (
    message.includes("unable to initialize session") ||
    message.includes("unable to connect call") ||
    message.includes("http")
  ) {
    return "We could not start the practice call. Please try again in a moment.";
  }

  return "Something went wrong while starting the practice call. Please try again.";
}

function formatRoleLabel(role: string) {
  if (!role) {
    return "Trainer";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

type DemoConsoleProps = {
  startDisabled?: boolean;
  blockedStatusMessage?: string | null;
};

export default function DemoConsole({ startDisabled = false, blockedStatusMessage = null }: DemoConsoleProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>("D2");
  const [objectionsRequired, setObjectionsRequired] = useState(3);
  const [rebuttals, setRebuttals] = useState(DEFAULT_REBUTTALS);
  const [callState, setCallState] = useState("ready");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agentRole, setAgentRole] = useState<string>("Trainer");
  const [agentBrand, setAgentBrand] = useState<string>("Cream No Sugar");

  const vapiRef = useRef<VapiClient | null>(null);

  const difficultyDescription = useMemo(() => {
    const descriptions: Record<Difficulty, string> = {
      D1: "Remembers request, mild time objections.",
      D2: "Skeptical and does not remember form fill.",
      D3: "Interested but spouse-dependent decision flow.",
      D4: "Defensive, already covered, needs reframing.",
      D5: "Hard mode, low patience and control-seeking.",
    };
    return descriptions[difficulty];
  }, [difficulty]);

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
      setStatus("Call ended. Your results will refresh shortly.");
    });

    client.on("error", (error) => {
      setCallState("error");
      setStatus(toFriendlyCallError(formatUnknownError(error)));
    });

    client.on("call-start-failed", (event) => {
      setCallState("error");
      setStatus(toFriendlyCallError(`Unable to connect call: ${formatUnknownError(event)}`));
    });

    vapiRef.current = client;
    return client;
  }

  async function handleStart() {
    if (startDisabled) {
      setCallState("blocked");
      setStatus(blockedStatusMessage ?? "Call start is currently unavailable for this team.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/vapi/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty,
          objectionsRequired,
          rebuttals,
        }),
      });

      const payloadText = await response.text();
      const payload = (() => {
        try {
          return JSON.parse(payloadText) as SessionBootstrapResponse | SessionBootstrapError;
        } catch {
          return {};
        }
      })();

      if (!response.ok || !("assistantId" in payload)) {
        const errorPayload = payload as SessionBootstrapError;
        if (errorPayload.code === "TRIAL_LIMIT_REACHED") {
          setCallState("blocked");
          throw new Error(
            errorPayload.message ??
              "Trial talk-time limit reached for this organization. Upgrade to continue starting calls.",
          );
        }

        const maybeError =
          typeof payload === "object" && payload !== null && ("error" in payload || "message" in payload)
            ? (((payload as { error?: string; message?: string }).error ??
                (payload as { error?: string; message?: string }).message) as string | undefined)
            : undefined;
        throw new Error(maybeError ?? `Unable to initialize session (HTTP ${response.status}).`);
      }

      const client = await ensureClient(payload.publicKey);
      await client.start(payload.assistantId, {
        variableValues: payload.variableValues,
        metadata: payload.metadata,
      });

      setAgentRole(formatRoleLabel(payload.variableValues.dashboard_role ?? "trainer"));
      setAgentBrand(payload.variableValues.brand_name ?? "Cream No Sugar");
      setCallState("starting");
      setStatus("Practice call is preparing. Connecting now...");
    } catch (error) {
      setCallState("error");
      setStatus(toFriendlyCallError(formatUnknownError(error)));
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
      <div className="tag">Practice studio</div>
      <h3>Run a guided practice call</h3>
      <p className="disclaimer">
        1. Choose difficulty and objection count. 2. Update response guides. 3. Start the call. 4. Review coaching
        feedback after the session ends.
      </p>

      <div className="grid">
        <label className="field">
          Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
            <option value="D1">D1</option>
            <option value="D2">D2</option>
            <option value="D3">D3</option>
            <option value="D4">D4</option>
            <option value="D5">D5</option>
          </select>
          <span className="disclaimer">{difficultyDescription}</span>
        </label>

        <label className="field">
          Objections required
          <input
            type="number"
            min={1}
            max={7}
            value={objectionsRequired}
            onChange={(event) => setObjectionsRequired(Number(event.target.value || 3))}
          />
          <span className="disclaimer">Valid range is 1-7.</span>
        </label>
      </div>

      <div className="split">
        {REBUTTAL_FIELDS.map((key) => (
          <label className="field" key={key}>
            {key.replace("_", " ")}
            <input
              value={rebuttals[key]}
              onChange={(event) =>
                setRebuttals((previous) => ({
                  ...previous,
                  [key]: event.target.value,
                }))
              }
            />
          </label>
        ))}
      </div>

      <div className="grid">
        <div className="metric">
          <span>Brand</span>
          <strong>{agentBrand}</strong>
        </div>
        <div className="metric">
          <span>Role</span>
          <strong>{agentRole}</strong>
        </div>
        <div className="metric">
          <span>Call status</span>
          <strong>{callState}</strong>
        </div>
        <div className="metric">
          <span>Current difficulty</span>
          <strong>{difficulty}</strong>
        </div>
      </div>

      <div className="hero-actions">
        <button className="button" onClick={handleStart} disabled={loading || startDisabled}>
          {loading ? "Starting..." : "Start practice call"}
        </button>
        <button className="button secondary" onClick={handleStop} disabled={loading || !vapiRef.current}>
          Stop call
        </button>
      </div>

      {status ? <p className="disclaimer">{status}</p> : null}
    </div>
  );
}
