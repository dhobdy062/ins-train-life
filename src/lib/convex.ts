import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

type WebhookProvider = "stripe" | "vapi";
type AdminConvexHttpClient = ConvexHttpClient & { setAdminAuth?: (token: string) => void };

const enqueueWebhookEventRef = makeFunctionReference<"mutation">("webhooks:enqueueWebhookEvent");
const recordAlertRef = makeFunctionReference<"mutation">("webhooks:recordAlert");
const logEmailEventRef = makeFunctionReference<"mutation">("webhooks:logEmailEvent");
const createTrainingSessionRef = makeFunctionReference<"mutation">("sessions:createTrainingSession");
const markSessionCompletedRef = makeFunctionReference<"mutation">("sessions:markSessionCompleted");
const recordRebuttalScoreRef = makeFunctionReference<"mutation">("sessions:recordRebuttalScore");
const getTrainerDashboardSnapshotRef = makeFunctionReference<"query">("sessions:getTrainerDashboardSnapshot");
const reserveTrialSessionRef = makeFunctionReference<"mutation">("sessions:reserveTrialSession");
const deleteSessionWithArtifactsRef = makeFunctionReference<"mutation">("sessions:deleteSessionWithArtifacts");
const createTraineeProfileRef = makeFunctionReference<"mutation">("traineeProfiles:createTraineeProfile");
const getTraineeByInviteTokenHashRef = makeFunctionReference<"query">("traineeProfiles:getTraineeByInviteTokenHash");
const getTraineeByOrgAndEmailRef = makeFunctionReference<"query">("traineeProfiles:getTraineeByOrgAndEmail");
const getTraineeByClerkUserIdRef = makeFunctionReference<"query">("traineeProfiles:getTraineeByClerkUserId");
const getTraineeProfileByIdRef = makeFunctionReference<"query">("traineeProfiles:getTraineeProfileById");
const listTraineesByOrgRef = makeFunctionReference<"query">("traineeProfiles:listTraineesByOrg");
const disableTraineeProfileRef = makeFunctionReference<"mutation">("traineeProfiles:disableTraineeProfile");
const linkTraineeIpByInviteTokenHashRef = makeFunctionReference<"mutation">(
  "traineeProfiles:linkTraineeIpByInviteTokenHash",
);
const getTraineeProfileByIpHashRef = makeFunctionReference<"query">("traineeProfiles:getTraineeProfileByIpHash");
const markTraineeActiveRef = makeFunctionReference<"mutation">("traineeProfiles:markTraineeActive");
const getTraineeResultsSnapshotRef = makeFunctionReference<"query">("traineeProfiles:getTraineeResultsSnapshot");
const markAssignedSessionStartedRef = makeFunctionReference<"mutation">("sessions:markAssignedSessionStarted");
const getAssignedSessionForTraineeStartRef = makeFunctionReference<"query">("sessions:getAssignedSessionForTraineeStart");
const getTrainerSessionBuilderSnapshotRef = makeFunctionReference<"query">("sessions:getTrainerSessionBuilderSnapshot");
const getOrgTrainerObjectionConfigRef = makeFunctionReference<"query">(
  "trainerObjections:getOrgTrainerObjectionConfig",
);
const upsertOrgTrainerObjectionConfigRef = makeFunctionReference<"mutation">(
  "trainerObjections:upsertOrgTrainerObjectionConfig",
);
const getOrgTrainerTrainingPlansRef = makeFunctionReference<"query">(
  "trainerPlans:getOrgTrainerTrainingPlans",
);
const upsertOrgTrainerTrainingPlansRef = makeFunctionReference<"mutation">(
  "trainerPlans:upsertOrgTrainerTrainingPlans",
);
const storeSessionRecordingRef = makeFunctionReference<"mutation">("storage:storeSessionRecording");
const storeTranscriptRef = makeFunctionReference<"mutation">("storage:storeTranscript");
const getSessionWithFilesRef = makeFunctionReference<"query">("storage:getSessionWithFiles");
const checkLaggingWebhooksRef = makeFunctionReference<"mutation">("webhooks:checkLaggingWebhooks");
const getOrgBillingAccessRef = makeFunctionReference<"query">("webhooks:getOrgBillingAccess");
const getOrgEntitlementRef = makeFunctionReference<"query">("webhooks:getOrgEntitlement");
const getOrganizationRevenueDashboardRef = makeFunctionReference<"query">("admin:getOrganizationRevenueDashboard");
const getStripeCustomerForOrgRef = makeFunctionReference<"query">("webhooks:getStripeCustomerForOrg");
const reconcileStripeCustomerBillingRef = makeFunctionReference<"mutation">(
  "support:reconcileStripeCustomerBilling",
);
const upsertUserRef = makeFunctionReference<"mutation">("identity:upsertUser");
const upsertOrganizationRef = makeFunctionReference<"mutation">("identity:upsertOrganization");
const upsertOrganizationMembershipRef = makeFunctionReference<"mutation">("identity:upsertOrganizationMembership");
const markUserDeletedRef = makeFunctionReference<"mutation">("identity:markUserDeleted");
const markOrganizationDeletedRef = makeFunctionReference<"mutation">("identity:markOrganizationDeleted");
const markOrganizationMembershipDeletedRef = makeFunctionReference<"mutation">("identity:markOrganizationMembershipDeleted");
const getUserByClerkIdRef = makeFunctionReference<"query">("identity:getUserByClerkId");
const getOrganizationByClerkIdRef = makeFunctionReference<"query">("identity:getOrganizationByClerkId");
const getMembershipByClerkIdRef = makeFunctionReference<"query">("identity:getMembershipByClerkId");

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
  traineeId?: string;
  traineeClerkUserId?: string;
  assistantId: string;
  difficulty: string;
  objectionsRequired: number;
  rebuttalKeys: string[];
  selectedObjections?: Array<{ order: number; text: string; rebuttalType: string }>;
  rebuttalGuideMap?: Record<string, string>;
  channel: "web";
  identityMode?: "ip_match" | "backup_code" | "manual_override";
  ipHash?: string;
  initialStatus?: "assigned" | "started";
  profileSnapshot?: {
    difficultyLevel: string;
    objectionsRequired: number;
    expectedRebuttals: string[];
  };
}) {
  const client = getClient();
  return client.mutation(createTrainingSessionRef, args as never) as Promise<{ sessionKey: string }>;
}

