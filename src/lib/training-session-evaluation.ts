export type TrainingSessionEvaluationStatus = "passed" | "warning" | "failed";

export type TrainingSessionEvaluationIssueCode =
  | "session_not_found"
  | "session_not_completed"
  | "missing_trainee_link"
  | "missing_metric"
  | "missing_structured_outcome"
  | "missing_recording_artifact"
  | "missing_transcript_artifact"
  | "trainer_snapshot_missing_session"
  | "trainee_snapshot_missing_session"
  | "webhook_correlation_failed";

export type TrainingSessionEvaluationIssueSeverity = "warning" | "failed";

export type TrainingSessionEvaluationIssue = {
  code: TrainingSessionEvaluationIssueCode;
  severity: TrainingSessionEvaluationIssueSeverity;
  message: string;
};

export type TrainingSessionEvaluationSession = {
  sessionKey: string;
  orgId: string;
  trainerId: string;
  traineeId?: string | null;
  status: string;
  endedAt?: number | null;
  structuredOutcomeExpected: boolean;
  structuredOutcomePresent: boolean;
  recordingPresent: boolean;
  transcriptPresent: boolean;
};

export type TrainingSessionEvaluationInput = {
  now: number;
  graceWindowMs: number;
  session: TrainingSessionEvaluationSession | null;
  latestMetricPresent: boolean;
  traineeSnapshotIncludesSession: boolean;
  trainerSnapshotIncludesSession: boolean;
};

export type TrainingSessionEvaluationResult = {
  status: TrainingSessionEvaluationStatus;
  issues: TrainingSessionEvaluationIssue[];
  summary: string;
};

type PersistedStructuredOutcomeLike = {
  rebuttalPerformanceScore?: number;
  appointmentSet?: boolean;
  callSummary?: string;
  capturedAt?: number;
  providerEventId?: string;
} | null | undefined;

type WebhookStructuredOutcome = {
  rebuttalPerformanceScore?: number;
  appointmentSet?: boolean;
  callSummary?: string;
};

const ISSUE_MESSAGES: Record<TrainingSessionEvaluationIssueCode, string> = {
  session_not_found: "Training session record is missing.",
  session_not_completed: "Training session is not completed.",
  missing_trainee_link: "Training session is missing the trainee link.",
  missing_metric: "Latest metric row is missing.",
  missing_structured_outcome: "Structured outcome is missing.",
  missing_recording_artifact: "Recording artifact is missing.",
  missing_transcript_artifact: "Transcript artifact is missing.",
  trainer_snapshot_missing_session: "Trainer snapshot does not include the completed session.",
  trainee_snapshot_missing_session: "Trainee snapshot does not include the completed session.",
  webhook_correlation_failed: "Webhook payload could not be correlated to a known session.",
};

const STATUS_LABELS: Record<TrainingSessionEvaluationStatus, string> = {
  passed: "Healthy",
  warning: "Needs review",
  failed: "Broken data flow",
};

function isInsideGraceWindow(now: number, endedAt: number, graceWindowMs: number) {
  return now - endedAt <= graceWindowMs;
}

function hasEndedAt(endedAt: number | null | undefined): endedAt is number {
  return typeof endedAt === "number";
}

function buildIssue(
  code: TrainingSessionEvaluationIssueCode,
  severity: TrainingSessionEvaluationIssueSeverity,
): TrainingSessionEvaluationIssue {
  return {
    code,
    severity,
    message: ISSUE_MESSAGES[code],
  };
}

function buildResult(issues: TrainingSessionEvaluationIssue[]): TrainingSessionEvaluationResult {
  const status = issues.some((issue) => issue.severity === "failed")
    ? "failed"
    : issues.length > 0
      ? "warning"
      : "passed";

  return {
    status,
    issues,
    summary: issues.length > 0 ? issues.map((issue) => issue.message).join(" ") : "Training session data flow is healthy.",
  };
}

