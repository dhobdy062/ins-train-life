import type { TrainingSessionEvaluationStatus } from "@/lib/training-session-evaluation";

type TrainingSessionEvaluationAdminSummaryRow = {
  sessionKey: string;
  status: TrainingSessionEvaluationStatus;
  evaluatedAt: number;
};

export function summarizeTrainingSessionEvaluationsForAdmin(
  evaluations: TrainingSessionEvaluationAdminSummaryRow[],
  limit: number,
) {
  const normalizedLimit = Math.max(limit, 1);
  const counts = {
    total: evaluations.length,
    passed: evaluations.filter((evaluation) => evaluation.status === "passed").length,
    warning: evaluations.filter((evaluation) => evaluation.status === "warning").length,
    failed: evaluations.filter((evaluation) => evaluation.status === "failed").length,
  };

  const recentIssues = evaluations
    .filter((evaluation) => evaluation.status !== "passed")
    .sort((left, right) => right.evaluatedAt - left.evaluatedAt)
    .slice(0, normalizedLimit);

  return {
    counts,
    recentIssues,
  };
}