export async function markSessionCompleted(args: {
  sessionKey: string;
  endedAt?: number;
  sourceEventType?: string;
  durationSeconds?: number;
  finalScore?: number;
  toneStrikeCount?: number;
  appointmentSet?: boolean;
}) {
  const client = getClient();
  return client.mutation(markSessionCompletedRef, args as never) as Promise<{
    success: boolean;
    sessionKey: string;
    orgId: string;
    status: "completed";
    endedAt: number;
  }>;
}

export async function recordRebuttalScore(args: {
  sessionKey: string;
  objectionId?: string;
  rebuttalTypeExpected?: string;
  agentResponse: string;
  toneAnalysis?: string;
  score: number;
  grade: string;
  feedback?: string;
}) {
  const client = getClient();
  return client.mutation(recordRebuttalScoreRef, args as never) as Promise<{
    responseId: string;
    sessionKey: string;
    orgId: string;
    traineeId: string | null;
  }>;
}

export async function createTraineeProfile(args: {
  orgId: string;
  trainerId: string;
  clerkUserId?: string;
  clerkMembershipId?: string;
  name: string;
  email: string;
  difficultyLevel: string;
  numObjections: number;
  expectedRebuttals: string[];
  inviteTokenHash: string;
}) {
  const client = getClient();
  return client.mutation(createTraineeProfileRef, args as never) as Promise<{
    traineeId: string;
    created: boolean;
  }>;
}

export async function getTraineeByInviteTokenHash(args: { inviteTokenHash: string }) {
  const client = getClient();
  return client.query(getTraineeByInviteTokenHashRef, args as never) as Promise<{
    traineeId: string;
    orgId: string;
    trainerId: string;
    clerkUserId: string | null;
    clerkMembershipId: string | null;
    name: string;
    email: string;
    difficultyLevel: string;
    numObjections: number;
    expectedRebuttals: string[];
    status: string;
    lastActiveAt: number | null;
  } | null>;
}

export async function getTraineeByOrgAndEmail(args: { orgId: string; email: string }) {
  const client = getClient();
  return client.query(getTraineeByOrgAndEmailRef, args as never) as Promise<{
    traineeId: string;
    orgId: string;
    trainerId: string;
    clerkUserId: string | null;
    clerkMembershipId: string | null;
    name: string;
    email: string;
    difficultyLevel: string;
    numObjections: number;
    expectedRebuttals: string[];
    status: string;
    lastActiveAt: number | null;
  } | null>;
}

