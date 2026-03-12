type AssignedSessionStartState = {
  status: string;
  startedAt?: number | null;
  traineeClerkUserId?: string | null;
};

type AssignedSessionStartPatch = {
  status?: "started";
  startedAt?: number;
  traineeClerkUserId?: string;
  updatedAt: number;
};

export function buildAssignedSessionStartUpdate(
  session: AssignedSessionStartState,
  traineeClerkUserId: string,
  now: number,
) {
  const patch: AssignedSessionStartPatch = {
    updatedAt: now,
  };

  if (!session.traineeClerkUserId) {
    patch.traineeClerkUserId = traineeClerkUserId;
  }

  if (session.status === "assigned") {
    patch.status = "started";
    patch.startedAt = now;
  } else if (!session.startedAt) {
    patch.startedAt = now;
  }

  const hasChanges =
    patch.status !== undefined || patch.startedAt !== undefined || patch.traineeClerkUserId !== undefined;

  return {
    patch: hasChanges ? patch : null,
    status: session.status === "assigned" ? "started" : session.status,
    startedAt: session.startedAt ?? now,
    traineeClerkUserId: session.traineeClerkUserId ?? traineeClerkUserId,
  };
}
