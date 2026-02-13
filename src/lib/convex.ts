import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

type WebhookProvider = "stripe" | "vapi";
type AdminConvexHttpClient = ConvexHttpClient & { setAdminAuth?: (token: string) => void };

const enqueueWebhookEventRef = makeFunctionReference<"mutation">("webhooks.enqueueWebhookEvent");
const recordAlertRef = makeFunctionReference<"mutation">("webhooks.recordAlert");
const createTrainingSessionRef = makeFunctionReference<"mutation">("sessions.createTrainingSession");
const reserveTrialSessionRef = makeFunctionReference<"mutation">("sessions.reserveTrialSession");
const checkLaggingWebhooksRef = makeFunctionReference<"mutation">("webhooks.checkLaggingWebhooks");
const getOrgBillingAccessRef = makeFunctionReference<"query">("webhooks.getOrgBillingAccess");

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function getClient() {
  const convexUrl = getRequiredEnv("CONVEX_URL");
  const convexAdminKey = getRequiredEnv("CONVEX_ADMIN_KEY");

  const client = new ConvexHttpClient(convexUrl);
  // Convex runtime supports setAdminAuth, but some package type defs omit it.
  const adminClient = client as AdminConvexHttpClient;
  if (typeof adminClient.setAdminAuth === "function") {
    adminClient.setAdminAuth(convexAdminKey);
  } else {
    client.setAuth(convexAdminKey);
  }
  return client;
}

export async function enqueueWebhookEvent(args: {
  provider: WebhookProvider;
  idempotencyKey: string;
  providerEventId?: string;
  payload: unknown;
  headers?: Record<string, string>;
  receivedAt: number;
}) {
  const client = getClient();
  return client.mutation(enqueueWebhookEventRef, args as never);
}

export async function createTrainingSession(args: {
  orgId: string;
  trainerId: string;
  assistantId: string;
  difficulty: string;
  objectionsRequired: number;
  rebuttalKeys: string[];
  channel: "web";
}) {
  const client = getClient();
  return client.mutation(createTrainingSessionRef, args as never) as Promise<{ sessionKey: string }>;
}

export async function reserveTrialSession(args: { emailHash: string; sessionKey: string }) {
  const client = getClient();
  return client.mutation(reserveTrialSessionRef, args as never) as Promise<{ allowed: boolean; remaining: number }>;
}

export async function recordAlert(args: {
  source: string;
  severity: "warning" | "critical";
  message: string;
  context?: Record<string, unknown>;
}) {
  const client = getClient();
  return client.mutation(recordAlertRef, args as never);
}

export async function checkLaggingWebhooks(args: { maxLagMs: number; limit?: number }) {
  const client = getClient();
  return client.mutation(checkLaggingWebhooksRef, args as never) as Promise<{
    checked: number;
    laggingCount: number;
  }>;
}

export async function getOrgBillingAccess(args: { orgId: string; limit?: number }) {
  const client = getClient();
  return client.query(getOrgBillingAccessRef, args as never) as Promise<{
    hasAccess: boolean;
    reason: string;
  }>;
}
