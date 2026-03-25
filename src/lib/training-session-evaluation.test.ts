import {
  evaluateTrainingSessionDataFlow,
  extractStructuredOutcomeFromWebhookPayload,
  hasMeaningfulStructuredOutcome,
  isTrainingSessionVisibleInTraineeResults,
  isTrainingSessionVisibleInTrainerSessionBuilder,
  webhookPayloadExpectsStructuredOutcome,
  getTrainingSessionEvaluationIssueLabel,
  getTrainingSessionEvaluationStatusLabel,
  type TrainingSessionEvaluationInput,
} from "@/lib/training-session-evaluation";

function buildInput(overrides: Partial<TrainingSessionEvaluationInput> = {}): TrainingSessionEvaluationInput {
  return {
    now: 10_000,
    graceWindowMs: 5_000,
    session: {
      sessionKey: "sess_1",
      orgId: "org_1",
      trainerId: "trainer_1",
      traineeId: "trainee_1",
      status: "completed",
      endedAt: 9_000,
      structuredOutcomeExpected: true,
      structuredOutcomePresent: true,
      recordingPresent: true,
      transcriptPresent: true,
    },
    latestMetricPresent: true,
    traineeSnapshotIncludesSession: true,
    trainerSnapshotIncludesSession: true,
    ...overrides,
  };
}

