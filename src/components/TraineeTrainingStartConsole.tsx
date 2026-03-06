"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./TraineeTrainingStartConsole.module.css";

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

type SessionCookieResponse = {
  ok?: boolean;
  error?: string;
  trainee?: {
    id: string;
    name: string;
    difficulty: string;
    numObjections: number;
    status: string;
  };
};

type VapiClient = {
  start: (assistant: string, options?: Record<string, unknown>) => Promise<unknown>;
  stop: () => Promise<void>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

type TraineeTrainingStartConsoleProps = {
  inviteToken: string | null;
};

type TraineeStartUiState =
  | "validating_invite"
  | "ready"
  | "starting"
  | "in_call"
  | "loading_results"
  | "call_ended"
  | "error";

const RESULTS_PROCESSING_DELAY_MS = 3000;
const RESULTS_REDIRECT_SECONDS = 5;

function toFriendlyError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("access confirmation")) {
    return "We could not confirm access from this device. Please retry from the same device and network.";
  }
  if (normalized.includes("invalid or expired invite")) {
    return "This invite link is invalid or expired. Ask your trainer for a new link.";
  }
  if (
    normalized.includes("notallowederror") ||
    normalized.includes("permission denied") ||
    normalized.includes("microphone")
  ) {
    return "Microphone access is required. Enable microphone permission in your browser settings and try again.";
  }
  if (normalized.includes("network") || normalized.includes("failed to fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  return message;
}

function toCallStatusLabel(state: TraineeStartUiState) {
  if (state === "in_call") {
    return "Live";
  }
  if (state === "starting") {
    return "Connecting";
  }
  if (state === "loading_results" || state === "call_ended") {
    return "Ended";
  }
  if (state === "error") {
    return "Issue";
  }
  return "Ready";
}

function estimateDuration(numObjections: number | null) {
  if (!numObjections || numObjections <= 0) {
    return "5-8 min";
  }
  const min = Math.max(4, Math.round(numObjections * 1.2 + 1));
  return `${min}-${min + 3} min`;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export default function TraineeTrainingStartConsole({ inviteToken }: TraineeTrainingStartConsoleProps) {
  const router = useRouter();
  const [uiState, setUiState] = useState<TraineeStartUiState>("validating_invite");
  const [status, setStatus] = useState<string | null>("Validating your invite link...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [traineeName, setTraineeName] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [numObjections, setNumObjections] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const vapiRef = useRef<VapiClient | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const resultsDelayRef = useRef<number | null>(null);
  const elapsedTickerRef = useRef<number | null>(null);

  const resultsUrl = useMemo(
    () => `/dashboard/trainee?refresh=1${inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : ""}`,
    [inviteToken],
  );

  const validateInvite = useCallback(async () => {
    if (!inviteToken) {
      setUiState("error");
      setErrorMessage("Invite token is missing.");
      setStatus(null);
      return;
    }

    setUiState("validating_invite");
    setStatus("Validating your invite link...");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/trainee/session-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken }),
      });

      const payload = (await response.json().catch(() => ({}))) as SessionCookieResponse;
      if (!response.ok || !payload.ok || !payload.trainee) {
        throw new Error(payload.error ?? "Invalid or expired invite token.");
      }

      setTraineeName(payload.trainee.name);
      setDifficulty(payload.trainee.difficulty);
      setNumObjections(payload.trainee.numObjections);
      setUiState("ready");
      setStatus("Start your training call when you're ready.");
    } catch (error) {
      setUiState("error");
      setErrorMessage(toFriendlyError(error instanceof Error ? error.message : "Unable to validate invite."));
      setStatus(null);
    }
  }, [inviteToken]);

  useEffect(() => {
    void validateInvite();
  }, [validateInvite]);

  useEffect(() => {
    if (uiState !== "in_call") {
      if (elapsedTickerRef.current) {
        window.clearInterval(elapsedTickerRef.current);
        elapsedTickerRef.current = null;
      }
      return;
    }

    elapsedTickerRef.current = window.setInterval(() => {
      if (!callStartedAtRef.current) {
        return;
      }
      const elapsed = Math.max(Math.floor((Date.now() - callStartedAtRef.current) / 1000), 0);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => {
      if (elapsedTickerRef.current) {
        window.clearInterval(elapsedTickerRef.current);
        elapsedTickerRef.current = null;
      }
    };
  }, [uiState]);

  useEffect(() => {
    if (uiState !== "call_ended") {
      setRedirectCountdown(null);
      return;
    }

    setRedirectCountdown(RESULTS_REDIRECT_SECONDS);
    const interval = window.setInterval(() => {
      setRedirectCountdown((previous) => {
        if (previous === null) {
          return null;
        }
        if (previous <= 1) {
          window.clearInterval(interval);
          router.push(resultsUrl);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [router, resultsUrl, uiState]);

  useEffect(
    () => () => {
      if (resultsDelayRef.current) {
        window.clearTimeout(resultsDelayRef.current);
      }
      if (elapsedTickerRef.current) {
        window.clearInterval(elapsedTickerRef.current);
      }
    },
    [],
  );

  async function ensureClient(publicKey: string) {
    if (vapiRef.current) {
      return vapiRef.current;
    }

    const vapiModule = await import("@vapi-ai/web");
    const VapiCtor = (vapiModule.default ?? vapiModule) as unknown as new (key: string) => VapiClient;
    const client = new VapiCtor(publicKey);

    client.on("call-start", () => {
      callStartedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setUiState("in_call");
      setErrorMessage(null);
      setStatus("You're live. Handle each objection clearly and confidently.");
    });

    client.on("call-end", () => {
      setUiState("loading_results");
      setStatus("Call ended. Your score is being prepared.");
      if (resultsDelayRef.current) {
        window.clearTimeout(resultsDelayRef.current);
      }
      resultsDelayRef.current = window.setTimeout(() => {
        setUiState("call_ended");
        setStatus("Results are ready.");
      }, RESULTS_PROCESSING_DELAY_MS);
    });

    client.on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      setUiState("error");
      setErrorMessage(toFriendlyError(message));
      setStatus(null);
    });

    vapiRef.current = client;
    return client;
  }

  async function handleStartTraining() {
    if (!inviteToken) {
      setUiState("error");
      setErrorMessage("Invite token is missing.");
      setStatus(null);
      return;
    }

    setUiState("starting");
    setStatus("Confirming access and preparing your call...");
    setErrorMessage(null);

    try {
      const consentResponse = await fetch("/api/trainee/consent-ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken }),
      });

      const consentPayload = (await consentResponse.json().catch(() => ({}))) as ConsentResponse;
      if (!consentResponse.ok || !consentPayload.ok) {
        throw new Error(consentPayload.error ?? "Unable to capture access confirmation.");
      }

      setTraineeName(consentPayload.traineeName ?? traineeName);
      setDifficulty(consentPayload.difficultyLevel ?? difficulty);
      setNumObjections(consentPayload.numObjections ?? numObjections);

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

      setUiState("starting");
      setStatus("Preparing your session. Connecting now...");
    } catch (error) {
      setUiState("error");
      setErrorMessage(toFriendlyError(error instanceof Error ? error.message : "Unable to start training."));
      setStatus(null);
    }
  }

  async function handleStopTraining() {
    if (!vapiRef.current) {
      return;
    }

    setUiState("loading_results");
    setStatus("Ending call and preparing your score...");
    setErrorMessage(null);

    try {
      await vapiRef.current.stop();
    } catch {
      setUiState("error");
      setErrorMessage("Unable to stop call cleanly. Please retry.");
      setStatus(null);
    }
  }

  const callStatusLabel = toCallStatusLabel(uiState);
  const estimatedDuration = estimateDuration(numObjections);
  const isBusy = uiState === "validating_invite" || uiState === "starting" || uiState === "loading_results";
  const canStop = (uiState === "in_call" || uiState === "starting") && Boolean(vapiRef.current);

  if (!inviteToken) {
    return (
      <div className={styles.surface}>
        <div className={styles.topline}>Training link</div>
        <h2 className={styles.title}>Invite link is missing</h2>
        <p className={styles.subtitle}>Ask your trainer to resend your training invitation email.</p>
        <Link className={styles.secondaryAction} href="/">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.surface}>
      <div className={styles.topline}>Trainee Training</div>
      <h2 className={styles.title}>{traineeName ? `Welcome, ${traineeName}` : "Start your training call"}</h2>
      <p className={styles.subtitle}>
        You are about to run your guided training call. Your trainer invited you to this session.
      </p>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span>Difficulty</span>
          <strong>{difficulty ?? "Loading..."}</strong>
        </div>
        <div className={styles.metric}>
          <span>Objections</span>
          <strong>{numObjections ?? "Loading..."}</strong>
        </div>
        <div className={styles.metric}>
          <span>Estimated time</span>
          <strong>{estimatedDuration}</strong>
        </div>
        <div className={styles.metric}>
          <span>Call status</span>
          <strong>{callStatusLabel}</strong>
        </div>
      </div>

      {uiState === "in_call" ? (
        <div className={styles.callShell}>
          <span className={styles.liveBadge}>Live call</span>
          <span className={styles.elapsed}>Elapsed {formatElapsed(elapsedSeconds)}</span>
        </div>
      ) : null}

      <div className={styles.actions}>
        <button
          className={styles.primaryAction}
          onClick={handleStartTraining}
          disabled={isBusy || uiState === "in_call" || uiState === "call_ended"}
        >
          {uiState === "starting" ? "Connecting..." : "Start Training"}
        </button>
        <button className={styles.secondaryAction} onClick={handleStopTraining} disabled={!canStop}>
          End Call
        </button>
        {uiState === "call_ended" ? (
          <Link className={styles.primaryAction} href={resultsUrl}>
            View Results
          </Link>
        ) : null}
      </div>

      {status ? <p className={styles.status}>{status}</p> : null}
      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      {uiState === "call_ended" ? (
        <p className={styles.redirectNotice}>
          Redirecting to your dashboard{redirectCountdown !== null ? ` in ${redirectCountdown}...` : "..."}
        </p>
      ) : null}

      {uiState === "error" ? (
        <button className={styles.inlineLink} onClick={() => void validateInvite()}>
          Retry with this invite link
        </button>
      ) : null}

      <p className={styles.helpText}>Having trouble? Ask your trainer for a new invite link.</p>
    </div>
  );
}
