import { auth } from "@clerk/nextjs/server";
import {
  getAssignedSessionForTraineeStart,
  markAssignedSessionStarted,
  recordAlert,
} from "@/lib/convex";
import { buildAgentVariableValues } from "@/lib/agent-context";
import { validateAssistantVariableContract } from "@/lib/assistant-variable-contract";
import { resolveAuthenticatedTrainee } from "@/lib/trainee-access";
import { POST } from "@/app/api/vapi/trainee/session/start/route";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/convex", () => ({
  getAssignedSessionForTraineeStart: jest.fn(),
  markAssignedSessionStarted: jest.fn(),
  recordAlert: jest.fn(),
}));

jest.mock("@/lib/agent-context", () => ({
  buildAgentVariableValues: jest.fn(),
}));

jest.mock("@/lib/assistant-variable-contract", () => ({
  validateAssistantVariableContract: jest.fn(),
}));

jest.mock("@/lib/trainee-access", () => ({
  resolveAuthenticatedTrainee: jest.fn(),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedGetAssignedSessionForTraineeStart = getAssignedSessionForTraineeStart as jest.MockedFunction<
  typeof getAssignedSessionForTraineeStart
>;
const mockedMarkAssignedSessionStarted = markAssignedSessionStarted as jest.MockedFunction<
  typeof markAssignedSessionStarted
>;
const mockedRecordAlert = recordAlert as jest.MockedFunction<typeof recordAlert>;
const mockedBuildAgentVariableValues = buildAgentVariableValues as jest.MockedFunction<typeof buildAgentVariableValues>;
const mockedValidateAssistantVariableContract = validateAssistantVariableContract as jest.MockedFunction<
  typeof validateAssistantVariableContract
>;
const mockedResolveAuthenticatedTrainee = resolveAuthenticatedTrainee as jest.MockedFunction<
  typeof resolveAuthenticatedTrainee
>;

describe("POST /api/vapi/trainee/session/start", () => {
  const originalPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = "public_key_1";

    mockedAuth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
    } as Awaited<ReturnType<typeof auth>>);
    mockedResolveAuthenticatedTrainee.mockResolvedValue({
      trainee: {
        traineeId: "trainee_1",
        orgId: "org_1",
        trainerId: "trainer_1",
        clerkUserId: "user_1",
        clerkMembershipId: "membership_1",
        name: "Alex Agent",
        email: "alex@example.com",
        difficultyLevel: "D2",
        numObjections: 3,
        expectedRebuttals: ["busy", "send_info"],
        status: "active",
        lastActiveAt: 1234,
      },
      resolution: "direct_clerk_match",
      repaired: false,
    });
    mockedGetAssignedSessionForTraineeStart.mockResolvedValue({
      sessionKey: "sess_1",
      orgId: "org_1",
      trainerId: "trainer_1",
      traineeId: "trainee_1",
      traineeClerkUserId: "user_1",
      traineeName: "Alex Agent",
      assistantId: "assistant_1",
      difficulty: "D2",
      objectionsRequired: 3,
      rebuttalKeys: ["busy", "send_info"],
      rebuttalGuideMap: {
        busy: "Keep it brief.",
        send_info: "Offer a short review first.",
      },
      selectedObjections: [{ order: 0, text: "Busy", rebuttalType: "busy" }],
      status: "assigned",
    });
    mockedBuildAgentVariableValues.mockReturnValue({
      email_sequence_stage: "trainee_invitation",
      session_key: "sess_1",
      trainee_name: "Alex Agent",
    } as ReturnType<typeof buildAgentVariableValues>);
    mockedValidateAssistantVariableContract.mockReturnValue({
      ok: true,
      missingKeys: [],
    });
    mockedMarkAssignedSessionStarted.mockResolvedValue({
      sessionKey: "sess_1",
      status: "started",
      startedAt: 1000,
    });
    mockedRecordAlert.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = originalPublicKey;
  });

  it("returns 400 when the session key is missing", async () => {
    const response = await POST(
      new Request("https://example.test/api/vapi/trainee/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Session key is required.",
    });
    expect(mockedResolveAuthenticatedTrainee).not.toHaveBeenCalled();
  });

  it("returns 404 when no assigned session is available for the trainee", async () => {
    mockedGetAssignedSessionForTraineeStart.mockResolvedValue(null);

    const response = await POST(
      new Request("https://example.test/api/vapi/trainee/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: " sess_1 " }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "This assigned session is no longer available.",
    });
    expect(mockedResolveAuthenticatedTrainee).toHaveBeenCalledWith({
      userId: "user_1",
      orgId: "org_1",
      source: "api/vapi/trainee/session/start",
    });
    expect(mockedGetAssignedSessionForTraineeStart).toHaveBeenCalledWith({
      sessionKey: "sess_1",
      orgId: "org_1",
      clerkUserId: "user_1",
    });
  });

  it("returns 500 and records an alert when the assistant contract is invalid", async () => {
    mockedValidateAssistantVariableContract.mockReturnValue({
      ok: false,
      missingKeys: ["trainee_name"],
    });

    const response = await POST(
      new Request("https://example.test/api/vapi/trainee/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: "sess_1" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Training service configuration is invalid. Please contact support.",
    });
    expect(mockedRecordAlert).toHaveBeenCalledWith({
      source: "api/vapi/trainee/session/start.contract",
      severity: "critical",
      message: "Assistant variable contract validation failed.",
      context: {
        sessionKey: "sess_1",
        traineeId: "trainee_1",
        orgId: "org_1",
        missingKeys: ["trainee_name"],
      },
    });
    expect(mockedMarkAssignedSessionStarted).not.toHaveBeenCalled();
  });

  it("starts the assigned session and returns the VAPI payload", async () => {
    const response = await POST(
      new Request("https://example.test/api/vapi/trainee/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: "sess_1" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockedMarkAssignedSessionStarted).toHaveBeenCalledWith({
      sessionKey: "sess_1",
      orgId: "org_1",
      traineeId: "trainee_1",
      traineeClerkUserId: "user_1",
    });
    expect(payload).toMatchObject({
      sessionKey: "sess_1",
      assistantId: "assistant_1",
      publicKey: "public_key_1",
      metadata: {
        orgId: "org_1",
        trainerId: "trainer_1",
        traineeId: "trainee_1",
        sessionKey: "sess_1",
        sequenceStage: "trainee_invitation",
      },
    });
  });
});
