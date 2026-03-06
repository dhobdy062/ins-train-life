"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TraineeRow = {
  traineeId: string;
  name: string;
  email: string;
  difficultyLevel: string;
  numObjections: number;
  status: string;
  updatedAt: number;
  lastActiveAt: number | null;
  ipAddressMasked: string | null;
  ipConsentedAt: number | null;
};

type TraineeRosterProps = {
  trainees: TraineeRow[];
  avgScoreById: Record<string, number>;
};

type DisableTraineeApiResponse = {
  ok?: boolean;
  error?: string;
};

function formatDate(value: number | null) {
  if (!value) {
    return "Not available";
  }
  return new Date(value).toLocaleString();
}

function getAccessStatus(trainee: TraineeRow) {
  if (trainee.status === "disabled") {
    return {
      label: "Removed",
      details: `Access removed ${formatDate(trainee.updatedAt)}`,
    };
  }

  if (trainee.ipAddressMasked) {
    return {
      label: "Confirmed",
      details: trainee.ipConsentedAt
        ? `Confirmed ${formatDate(trainee.ipConsentedAt)}`
        : "Confirmed from approved device",
    };
  }

  return {
    label: "Pending",
    details: "Waiting for trainee confirmation",
  };
}

export default function TraineeRoster({ trainees, avgScoreById }: TraineeRosterProps) {
  const router = useRouter();
  const [removingTraineeId, setRemovingTraineeId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function removeAccess(trainee: TraineeRow) {
    const confirmed = window.confirm(`Remove access for ${trainee.name}? They will not be able to start new sessions.`);
    if (!confirmed) {
      return;
    }

    setRemovingTraineeId(trainee.traineeId);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/trainer/trainees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traineeId: trainee.traineeId }),
      });
      const payload = (await response.json().catch(() => ({}))) as DisableTraineeApiResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to remove trainee access.");
      }

      setStatusMessage(`Removed access for ${trainee.name}.`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to remove trainee access.");
    } finally {
      setRemovingTraineeId(null);
    }
  }

  return (
    <>
      <div className="table-wrap" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px" }}>Name</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Email</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Difficulty</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Objections</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Access status</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Avg score</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Last active</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trainees.map((trainee) => {
              const access = getAccessStatus(trainee);
              const avgScore = avgScoreById[trainee.traineeId];

              return (
                <tr key={trainee.traineeId}>
                  <td style={{ padding: "10px" }}>{trainee.name}</td>
                  <td style={{ padding: "10px" }}>{trainee.email}</td>
                  <td style={{ padding: "10px" }}>{trainee.difficultyLevel}</td>
                  <td style={{ padding: "10px" }}>{trainee.numObjections}</td>
                  <td style={{ padding: "10px" }}>
                    <div>{access.label}</div>
                    <div className="disclaimer">{access.details}</div>
                  </td>
                  <td style={{ padding: "10px" }}>{typeof avgScore === "number" ? `${avgScore}%` : "-"}</td>
                  <td style={{ padding: "10px" }}>{formatDate(trainee.lastActiveAt)}</td>
                  <td style={{ padding: "10px" }}>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: "8px 14px", fontSize: "0.85rem" }}
                      disabled={Boolean(removingTraineeId) || trainee.status === "disabled"}
                      onClick={() => void removeAccess(trainee)}
                    >
                      {removingTraineeId === trainee.traineeId ? "Removing..." : "Remove access"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {statusMessage ? <p className="disclaimer">{statusMessage}</p> : null}
    </>
  );
}
