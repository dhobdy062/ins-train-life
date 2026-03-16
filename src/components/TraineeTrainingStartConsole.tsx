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
    email?: string;
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
const CONNECTING_TIMEOUT_MS = 20000;

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const candidateKeys = ["message", "error", "details", "reason"];
    for (const key of candidateKeys) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
  }

  return fallback;
}

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
  if (normalized.includes("email does not match")) {
    return "Email verification failed. Enter the same email address where the invite was delivered.";
  }
  if (normalized.includes("timed out") || normalized.includes("timeout")) {
    return "Connection timed out while starting the call. Retry and confirm microphone access is enabled.";
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
  const [traineeEmail, setTraineeEmail] = useState<string | null>(null);
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [ipConsentChecked, setIpConsentChecked] = useState(false);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [numObjections, setNumObjections] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const vapiRef = useRef<VapiClient | null>(null);
  const uiStateRef = useRef<TraineeStartUiState>("validating_invite");
  const callStartedAtRef = useRef<number | null>(null);
  const resultsDelayRef = useRef<number | null>(null);
  const elapsedTickerRef = useRef<number | null>(null);
  const connectingTimeoutRef = useRef<number | null>(null);

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
      setTraineeEmail(payload.trainee.email ?? null);
      setDifficulty(payload.trainee.difficulty);
      setNumObjections(payload.trainee.numObjections);
      setUiState("ready");
      setStatus("Start your training call when you're ready.");
    } catch (error) {
      setUiState("error");
      setErrorMessage(toFriendlyError(extractErrorMessage(error, "Unable to validate invite.")));
      setStatus(null);
    }
  }, [inviteToken]);

  useEffect(() => {
    void validateInvite();
  }, [validateInvite]);

  useEffect(() => {
    uiStateRef.current = uiState;
  }, [uiState]);

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
      if (connectingTimeoutRef.current) {
        window.clearTimeout(connectingTimeoutRef.current);
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
      if (connectingTimeoutRef.current) {
        window.clearTimeout(connectingTimeoutRef.current);
        connectingTimeoutRef.current = null;
      }
      callStartedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setUiState("in_call");
      setErrorMessage(null);
      setStatus("You're live. Handle each objection clearly and confidently.");
    });

    client.on("call-end", () => {
      if (connectingTimeoutRef.current) {
        window.clearTimeout(connectingTimeoutRef.current);
        connectingTimeoutRef.current = null;
      }
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
      if (connectingTimeoutRef.current) {
        window.clearTimeout(connectingTimeoutRef.current);
        connectingTimeoutRef.current = null;
      }
      const message = extractErrorMessage(error, "Unable to connect to training.");
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

    if (!isEmailVerified) {
      setUiState("error");
      setErrorMessage("Email does not match the invitation.");
      setStatus(null);
      return;
    }

    if (!ipConsentChecked) {
      setUiState("error");
      setErrorMessage("Confirm access from this device before starting training.");
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
        body: JSON.stringify({ inviteToken, confirmedEmail: emailConfirmation.trim() }),
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
        body: JSON.stringify({ inviteToken, confirmedEmail: emailConfirmation.trim() }),
      });

      const payload = (await response.json().catch(() => ({}))) as SessionStartResponse;
      if (!response.ok || !payload.assistantId) {
        throw new Error(payload.error ?? "Unable to start training.");
      }

      const client = await ensureClient(payload.publicKey);
      if (connectingTimeoutRef.current) {
        window.clearTimeout(connectingTimeoutRef.current);
      }
      connectingTimeoutRef.current = window.setTimeout(() => {
        if (uiStateRef.current !== "starting") {
          return;
        }
        setUiState("error");
        setErrorMessage(
          toFriendlyError("Connection timed out while starting the call. Please retry and confirm browser permissions."),
        );
        setStatus(null);
      }, CONNECTING_TIMEOUT_MS);
      await client.start(payload.assistantId, {
        variableValues: payload.variableValues,
        metadata: payload.metadata,
      });

      setUiState("starting");
      setStatus("Preparing your session. Connecting now...");
    } catch (error) {
      if (connectingTimeoutRef.current) {
        window.clearTimeout(connectingTimeoutRef.current);
        connectingTimeoutRef.current = null;
      }
      setUiState("error");
      setErrorMessage(toFriendlyError(extractErrorMessage(error, "Unable to start training.")));
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
    if (connectingTimeoutRef.current) {
      window.clearTimeout(connectingTimeoutRef.current);
      connectingTimeoutRef.current = null;
    }

    try {
      await vapiRef.current.stop();
    } catch {
      if (connectingTimeoutRef.current) {
        window.clearTimeout(connectingTimeoutRef.current);
        connectingTimeoutRef.current = null;
      }
      setUiState("error");
      setErrorMessage("Unable to stop call cleanly. Please retry.");
      setStatus(null);
    }
  }

  const callStatusLabel = toCallStatusLabel(uiState);
  const estimatedDuration = estimateDuration(numObjections);
  const normalizedConfirmedEmail = emailConfirmation.trim().toLowerCase();
  const normalizedInviteEmail = traineeEmail?.trim().toLowerCase() ?? "";
  const isEmailVerified = normalizedInviteEmail.length > 0 && normalizedConfirmedEmail === normalizedInviteEmail;
  const isVerificationIncomplete = !isEmailVerified || !ipConsentChecked;
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

      {uiState !== "in_call" && uiState !== "call_ended" ? (
        <div className={styles.verificationCard}>
          <p className={styles.verificationTitle}>Identity and access verification</p>
          <p className={styles.verificationText}>
            Enter the email address that received the invite and confirm this device for IP-based access control.
          </p>
          <label className={styles.inputLabel} htmlFor="trainee-email-confirmation">
            Invited email
          </label>
          <input
            id="trainee-email-confirmation"
            className={styles.input}
            autoComplete="email"
            inputMode="email"
            placeholder="name@company.com"
            value={emailConfirmation}
            onChange={(event) => setEmailConfirmation(event.target.value)}
            disabled={isBusy}
          />
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={ipConsentChecked}
              onChange={(event) => setIpConsentChecked(event.target.checked)}
              disabled={isBusy}
            />
            <span>I consent to this session recording the IP/network signature used to start training.</span>
          </label>
        </div>
      ) : null}

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
          disabled={isBusy || uiState === "in_call" || uiState === "call_ended" || isVerificationIncomplete}
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

      <p className={styles.helpText}>
        Trainee links are invite-only and do not require a dashboard account. Ask your trainer for a fresh invite if
        this one fails.
      </p>
    </div>
  );
}
