type SessionFileAccessShape = {
  orgId: string;
  trainerId: string;
  traineeClerkUserId?: string | null;
};

type SessionActor = {
  userId: string;
  orgId?: string | null;
  orgRole?: string | null;
};

export function canAccessSessionFiles(session: SessionFileAccessShape, actor: SessionActor) {
  if (session.trainerId === actor.userId) {
    return true;
  }

  if (session.traineeClerkUserId && session.traineeClerkUserId === actor.userId) {
    return true;
  }

  return session.orgId === actor.orgId && actor.orgRole === "org:admin";
}

export function canDeleteSessionFiles(session: SessionFileAccessShape, actor: SessionActor) {
  if (session.trainerId === actor.userId) {
    return true;
  }

  return session.orgId === actor.orgId && actor.orgRole === "org:admin";
}
