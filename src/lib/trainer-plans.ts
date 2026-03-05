export type TrainingGoalDraft = {
  goal: string;
  metricTarget: string;
  targetDate: string;
  notes: string;
};

export type CoachingDraft = {
  topic: string;
  focusType: string;
  scheduledAt: string;
  attendees: string;
  agenda: string;
};

export type TrainerTrainingPlans = {
  day30: TrainingGoalDraft;
  day60: TrainingGoalDraft;
  day90: TrainingGoalDraft;
  coaching: CoachingDraft;
};

function daysFromToday(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeGoal(input: unknown, fallback: TrainingGoalDraft): TrainingGoalDraft {
  if (!input || typeof input !== "object") {
    return fallback;
  }

  const source = input as Record<string, unknown>;
  return {
    goal: asString(source.goal, fallback.goal),
    metricTarget: asString(source.metricTarget, fallback.metricTarget),
    targetDate: asString(source.targetDate, fallback.targetDate),
    notes: asString(source.notes, fallback.notes),
  };
}

function normalizeCoaching(input: unknown, fallback: CoachingDraft): CoachingDraft {
  if (!input || typeof input !== "object") {
    return fallback;
  }

  const source = input as Record<string, unknown>;
  return {
    topic: asString(source.topic, fallback.topic),
    focusType: asString(source.focusType, fallback.focusType),
    scheduledAt: asString(source.scheduledAt, fallback.scheduledAt),
    attendees: asString(source.attendees, fallback.attendees),
    agenda: asString(source.agenda, fallback.agenda),
  };
}

export function buildDefaultTrainingPlans(): TrainerTrainingPlans {
  return {
    day30: {
      goal: "50% of the team at Level 3",
      metricTarget: "Avg team score 75%+",
      targetDate: daysFromToday(30),
      notes: "",
    },
    day60: {
      goal: "Entire team at Level 3",
      metricTarget: "5% to 20% complete all levels",
      targetDate: daysFromToday(60),
      notes: "",
    },
    day90: {
      goal: "Team ready for advanced-level objection handling",
      metricTarget: "Stable hard-stop rate under 5%",
      targetDate: daysFromToday(90),
      notes: "",
    },
    coaching: {
      topic: "",
      focusType: "not_interested",
      scheduledAt: "",
      attendees: "",
      agenda: "",
    },
  };
}

export function normalizeTrainerTrainingPlans(input: unknown): TrainerTrainingPlans {
  const fallback = buildDefaultTrainingPlans();

  if (!input || typeof input !== "object") {
    return fallback;
  }

  const source = input as Record<string, unknown>;

  return {
    day30: normalizeGoal(source.day30, fallback.day30),
    day60: normalizeGoal(source.day60, fallback.day60),
    day90: normalizeGoal(source.day90, fallback.day90),
    coaching: normalizeCoaching(source.coaching, fallback.coaching),
  };
}