export async function getTraineeByClerkUserId(args: { orgId: string; clerkUserId: string }) {
  const client = getClient();
  return client.query(getTraineeByClerkUserIdRef, args as never) as Promise<{
    traineeId: string;
    orgId: string;
    trainerId: string;
    clerkUserId: string | null;
    clerkMembershipId: string | null;
    name: string;
    email: string;
    difficultyLevel: string;
    numObjections: number;
    expectedRebuttals: string[];
    status: string;
    lastActiveAt: number | null;
  } | null>;
}

export async function getTraineeProfileById(args: { traineeId: string; orgId: string }) {
  const client = getClient();
  return client.query(getTraineeProfileByIdRef, args as never) as Promise<{
    traineeId: string;
    orgId: string;
    trainerId: string;
    clerkUserId: string | null;
    clerkMembershipId: string | null;
    name: string;
    email: string;
    difficultyLevel: string;
    numObjections: number;
    expectedRebuttals: string[];
    status: string;
    lastActiveAt: number | null;
  } | null>;
}

export async function listTraineesByOrg(args: { orgId: string; limit?: number }) {
  const client = getClient();
  return client.query(listTraineesByOrgRef, args as never) as Promise<
    Array<{
      traineeId: string;
      clerkUserId: string | null;
      clerkMembershipId: string | null;
      name: string;
      email: string;
      difficultyLevel: string;
      numObjections: number;
      expectedRebuttals: string[];
      status: string;
      updatedAt: number;
      lastActiveAt: number | null;
      ipAddressMasked: string | null;
      ipConsentedAt: number | null;
    }>
  >;
}

export async function disableTraineeProfile(args: { traineeId: string; orgId: string }) {
  const client = getClient();
  return client.mutation(disableTraineeProfileRef, args as never) as Promise<{
    traineeId: string;
    status: "disabled";
    updatedAt: number;
    alreadyDisabled: boolean;
  }>;
}

export async function markAssignedSessionStarted(args: {
  sessionKey: string;
  orgId: string;
  traineeId: string;
  traineeClerkUserId: string;
}) {
  const client = getClient();
  return client.mutation(markAssignedSessionStartedRef, args as never) as Promise<{
    sessionKey: string;
    status: string;
    startedAt: number;
  }>;
}

export async function getAssignedSessionForTraineeStart(args: {
  sessionKey: string;
  orgId: string;
  clerkUserId: string;
}) {
  const client = getClient();
  return client.query(getAssignedSessionForTraineeStartRef, args as never) as Promise<{
    sessionKey: string;
    orgId: string;
    trainerId: string;
    traineeId: string;
    traineeClerkUserId: string;
    traineeName: string;
    assistantId: string;
    difficulty: string;
    objectionsRequired: number;
    rebuttalKeys: string[];
    rebuttalGuideMap: Record<string, string>;
    selectedObjections: Array<{ order: number; text: string; rebuttalType: string }>;
    status: string;
  } | null>;
}

export async function linkTraineeIpByInviteTokenHash(args: {
  inviteTokenHash: string;
  ipHash: string;
  ipAddressMasked?: string;
}) {
  const client = getClient();
  return client.mutation(linkTraineeIpByInviteTokenHashRef, args as never) as Promise<{
    traineeId: string;
    orgId: string;
    trainerId: string;
    name: string;
    email: string;
    difficultyLevel: string;
    numObjections: number;
    expectedRebuttals: string[];
    consentedAt: number;
  }>;
}

export async function getTraineeProfileByIpHash(args: { ipHash: string }) {
  const client = getClient();
  return client.query(getTraineeProfileByIpHashRef, args as never) as Promise<{
    traineeId: string;
    orgId: string;
    trainerId: string;
    name: string;
    email: string;
    difficultyLevel: string;
    numObjections: number;
    expectedRebuttals: string[];
    status: string;
    lastActiveAt: number | null;
  } | null>;
}

export async function markTraineeActive(args: { traineeId: string }) {
  const client = getClient();
  return client.mutation(markTraineeActiveRef, args as never) as Promise<{
    traineeId: string;
    status: string;
    lastActiveAt: number;
  }>;
}

