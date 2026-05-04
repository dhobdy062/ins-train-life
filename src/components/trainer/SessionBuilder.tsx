"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getTrainingSessionEvaluationStatusLabel,
  type TrainingSessionEvaluationIssue,
  type TrainingSessionEvaluationStatus,
} from "@/lib/training-session-evaluation";
import {
  getAllowedDifficultiesForProduct,
  getTrainingProductConfig,
  normalizeDifficultyForProduct,
  TRAINING_PRODUCT_OPTIONS,
  type TrainingProductType,
} from "@/lib/training-products";
import {
  getDefaultObjectionLibraryForProduct,
  getDefaultRebuttalGuidesForProduct,
} from "@/lib/trainer-objections";

type TraineeOption = {
  traineeId: string;
  clerkUserId: string | null;
  name: string;
  difficultyLevel: string;
  numObjections: number;
};

type ObjectionRow = {
  text: string;
  rebuttalType: string;
  frequency: string;
};

type Difficulty = "D1" | "D2" | "D3" | "D4" | "D5";

type ObjectionLibrary = Record<Difficulty, ObjectionRow[]>;

type RecentSession = {
  sessionKey: string;
  traineeName: string;
  productType?: TrainingProductType;
  difficulty: string;
  objectionsRequired: number;
  selectedObjections: Array<{ order: number; text: string; rebuttalType: string }>;
  status: string;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  structuredOutcome: {
    rebuttalPerformanceScore?: number;
    appointmentSet?: boolean;
    callSummary?: string;
  } | null;
  recordingUrl: string | null;
  transcriptUrl: string | null;
  evaluation: {
    evaluationId: string;
    sessionKey: string;
    orgId: string;
    trainerId: string;
    traineeId: string | null;
    status: TrainingSessionEvaluationStatus;
    source: "automatic" | "manual";
    issues: TrainingSessionEvaluationIssue[];
    summary: string;
    attemptCount: number;
    lastCompletedAt: number | null;
    evaluatedAt: number;
    createdAt: number;
    updatedAt: number;
  } | null;
};

type SessionBuilderProps = {
  trainees: TraineeOption[];
  objectionLibrary: ObjectionLibrary;
  rebuttalGuides: Record<string, string>;
  recentSessions: RecentSession[];
};

type SessionRecoveryAction = "mark_missed" | "mark_failed" | "create_replacement";

function objectionKey(row: { text: string; rebuttalType: string }) {
  return `${row.text}::${row.rebuttalType}`;
}

function formatDateTime(timestamp: number | null) {
  if (!timestamp) {
    return "-";
  }
  return new Date(timestamp).toLocaleString();
}

