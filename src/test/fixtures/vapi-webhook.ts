export function buildVapiSessionEndWebhookFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_vapi_smoke_1",
    type: "call.ended",
    call: {
      id: "call_vapi_smoke_1",
      durationSeconds: 184,
      metadata: {
        sessionKey: "sess_vapi_smoke_1",
        orgId: "org_vapi_smoke",
        trainerId: "trainer_vapi_smoke",
        traineeId: "trainee_vapi_smoke",
      },
      summary: "Trainee handled the objection and booked a follow-up.",
    },
    message: {
      id: "msg_vapi_smoke_1",
      type: "end-of-call-report",
      analysis: {
        rebuttalPerformanceScore: 91,
        appointmentSet: true,
        callSummary: "Trainee handled the objection and booked a follow-up.",
      },
      transcript: "Prospect: I'm busy. Trainee: I can be brief and help you compare options.",
    },
    ...overrides,
  };
}
