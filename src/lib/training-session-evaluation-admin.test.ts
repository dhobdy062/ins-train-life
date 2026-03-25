import { summarizeTrainingSessionEvaluationsForAdmin } from "@/lib/training-session-evaluation-admin";

describe("summarizeTrainingSessionEvaluationsForAdmin", () => {
  it("counts all statuses and returns only recent non-passing issues", () => {
    const result = summarizeTrainingSessionEvaluationsForAdmin(
      [
        {
          sessionKey: "sess_passed",
          status: "passed",
          evaluatedAt: 100,
        },
        {
          sessionKey: "sess_warning_old",
          status: "warning",
          evaluatedAt: 200,
        },
        {
          sessionKey: "sess_failed",
          status: "failed",
          evaluatedAt: 400,
        },
        {
          sessionKey: "sess_warning_new",
          status: "warning",
          evaluatedAt: 300,
        },
      ],
      2,
    );

    expect(result.counts).toEqual({
      total: 4,
      passed: 1,
      warning: 2,
      failed: 1,
    });
    expect(result.recentIssues.map((evaluation) => evaluation.sessionKey)).toEqual([
      "sess_failed",
      "sess_warning_new",
    ]);
  });
});