export function evaluateTrainingSessionDataFlow(
  input: TrainingSessionEvaluationInput,
): TrainingSessionEvaluationResult {
  if (!input.session) {
    return buildResult([buildIssue("session_not_found", "failed")]);
  }

  const issues: TrainingSessionEvaluationIssue[] = [];
  const withinGraceWindow =
    !hasEndedAt(input.session.endedAt) ||
    isInsideGraceWindow(input.now, input.session.endedAt, input.graceWindowMs);
  const missingSeverity: TrainingSessionEvaluationIssueSeverity = withinGraceWindow ? "warning" : "failed";

  if (input.session.status !== "completed") {
    issues.push(buildIssue("session_not_completed", "failed"));
  }

  if (input.session.status === "completed" && !input.session.traineeId) {
    issues.push(buildIssue("missing_trainee_link", "failed"));
  }

  if (input.session.structuredOutcomeExpected && !input.session.structuredOutcomePresent) {
    issues.push(buildIssue("missing_structured_outcome", missingSeverity));
  }

  if (!input.session.recordingPresent) {
    issues.push(buildIssue("missing_recording_artifact", missingSeverity));
  }

  if (!input.session.transcriptPresent) {
    issues.push(buildIssue("missing_transcript_artifact", missingSeverity));
  }

  if (!input.latestMetricPresent) {
    issues.push(buildIssue("missing_metric", missingSeverity));
  }

  if (!input.trainerSnapshotIncludesSession) {
    issues.push(buildIssue("trainer_snapshot_missing_session", withinGraceWindow ? "warning" : "failed"));
  }

  if (input.session.traineeId && !input.traineeSnapshotIncludesSession) {
    issues.push(buildIssue("trainee_snapshot_missing_session", withinGraceWindow ? "warning" : "failed"));
  }

  return buildResult(issues);
}

export function getTrainingSessionEvaluationStatusLabel(status: TrainingSessionEvaluationStatus) {
  return STATUS_LABELS[status];
}

export function getTrainingSessionEvaluationIssueLabel(code: TrainingSessionEvaluationIssueCode) {
  return ISSUE_MESSAGES[code];
}

export function hasMeaningfulStructuredOutcome(structuredOutcome: PersistedStructuredOutcomeLike) {
  if (!structuredOutcome) {
    return false;
  }

  if (typeof structuredOutcome.rebuttalPerformanceScore === "number") {
    return true;
  }

  if (typeof structuredOutcome.appointmentSet === "boolean") {
    return true;
  }

  return typeof structuredOutcome.callSummary === "string" && structuredOutcome.callSummary.trim().length > 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBooleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function firstDefinedValue<T>(values: Array<T | undefined>) {
  return values.find((value) => value !== undefined);
}

export function extractStructuredOutcomeFromWebhookPayload(payload: unknown): WebhookStructuredOutcome {
  const root = asRecord(payload);
  const message = asRecord(root?.message) ?? root;
  const callCandidates = [asRecord(root?.call), asRecord(message?.call)].filter(
    (candidate): candidate is Record<string, unknown> => Boolean(candidate),
  );
  const analysisCandidates = [
    asRecord(root?.analysis),
    asRecord(message?.analysis),
    ...callCandidates.map((candidate) => asRecord(candidate.analysis)),
  ].filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));

  const rebuttalPerformanceScore = firstDefinedValue(
    analysisCandidates.flatMap((analysis) => [
      asNumberValue(analysis.rebuttalPerformanceScore),
      asNumberValue(analysis.rebuttalPerformance),
      asNumberValue(analysis.similarityScore),
    ]),
  );
  const appointmentSet = firstDefinedValue(analysisCandidates.map((analysis) => asBooleanValue(analysis.appointmentSet)));
  const callSummary = firstDefinedValue([
    ...analysisCandidates.map((analysis) => asNonEmptyString(analysis.callSummary)),
    asNonEmptyString(root?.summary),
    asNonEmptyString(message?.summary),
    ...callCandidates.map((candidate) => asNonEmptyString(candidate.summary)),
  ]);

  return {
    rebuttalPerformanceScore,
    appointmentSet,
    callSummary,
  };
}

export function webhookPayloadExpectsStructuredOutcome(payload: unknown) {
  return hasMeaningfulStructuredOutcome(extractStructuredOutcomeFromWebhookPayload(payload));
}

export function isTrainingSessionVisibleInTrainerSessionBuilder(args: {
  sessionOrgId: string;
  sessionTrainerId: string;
  orgId: string;
  trainerId: string;
}) {
  return args.sessionOrgId === args.orgId && args.sessionTrainerId === args.trainerId;
}

export function isTrainingSessionVisibleInTraineeResults(args: {
  sessionOrgId: string;
  sessionTraineeId?: string | null;
  sessionStatus: string;
  traineeId: string;
  traineeOrgId: string;
  traineeStatus: string;
  orgId: string;
}) {
  if (args.sessionOrgId !== args.orgId || args.traineeOrgId !== args.orgId) {
    return false;
  }

  if (args.sessionTraineeId !== args.traineeId) {
    return false;
  }

  if (args.traineeStatus === "disabled") {
    return false;
  }

  return args.sessionStatus !== "assigned";
}