export async function getTraineeResultsSnapshot(args: { traineeId: string; orgId: string; limit?: number }) {
  const client = getClient();
  return client.query(getTraineeResultsSnapshotRef, args as never) as Promise<{
    trainee: {
      id: string;
      name: string;
      difficulty: string;
      numObjections: number;
      status: string;
    };
    latestSession: {
      sessionKey: string;
      status: string;
      assistantId: string;
      difficulty: string;
      objectionsRequired: number;
      startedAt: number;
      endedAt: number | null;
      structuredOutcome: {
        rebuttalPerformanceScore?: number;
        appointmentSet?: boolean;
        callSummary?: string;
        capturedAt: number;
        providerEventId?: string;
      } | null;
      recordingUrl: string | null;
      transcriptUrl: string | null;
    } | null;
    latestMetrics: {
      rebuttalScore: number | null;
      durationSeconds: number | null;
      toneStrikeCount: number | null;
      appointmentSet: boolean | null;
      eventType: string | null;
      createdAt: number;
    } | null;
    latestRebuttals: Array<{
      objectionId: string | null;
      rebuttalTypeExpected: string | null;
      response: string;
      toneAnalysis: string | null;
      score: number;
      grade: string;
      feedback: string | null;
      createdAt: number;
    }>;
    assignedSessions: Array<{
      sessionKey: string;
      status: string;
      difficulty: string;
      objectionsRequired: number;
      createdAt: number;
      startedAt: number | null;
      selectedObjections: Array<{ order: number; text: string; rebuttalType: string }>;
    }>;
    history: Array<{
      sessionKey: string;
      status: string;
      assistantId: string;
      difficulty: string;
      objectionsRequired: number;
      startedAt: number;
      endedAt: number | null;
      selectedObjections: Array<{ order: number; text: string; rebuttalType: string }>;
      structuredOutcome: {
        rebuttalPerformanceScore?: number;
        appointmentSet?: boolean;
        callSummary?: string;
        capturedAt: number;
        providerEventId?: string;
      } | null;
      recordingUrl: string | null;
      transcriptUrl: string | null;
      metrics: {
        rebuttalScore: number | null;
        durationSeconds: number | null;
        toneStrikeCount: number | null;
        appointmentSet: boolean | null;
        eventType: string | null;
        createdAt: number;
      } | null;
    }>;
  } | null>;
}

export async function getTrainerSessionBuilderSnapshot(args: { orgId: string; trainerId: string; limit?: number }) {
  const client = getClient();
  return client.query(getTrainerSessionBuilderSnapshotRef, args as never) as Promise<
    Array<{
      sessionKey: string;
      traineeId: string | null;
      traineeName: string;
      difficulty: string;
      objectionsRequired: number;
      selectedObjections: Array<{ order: number; text: string; rebuttalType: string }>;
      status: string;
      createdAt: number;
      startedAt: number | null;
      endedAt: number | null;
      structuredOutcome: {
        rebuttalPerformanceScore?: number;
        appointmentSet?: boolean;
        callSummary?: string;
        capturedAt: number;
        providerEventId?: string;
      } | null;
      recordingUrl: string | null;
      transcriptUrl: string | null;
    }>
  >;
}

export async function getOrgTrainerObjectionConfig(args: { orgId: string }) {
  const client = getClient();
  return client.query(getOrgTrainerObjectionConfigRef, args as never) as Promise<{
    orgId: string;
    objectionLibrary: {
      D1: Array<{ text: string; rebuttalType: string; frequency: string }>;
      D2: Array<{ text: string; rebuttalType: string; frequency: string }>;
      D3: Array<{ text: string; rebuttalType: string; frequency: string }>;
      D4: Array<{ text: string; rebuttalType: string; frequency: string }>;
      D5: Array<{ text: string; rebuttalType: string; frequency: string }>;
    };
    rebuttalGuides: Record<string, string>;
    updatedBy: string;
    createdAt: number;
    updatedAt: number;
  } | null>;
}

export async function upsertOrgTrainerObjectionConfig(args: {
  orgId: string;
  updatedBy: string;
  objectionLibrary: {
    D1: Array<{ text: string; rebuttalType: string; frequency: string }>;
    D2: Array<{ text: string; rebuttalType: string; frequency: string }>;
    D3: Array<{ text: string; rebuttalType: string; frequency: string }>;
    D4: Array<{ text: string; rebuttalType: string; frequency: string }>;
    D5: Array<{ text: string; rebuttalType: string; frequency: string }>;
  };
  rebuttalGuides: Record<string, string>;
}) {
  const client = getClient();
  return client.mutation(upsertOrgTrainerObjectionConfigRef, args as never) as Promise<{
    configId: string;
    created: boolean;
    updatedAt: number;
  }>;
}