export default function SessionBuilder({
  trainees,
  objectionLibrary,
  rebuttalGuides,
  recentSessions,
}: SessionBuilderProps) {
  const router = useRouter();
  const [selectedTraineeId, setSelectedTraineeId] = useState(trainees[0]?.traineeId ?? "");
  const [productType, setProductType] = useState<TrainingProductType>("life");
  const selectedTrainee = useMemo(
    () => trainees.find((item) => item.traineeId === selectedTraineeId) ?? null,
    [trainees, selectedTraineeId],
  );
  const [difficulty, setDifficulty] = useState<Difficulty>((selectedTrainee?.difficultyLevel as Difficulty) ?? "D2");
  const availableDifficulties = getAllowedDifficultiesForProduct(productType);
  const productObjectionLibrary = useMemo(
    () => (productType === "life" ? objectionLibrary : getDefaultObjectionLibraryForProduct(productType)),
    [objectionLibrary, productType],
  );
  const activeRebuttalGuides = useMemo(
    () => (productType === "life" ? rebuttalGuides : getDefaultRebuttalGuidesForProduct(productType)),
    [productType, rebuttalGuides],
  );
  const availableObjections = useMemo(
    () => productObjectionLibrary[difficulty] ?? [],
    [productObjectionLibrary, difficulty],
  );
  const [selectedObjections, setSelectedObjections] = useState<ObjectionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sessionActionState, setSessionActionState] = useState<{
    sessionKey: string;
    action: SessionRecoveryAction;
  } | null>(null);
  const [evaluationActionSessionKey, setEvaluationActionSessionKey] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTrainee) {
      setSelectedObjections([]);
      return;
    }

    const fallbackCount = Math.max(1, Math.min(selectedTrainee.numObjections, availableObjections.length));
    setSelectedObjections(availableObjections.slice(0, fallbackCount));
  }, [availableObjections, selectedTrainee]);

  function handleTraineeChange(nextTraineeId: string) {
    setSelectedTraineeId(nextTraineeId);
    const nextTrainee = trainees.find((item) => item.traineeId === nextTraineeId);
    if (nextTrainee) {
      setDifficulty(normalizeDifficultyForProduct(productType, nextTrainee.difficultyLevel) as Difficulty);
    }
  }

  function handleProductChange(nextProductType: TrainingProductType) {
    setProductType(nextProductType);
    setDifficulty((current) => normalizeDifficultyForProduct(nextProductType, current) as Difficulty);
  }

  function toggleObjection(row: ObjectionRow) {
    const key = objectionKey(row);
    setSelectedObjections((current) => {
      const exists = current.some((item) => objectionKey(item) === key);
      if (exists) {
        return current.filter((item) => objectionKey(item) !== key);
      }
      return [...current, row];
    });
  }

  function moveObjection(index: number, direction: -1 | 1) {
    setSelectedObjections((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  async function handleAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTrainee) {
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/trainer/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traineeId: selectedTrainee.traineeId,
          productType,
          difficulty,
          selectedObjections,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        sessionKey?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to assign session.");
      }

      setStatus(`Assigned session ${payload.sessionKey} to ${selectedTrainee.name}.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to assign session.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSessionRecovery(sessionKey: string, action: SessionRecoveryAction) {
    setSessionActionState({ sessionKey, action });
    setStatus(null);

    try {
      const response = await fetch(`/api/trainer/sessions/${encodeURIComponent(sessionKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        replacementSessionKey?: string | null;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to update this session.");
      }

      setStatus(payload.message ?? "Session updated.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update this session.");
    } finally {
      setSessionActionState(null);
    }
  }

  async function handleEvaluationRerun(sessionKey: string) {
    setEvaluationActionSessionKey(sessionKey);
    setStatus(null);

    try {
      const response = await fetch(`/api/trainer/sessions/${encodeURIComponent(sessionKey)}/evaluation`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        status?: TrainingSessionEvaluationStatus | null;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to re-run this evaluation.");
      }

      const nextStatus = payload.status ? getTrainingSessionEvaluationStatusLabel(payload.status) : "pending";
      setStatus(`Re-ran evaluation for ${sessionKey}. Current status: ${nextStatus}.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to re-run this evaluation.");
    } finally {
      setEvaluationActionSessionKey(null);
    }
  }

  function getRecoveryLabel(session: RecentSession) {
    if (session.status === "assigned") {
      return "Mark missed";
    }
    return "Mark failed";
  }

  function canCreateReplacement(session: RecentSession) {
    if (session.status === "completed") {
      return session.evaluation?.status === "failed";
    }

    return session.status === "assigned" || session.status === "started" || session.status === "abandoned";
  }

  return (
    <>
      <form className="form" onSubmit={handleAssign}>
        <div className="split">
          <label className="field">
            Trainee
            <select value={selectedTraineeId} onChange={(event) => handleTraineeChange(event.target.value)}>
              {trainees.map((trainee) => (
                <option value={trainee.traineeId} key={trainee.traineeId}>
                  {trainee.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Product
            <select value={productType} onChange={(event) => handleProductChange(event.target.value as TrainingProductType)}>
              {TRAINING_PRODUCT_OPTIONS.map((option) => (
                <option value={option.productType} key={option.productType}>
                  {option.productLabel}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Difficulty
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
              {availableDifficulties.map((level) => (
                <option value={level} key={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <div className="metric">
            <span>Objections selected</span>
            <strong>{selectedObjections.length}</strong>
            <span className="disclaimer">Count is derived from the ordered list below.</span>
          </div>
        </div>

        <div className="grid">
          <div className="metric" style={{ alignItems: "stretch" }}>
            <span>Available objections</span>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {availableObjections.map((row) => {
                const checked = selectedObjections.some((item) => objectionKey(item) === objectionKey(row));
                return (
                  <label key={objectionKey(row)} style={{ display: "grid", gap: 4, textAlign: "left" }}>
                    <span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleObjection(row)}
                        style={{ marginRight: 8 }}
                      />
                      {row.text}
                    </span>
                    <span className="disclaimer">{row.rebuttalType} • {row.frequency}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="metric" style={{ alignItems: "stretch" }}>
            <span>Presentation order</span>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {selectedObjections.length === 0 ? <span className="disclaimer">Select at least one objection.</span> : null}
              {selectedObjections.map((row, index) => (
                <div key={`${objectionKey(row)}_${index}`} style={{ display: "grid", gap: 6, textAlign: "left" }}>
                  <strong>{index + 1}. {row.text}</strong>
                  <span className="disclaimer">
                    Expected rebuttal: {row.rebuttalType} | {activeRebuttalGuides[row.rebuttalType] ?? "No guide configured."}
                  </span>
                  <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
                    <button type="button" className="button secondary" onClick={() => moveObjection(index, -1)}>
                      Move up
                    </button>
                    <button type="button" className="button secondary" onClick={() => moveObjection(index, 1)}>
                      Move down
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hero-actions">
          <button
            className="button"
            type="submit"
            disabled={loading || !selectedTrainee || selectedObjections.length === 0 || !selectedTrainee.clerkUserId}
          >
            {loading ? "Assigning..." : "Assign session"}
          </button>
        </div>

        {!selectedTrainee?.clerkUserId ? (
          <p className="disclaimer">
            This trainee&apos;s sign-in access is still syncing. Ask them to open their dashboard once, then try assigning the
            session again.
          </p>
        ) : null}
        {status ? <p className="disclaimer">{status}</p> : null}
      </form>

      <section className="glass panel" style={{ marginTop: 24 }}>
        <div className="tag">Recent Sessions</div>
        <h3>Assigned and completed trainee sessions</h3>
        {recentSessions.length === 0 ? (
          <p className="disclaimer">No assigned sessions yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {recentSessions.map((session) => (
              <article key={session.sessionKey} className="metric" style={{ alignItems: "stretch", textAlign: "left" }}>
                <span>
                  {session.traineeName} • {getTrainingProductConfig(session.productType ?? "life").productLabel} •{" "}
                  {session.difficulty} • {session.status}
                </span>
                <strong>{session.sessionKey}</strong>
                <span className="disclaimer">
                  Assigned {formatDateTime(session.createdAt)} | Started {formatDateTime(session.startedAt)} | Ended {formatDateTime(session.endedAt)}
                </span>
                <span className="disclaimer">
                  Order: {session.selectedObjections.map((row) => row.text).join(" -> ")}
                </span>
                <span className="disclaimer">
                  Score: {session.structuredOutcome?.rebuttalPerformanceScore ?? "-"} | Appointment:{" "}
                  {session.structuredOutcome?.appointmentSet === undefined
                    ? "-"
                    : session.structuredOutcome.appointmentSet
                      ? "Yes"
                      : "No"}
                </span>
                <span className="disclaimer">{session.structuredOutcome?.callSummary ?? "No call summary yet."}</span>
                {session.evaluation ? (
                  <>
                    <span className="disclaimer">
                      Data flow: {getTrainingSessionEvaluationStatusLabel(session.evaluation.status)} | Evaluated{" "}
                      {formatDateTime(session.evaluation.evaluatedAt)} | Attempts {session.evaluation.attemptCount}
                    </span>
                    <span className="disclaimer">{session.evaluation.summary}</span>
                    <div style={{ display: "grid", gap: 4 }}>
                      {session.evaluation.issues.map((issue, index) => (
                        <span key={`${session.evaluation?.evaluationId}-issue-${index}`} className="disclaimer">
                          {issue.severity.toUpperCase()} • {issue.message}
                        </span>
                      ))}
                    </div>
                  </>
                ) : session.status === "completed" ? (
                  <span className="disclaimer">Data flow evaluation has not been recorded yet.</span>
                ) : null}
                <div className="hero-actions" style={{ justifyContent: "flex-start" }}>
                  {session.recordingUrl ? (
                    <a className="button secondary" href={session.recordingUrl} target="_blank" rel="noreferrer">
                      Recording
                    </a>
                  ) : null}
                  {session.transcriptUrl ? (
                    <a className="button secondary" href={session.transcriptUrl} target="_blank" rel="noreferrer">
                      Transcript
                    </a>
                  ) : null}
                  {session.status === "assigned" || session.status === "started" ? (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={Boolean(sessionActionState)}
                      onClick={() =>
                        void handleSessionRecovery(
                          session.sessionKey,
                          session.status === "assigned" ? "mark_missed" : "mark_failed",
                        )
                      }
                    >
                      {sessionActionState?.sessionKey === session.sessionKey &&
                      sessionActionState.action !== "create_replacement"
                        ? "Updating..."
                        : getRecoveryLabel(session)}
                    </button>
                  ) : null}
                  {session.status === "completed" ? (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={Boolean(sessionActionState) || evaluationActionSessionKey === session.sessionKey}
                      onClick={() => void handleEvaluationRerun(session.sessionKey)}
                    >
                      {evaluationActionSessionKey === session.sessionKey ? "Re-running..." : "Re-run evaluation"}
                    </button>
                  ) : null}
                  {canCreateReplacement(session) ? (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={Boolean(sessionActionState) || evaluationActionSessionKey === session.sessionKey}
                      onClick={() => void handleSessionRecovery(session.sessionKey, "create_replacement")}
                    >
                      {sessionActionState?.sessionKey === session.sessionKey &&
                      sessionActionState.action === "create_replacement"
                        ? "Sending..."
                        : "Send replacement"}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
