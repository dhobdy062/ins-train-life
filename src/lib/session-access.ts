type SessionAccessShape = {
  orgId: string;
  trainerId: string;
  traineeClerkUserId?: string | null;
};

export function canAccessAssignedSession(
  session: SessionAccessShape,
  actor: {
    userId: string;
    orgId?: string | null;
    orgRole?: string | null;
  },
) {
  if (session.trainerId === actor.userId) {
    return true;
  }

  if (session.traineeClerkUserId && session.traineeClerkUserId === actor.userId) {
    return true;
  }

  return session.orgId === actor.orgId && actor.orgRole === "org:admin";
}