export async function getOrgTrainerTrainingPlans(args: { orgId: string }) {
  const client = getClient();
  return client.query(getOrgTrainerTrainingPlansRef, args as never) as Promise<{
    orgId: string;
    plans: {
      day30: {
        goal: string;
        metricTarget: string;
        targetDate: string;
        notes: string;
      };
      day60: {
        goal: string;
        metricTarget: string;
        targetDate: string;
        notes: string;
      };
      day90: {
        goal: string;
        metricTarget: string;
        targetDate: string;
        notes: string;
      };
      coaching: {
        topic: string;
        focusType: string;
        scheduledAt: string;
        attendees: string;
        agenda: string;
      };
    };
    updatedBy: string;
    createdAt: number;
    updatedAt: number;
  } | null>;
}

export async function upsertOrgTrainerTrainingPlans(args: {
  orgId: string;
  updatedBy: string;
  plans: {
    day30: {
      goal: string;
      metricTarget: string;
      targetDate: string;
      notes: string;
    };
    day60: {
      goal: string;
      metricTarget: string;
      targetDate: string;
      notes: string;
    };
    day90: {
      goal: string;
      metricTarget: string;
      targetDate: string;
      notes: string;
    };
    coaching: {
      topic: string;
      focusType: string;
      scheduledAt: string;
      attendees: string;
      agenda: string;
    };
  };
}) {
  const client = getClient();
  return client.mutation(upsertOrgTrainerTrainingPlansRef, args as never) as Promise<{
    configId: string;
    created: boolean;
    updatedAt: number;
  }>;
}

export async function getTrainerDashboardSnapshot(args: { orgId: string; trainerId?: string }) {
  const client = getClient();
  return client.query(getTrainerDashboardSnapshotRef, args as never) as Promise<{
    hasData: boolean;
    totalAgents: number;
    avgScore: number;
    atD3Plus: number;
    hardStopRate: number;
    trainees: Array<{
      id: string;
      name: string;
      email: string;
      level: string;
      avgScore: number;
      callsThisLevel: number;
      hardStops: number;
      hardStopRate: number;
      objectionSuccessRate: number;
      appointmentSetRate: number;
      recommendation: string;
      focusArea: string;
      status: string;
      latestScore: number | null;
      latestSessionStatus: string | null;
      latestSessionAt: number | null;
    }>;
  }>;
}

export async function reserveTrialSession(args: { emailHash: string; sessionKey: string }) {
  const client = getClient();
  return client.mutation(reserveTrialSessionRef, args as never) as Promise<{ allowed: boolean; remaining: number }>;
}

export async function deleteSessionWithArtifacts(args: { sessionKey: string; orgId: string; userId: string }) {
  const client = getClient();
  return client.mutation(deleteSessionWithArtifactsRef, args as never) as Promise<{
    success: boolean;
    deletedResponses: number;
  }>;
}

export async function storeSessionRecording(args: {
  sessionKey: string;
  orgId: string;
  userId: string;
  recordingBuffer: string;
  mimeType?: string;
}) {
  const client = getClient();
  return client.mutation(storeSessionRecordingRef, args as never) as Promise<{
    success: boolean;
    sessionKey: string;
    storageId: string;
  }>;
}

export async function storeTranscript(args: {
  sessionKey: string;
  orgId: string;
  userId: string;
  transcriptText: string;
  mimeType?: string;
}) {
  const client = getClient();
  return client.mutation(storeTranscriptRef, args as never) as Promise<{
    success: boolean;
    sessionKey: string;
    storageId: string;
  }>;
}

