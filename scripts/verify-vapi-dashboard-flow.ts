import crypto from "crypto";
import dotenv from "dotenv";
import {
  createTraineeProfile,
  createTrainingSession,
  getTraineeResultsSnapshot,
  getTrainerSessionBuilderSnapshot,
  getVapiSmokeVerificationSnapshot,
} from "../src/lib/convex";
import { buildVapiSessionEndWebhookFixture } from "../src/test/fixtures/vapi-webhook";

dotenv.config({ path: ".env.local" });
dotenv.config();

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function sign(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForVerification(args: {
  sessionKey: string;
  providerEventId: string;
  orgId: string;
  trainerId: string;
  traineeId: string;
}) {
  let latest: Awaited<ReturnType<typeof getVapiSmokeVerificationSnapshot>> | null = null;

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    latest = await getVapiSmokeVerificationSnapshot(args);
    const complete =
      latest.webhook?.status === "processed" &&
      latest.session?.status === "completed" &&
      latest.session.structuredOutcome?.rebuttalPerformanceScore === 91 &&
      latest.latestMetric?.rebuttalScore === 91 &&
      latest.trainerSnapshotIncludesSession &&
      latest.traineeSnapshotIncludesSession;

    if (complete) {
      return latest;
    }

    await sleep(1000);
  }

  throw new Error(`Timed out waiting for Vapi smoke verification. Last snapshot: ${JSON.stringify(latest)}`);
}

async function main() {
  const webhookSecret = requireEnv("VAPI_WEBHOOK_SECRET");
  requireEnv("CONVEX_URL");
  requireEnv("CONVEX_ADMIN_KEY");

  const baseUrl = process.env.VAPI_SMOKE_BASE_URL?.trim() || "http://localhost:3000";
  const assistantId = process.env.VAPI_SMOKE_ASSISTANT_ID?.trim() || "assistant_vapi_smoke";
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const orgId = `org_vapi_smoke_${suffix}`;
  const trainerId = `trainer_vapi_smoke_${suffix}`;
  const traineeClerkUserId = `trainee_user_vapi_smoke_${suffix}`;
  const providerEventId = `evt_vapi_smoke_${suffix}`;

  const trainee = await createTraineeProfile({
    orgId,
    trainerId,
    clerkUserId: traineeClerkUserId,
    clerkMembershipId: `membership_vapi_smoke_${suffix}`,
    name: "Vapi Smoke Test Trainee",
    email: `vapi-smoke-${suffix}@example.test`,
    difficultyLevel: "D2",
    numObjections: 1,
    expectedRebuttals: ["busy"],
    inviteTokenHash: `vapi-smoke-invite-${suffix}`,
  });

  const session = await createTrainingSession({
    orgId,
    trainerId,
    traineeId: trainee.traineeId,
    traineeClerkUserId,
    assistantId,
    difficulty: "D2",
    objectionsRequired: 1,
    rebuttalKeys: ["busy"],
    selectedObjections: [{ order: 0, text: "I'm busy", rebuttalType: "busy" }],
    rebuttalGuideMap: { busy: "Acknowledge timing and offer a short next step." },
    channel: "web",
    initialStatus: "started",
    profileSnapshot: {
      difficultyLevel: "D2",
      objectionsRequired: 1,
      expectedRebuttals: ["busy"],
    },
  });

  const payload = buildVapiSessionEndWebhookFixture({
    id: providerEventId,
    call: {
      id: `call_vapi_smoke_${suffix}`,
      durationSeconds: 184,
      metadata: {
        sessionKey: session.sessionKey,
        orgId,
        trainerId,
        traineeId: trainee.traineeId,
      },
      summary: "Trainee handled the objection and booked a follow-up.",
    },
    message: {
      id: `msg_vapi_smoke_${suffix}`,
      type: "end-of-call-report",
      analysis: {
        rebuttalPerformanceScore: 91,
        appointmentSet: true,
        callSummary: "Trainee handled the objection and booked a follow-up.",
      },
      transcript: "Prospect: I'm busy. Trainee: I can be brief and help you compare options.",
    },
  });
  const rawBody = JSON.stringify(payload);
  const webhookResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/api/vapi/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vapi-signature": sign(rawBody, webhookSecret),
    },
    body: rawBody,
  });
  const webhookBody = await webhookResponse.text();

  if (!webhookResponse.ok) {
    throw new Error(`Webhook POST failed with ${webhookResponse.status}: ${webhookBody}`);
  }

  const verification = await waitForVerification({
    sessionKey: session.sessionKey,
    providerEventId,
    orgId,
    trainerId,
    traineeId: trainee.traineeId,
  });
  const [trainerSessions, traineeResults] = await Promise.all([
    getTrainerSessionBuilderSnapshot({ orgId, trainerId, limit: 10 }),
    getTraineeResultsSnapshot({ traineeId: trainee.traineeId, orgId, limit: 10 }),
  ]);

  const trainerSession = trainerSessions.find((item) => item.sessionKey === session.sessionKey) ?? null;
  const traineeSession =
    traineeResults?.latestSession?.sessionKey === session.sessionKey
      ? traineeResults.latestSession
      : traineeResults?.history.find((item) => item.sessionKey === session.sessionKey) ?? null;

  const result = {
    webhookHttpStatus: webhookResponse.status,
    webhookStatus: verification.webhook?.status ?? null,
    sessionKey: session.sessionKey,
    sessionStatus: verification.session?.status ?? null,
    structuredOutcome: verification.session?.structuredOutcome ?? null,
    latestMetric: verification.latestMetric,
    trainerDashboardReceived: Boolean(trainerSession?.structuredOutcome),
    traineeDashboardReceived: Boolean(traineeSession?.structuredOutcome),
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