describe("evaluateTrainingSessionDataFlow", () => {
  it("returns passed when the completed session is fully healthy", () => {
    const result = evaluateTrainingSessionDataFlow(buildInput());

    expect(result.status).toBe("passed");
    expect(result.issues).toHaveLength(0);
    expect(result.summary).toBe("Training session data flow is healthy.");
  });

  it("returns warning when secondary data is still missing inside the grace window", () => {
    const result = evaluateTrainingSessionDataFlow(
      buildInput({
        now: 12_000,
        session: {
          sessionKey: "sess_2",
          orgId: "org_1",
          trainerId: "trainer_1",
          traineeId: "trainee_1",
          status: "completed",
          endedAt: 9_500,
          structuredOutcomeExpected: true,
          structuredOutcomePresent: false,
          recordingPresent: false,
          transcriptPresent: false,
        },
        latestMetricPresent: false,
        traineeSnapshotIncludesSession: false,
        trainerSnapshotIncludesSession: false,
      }),
    );

    expect(result.status).toBe("warning");
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "missing_metric", severity: "warning" })]),
    );
    expect(result.summary).toContain("Latest metric row is missing.");
  });

  it("returns failed when the trainee snapshot still cannot see the completed session after the grace window", () => {
    const result = evaluateTrainingSessionDataFlow(
      buildInput({
        now: 20_000,
        session: {
          sessionKey: "sess_3",
          orgId: "org_1",
          trainerId: "trainer_1",
          traineeId: "trainee_1",
          status: "completed",
          endedAt: 10_000,
          structuredOutcomeExpected: true,
          structuredOutcomePresent: true,
          recordingPresent: true,
          transcriptPresent: true,
        },
        latestMetricPresent: true,
        traineeSnapshotIncludesSession: false,
        trainerSnapshotIncludesSession: true,
      }),
    );

    expect(result.status).toBe("failed");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "trainee_snapshot_missing_session", severity: "failed" }),
      ]),
    );
    expect(result.summary).toContain("Trainee snapshot does not include the completed session.");
  });

  it("returns failed when the completed session is missing its trainee link", () => {
    const result = evaluateTrainingSessionDataFlow(
      buildInput({
        session: {
          sessionKey: "sess_4",
          orgId: "org_1",
          trainerId: "trainer_1",
          status: "completed",
          structuredOutcomeExpected: false,
          structuredOutcomePresent: false,
          recordingPresent: true,
          transcriptPresent: true,
        },
        latestMetricPresent: true,
        traineeSnapshotIncludesSession: true,
        trainerSnapshotIncludesSession: true,
      }),
    );

    expect(result.status).toBe("failed");
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "missing_trainee_link", severity: "failed" })]),
    );
    expect(result.issues.map((issue) => issue.code)).not.toContain("trainee_snapshot_missing_session");
    expect(result.summary).toContain("Training session is missing the trainee link.");
  });

  it("does not emit missing_structured_outcome when the webhook did not expect one", () => {
    const result = evaluateTrainingSessionDataFlow(
      buildInput({
        session: {
          sessionKey: "sess_5",
          orgId: "org_1",
          trainerId: "trainer_1",
          traineeId: "trainee_1",
          status: "completed",
          endedAt: 9_500,
          structuredOutcomeExpected: false,
          structuredOutcomePresent: false,
          recordingPresent: true,
          transcriptPresent: true,
        },
      }),
    );

    expect(result.status).toBe("passed");
    expect(result.issues).toHaveLength(0);
  });

  it("returns failed when the session input is missing", () => {
    const result = evaluateTrainingSessionDataFlow(
      buildInput({
        session: null,
        latestMetricPresent: false,
        traineeSnapshotIncludesSession: false,
        trainerSnapshotIncludesSession: false,
      }),
    );

    expect(result.status).toBe("failed");
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "session_not_found", severity: "failed" })]),
    );
    expect(result.summary).toContain("Training session record is missing.");
  });

  it("maps issue and status labels for UI helpers", () => {
    expect(getTrainingSessionEvaluationStatusLabel("passed")).toBe("Healthy");
    expect(getTrainingSessionEvaluationStatusLabel("warning")).toBe("Needs review");
    expect(getTrainingSessionEvaluationStatusLabel("failed")).toBe("Broken data flow");
    expect(getTrainingSessionEvaluationIssueLabel("missing_metric")).toBe("Latest metric row is missing.");
  });

  it("treats call.analysis as a structured outcome source", () => {
    expect(
      webhookPayloadExpectsStructuredOutcome({
        call: {
          analysis: {
            rebuttalPerformanceScore: 91,
          },
        },
      }),
    ).toBe(true);
  });

  it("merges structured outcome fields across analysis sources", () => {
    expect(
      extractStructuredOutcomeFromWebhookPayload({
        message: {
          analysis: {
            unrelated: "value",
          },
        },
        call: {
          analysis: {
            rebuttalPerformanceScore: 91,
          },
        },
        summary: "Closed strong.",
      }),
    ).toEqual({
      rebuttalPerformanceScore: 91,
      appointmentSet: undefined,
      callSummary: "Closed strong.",
    });
  });

  it("falls back to message.call when root.call is present but empty", () => {
    expect(
      extractStructuredOutcomeFromWebhookPayload({
        call: {},
        message: {
          call: {
            analysis: {
              appointmentSet: true,
            },
            summary: "Booked follow-up.",
          },
        },
      }),
    ).toEqual({
      rebuttalPerformanceScore: undefined,
      appointmentSet: true,
      callSummary: "Booked follow-up.",
    });
  });

  it("treats scaffold-only structured outcome objects as missing", () => {
    expect(
      hasMeaningfulStructuredOutcome({
        capturedAt: 3_000,
        providerEventId: "evt_1",
      }),
    ).toBe(false);
    expect(
      hasMeaningfulStructuredOutcome({
        rebuttalPerformanceScore: 91,
        capturedAt: 3_000,
      }),
    ).toBe(true);
    expect(
      hasMeaningfulStructuredOutcome({
        appointmentSet: false,
        capturedAt: 3_000,
      }),
    ).toBe(true);
  });

  it("derives structured outcome expectation from the persisted webhook payload signal", () => {
    expect(
      webhookPayloadExpectsStructuredOutcome({
        message: {
          analysis: {
            appointmentSet: false,
          },
        },
      }),
    ).toBe(true);
    expect(
      webhookPayloadExpectsStructuredOutcome({
        summary: "Strong call",
      }),
    ).toBe(true);
    expect(
      webhookPayloadExpectsStructuredOutcome({
        id: "evt_1",
        call: {
          durationSeconds: 180,
        },
      }),
    ).toBe(false);
  });

  it("treats linked trainer sessions as visible in the session builder", () => {
    expect(
      isTrainingSessionVisibleInTrainerSessionBuilder({
        sessionOrgId: "org_1",
        sessionTrainerId: "trainer_1",
        orgId: "org_1",
        trainerId: "trainer_1",
      }),
    ).toBe(true);
    expect(
      isTrainingSessionVisibleInTrainerSessionBuilder({
        sessionOrgId: "org_1",
        sessionTrainerId: "trainer_1",
        orgId: "org_1",
        trainerId: "trainer_2",
      }),
    ).toBe(false);
  });

  it("treats completed trainee-linked sessions as visible in trainee results without relying on snapshot limits", () => {
    expect(
      isTrainingSessionVisibleInTraineeResults({
        sessionOrgId: "org_1",
        sessionTraineeId: "trainee_1",
        sessionStatus: "completed",
        traineeId: "trainee_1",
        traineeOrgId: "org_1",
        traineeStatus: "active",
        orgId: "org_1",
      }),
    ).toBe(true);
    expect(
      isTrainingSessionVisibleInTraineeResults({
        sessionOrgId: "org_1",
        sessionTraineeId: "trainee_1",
        sessionStatus: "completed",
        traineeId: "trainee_1",
        traineeOrgId: "org_1",
        traineeStatus: "disabled",
        orgId: "org_1",
      }),
    ).toBe(false);
  });
});
