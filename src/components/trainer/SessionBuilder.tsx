"use client";

import { useMemo, useState } from "react";

type TraineeOption = {
  traineeId: string;
  name: string;
  difficultyLevel: string;
  numObjections: number;
};

type SessionBootstrapResponse = {
  sessionKey: string;
  metadata?: {
    sessionKey?: string;
  };
};

type SessionBuilderProps = {
  trainees: TraineeOption[];
};

export default function SessionBuilder({ trainees }: SessionBuilderProps) {
  const [selectedTraineeId, setSelectedTraineeId] = useState(trainees[0]?.traineeId ?? "");
  const selectedTrainee = useMemo(
    () => trainees.find((item) => item.traineeId === selectedTraineeId) ?? null,
    [trainees, selectedTraineeId],
  );

  const [difficulty, setDifficulty] = useState(selectedTrainee?.difficultyLevel ?? "D2");
  const [objectionsRequired, setObjectionsRequired] = useState(selectedTrainee?.numObjections ?? 3);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  function handleTraineeChange(nextTraineeId: string) {
    setSelectedTraineeId(nextTraineeId);
    const nextTrainee = trainees.find((item) => item.traineeId === nextTraineeId);
    if (!nextTrainee) {
      return;
    }

    setDifficulty(nextTrainee.difficultyLevel);
    setObjectionsRequired(nextTrainee.numObjections);
  }

  async function handleStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/vapi/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty,
          objectionsRequired,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as SessionBootstrapResponse & {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? payload.message ?? "Unable to start session.");
      }

      const nextSessionKey = payload.sessionKey ?? payload.metadata?.sessionKey ?? null;
      setSessionKey(nextSessionKey);
      setStatus("Session created. You can now launch the practice call from your console.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to start session.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={handleStart}>
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
          Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="D1">D1</option>
            <option value="D2">D2</option>
            <option value="D3">D3</option>
            <option value="D4">D4</option>
            <option value="D5">D5</option>
          </select>
        </label>

        <label className="field">
          Objections in this session
          <input
            type="number"
            min={1}
            max={7}
            value={objectionsRequired}
            onChange={(event) => setObjectionsRequired(Number(event.target.value || 3))}
          />
        </label>
      </div>

      <div className="hero-actions">
        <button className="button" type="submit" disabled={loading || !selectedTrainee}>
          {loading ? "Creating session..." : "Create session"}
        </button>
      </div>

      {sessionKey ? (
        <div className="metric">
          <span>Session ID</span>
          <strong>{sessionKey}</strong>
        </div>
      ) : null}
      {status ? <p className="disclaimer">{status}</p> : null}
    </form>
  );
}