export async function getSessionWithFiles(args: { sessionKey: string; orgId: string; userId: string; orgRole?: string }) {
  const client = getClient();
  return client.query(getSessionWithFilesRef, args as never) as Promise<{
    sessionKey: string;
    orgId: string;
    trainerId: string;
    traineeId: string | null;
    status: string;
    createdAt: number;
    endedAt: number | null;
    recordingStorageId: string | null;
    transcriptStorageId: string | null;
    recordingUrl: string | null;
    transcriptUrl: string | null;
  }>;
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

export async function logEmailEvent(args: {
  provider: "resend";
  eventType: string;
  sequence?: string;
  orgId?: string;
  recipient?: string;
  recipientHash?: string;
  status: "sent" | "failed";
  providerMessageId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}) {
  const client = getClient();
  return client.mutation(logEmailEventRef, args as never);
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

export async function getOrgEntitlement(args: { orgId: string; limit?: number }) {
  const client = getClient();
  return client.query(getOrgEntitlementRef, args as never) as Promise<{
    mode: "paid" | "trial" | "blocked";
    minutesUsed: number;
    minutesLimit: number | null;
    minutesRemaining: number;
    reason: string;
    currentPlan: {
      planId: "starter" | "pro" | "agency";
      interval: "monthly" | "annual" | null;
      stripeStatus: string | null;
      source: "subscription_price" | "checkout_metadata" | "event_fallback";
    } | null;
  }>;
}

export async function getOrganizationRevenueDashboard(args?: { limit?: number }) {
  const client = getClient();
  return client.query(getOrganizationRevenueDashboardRef, (args ?? {}) as never) as Promise<{
    generatedAt: number;
    totalOrganizations: number;
    payingOrganizations: number;
    activeTrainerCount: number;
    mrrCents: number;
    arrCents: number;
    organizations: Array<{
      orgId: string;
      orgName: string;
      orgStatus: string;
      activeTrainerCount: number;
      billingStatus: string;
      hasPaidAccess: boolean;
      mrrCents: number;
      arrCents: number;
      latestBillingAt: number | null;
      currentPlan: {
        planId: "starter" | "pro" | "agency";
        interval: "monthly" | "annual" | null;
        stripeStatus: string | null;
        source: "subscription_price" | "checkout_metadata" | "event_fallback";
      } | null;
    }>;
  }>;
}


export async function getStripeCustomerForOrg(args: { orgId: string }) {
  const client = getClient();
  return client.query(getStripeCustomerForOrgRef, args as never) as Promise<{
    stripeCustomerId: string | null;
  }>;
}

export async function reconcileStripeCustomerBilling(args: {
  stripeCustomerId: string;
  orgId: string;
  reassignBillingEvents?: boolean;
}) {
  const client = getClient();
  return client.mutation(reconcileStripeCustomerBillingRef, args as never) as Promise<{
    stripeCustomerId: string;
    orgId: string;
    mappingUpdated: boolean;
    previousOrgId: string | null;
    scannedBillingEvents: number;
    reassignedBillingEvents: number;
    reassignBillingEvents: boolean;
    reconciledAt: number;
  }>;
}

export async function upsertIdentityUser(args: {
  clerkUserId: string;
  primaryEmail?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  imageUrl?: string;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
}) {
  const client = getClient();
  return client.mutation(upsertUserRef, args as never);
}

export async function upsertIdentityOrganization(args: {
  clerkOrgId: string;
  name?: string;
  slug?: string;
  imageUrl?: string;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
}) {
  const client = getClient();
  return client.mutation(upsertOrganizationRef, args as never);
}

export async function upsertIdentityOrganizationMembership(args: {
  clerkMembershipId: string;
  clerkOrgId: string;
  clerkUserId: string;
  role?: string;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
}) {
  const client = getClient();
  return client.mutation(upsertOrganizationMembershipRef, args as never);
}

export async function markIdentityUserDeleted(args: {
  clerkUserId: string;
  updatedAt?: number;
}) {
  const client = getClient();
  return client.mutation(markUserDeletedRef, args as never);
}

export async function markIdentityOrganizationDeleted(args: {
  clerkOrgId: string;
  updatedAt?: number;
}) {
  const client = getClient();
  return client.mutation(markOrganizationDeletedRef, args as never);
}

export async function markIdentityOrganizationMembershipDeleted(args: {
  clerkMembershipId: string;
  updatedAt?: number;
}) {
  const client = getClient();
  return client.mutation(markOrganizationMembershipDeletedRef, args as never);
}

export async function getIdentityUserByClerkId(args: { clerkUserId: string }) {
  const client = getClient();
  return client.query(getUserByClerkIdRef, args as never);
}

export async function getIdentityOrganizationByClerkId(args: { clerkOrgId: string }) {
  const client = getClient();
  return client.query(getOrganizationByClerkIdRef, args as never);
}

export async function getIdentityMembershipByClerkId(args: { clerkMembershipId: string }) {
  const client = getClient();
  return client.query(getMembershipByClerkIdRef, args as never);
}
