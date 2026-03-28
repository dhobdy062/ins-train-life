import { NextRequest } from "next/server";
import { POST } from "@/app/api/vapi/trial/start/route";
import { auth } from "@clerk/nextjs/server";
import { buildAgentVariableValues } from "@/lib/agent-context";
import { validateAssistantVariableContract } from "@/lib/assistant-variable-contract";
import {
  getDemoProspectByUserAndOrg,
  recordAlert,
  reserveAuthenticatedDemoSession,
} from "@/lib/convex";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/convex", () => ({
  getDemoProspectByUserAndOrg: jest.fn(),
  reserveAuthenticatedDemoSession: jest.fn(),
  recordAlert: jest.fn(),
}));

jest.mock("@/lib/agent-context", () => ({
  buildAgentVariableValues: jest.fn(),
}));

jest.mock("@/lib/assistant-variable-contract", () => ({
  validateAssistantVariableContract: jest.fn(),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedGetDemoProspectByUserAndOrg = getDemoProspectByUserAndOrg as jest.MockedFunction<
  typeof getDemoProspectByUserAndOrg
>;
const mockedReserveAuthenticatedDemoSession = reserveAuthenticatedDemoSession as jest.MockedFunction<
  typeof reserveAuthenticatedDemoSession
>;
const mockedRecordAlert = recordAlert as jest.MockedFunction<typeof recordAlert>;
const mockedBuildAgentVariableValues = buildAgentVariableValues as jest.MockedFunction<typeof buildAgentVariableValues>;
const mockedValidateAssistantVariableContract =
  validateAssistantVariableContract as jest.MockedFunction<typeof validateAssistantVariableContract>;

describe("POST /api/vapi/trial/start", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VAPI_ASSISTANT_ID = "assistant_123";
    process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = "public_123";

    mockedAuth.mockResolvedValue({
      userId: "user_123",
      orgId: "org_123",
      sessionClaims: { org_role: "org:admin" },
    } as never);
    mockedGetDemoProspectByUserAndOrg.mockResolvedValue({
      demoProspectId: "demo_123",
      clerkUserId: "user_123",
      orgId: "org_123",
      email: "jess@example.com",
      name: "Jess Corrick",
      organizationName: "North Ridge Agency",
      status: "verified",
      demoCount: 0,
      demoLimit: 2,
    } as never);
    mockedReserveAuthenticatedDemoSession.mockResolvedValue({
      allowed: true,
      remaining: 1,
      sessionKey: "trial_123",
      demoCount: 1,
      demoLimit: 2,
    } as never);
    mockedBuildAgentVariableValues.mockReturnValue({
      brand_name: "Cream No Sugar",
      email_sequence_stage: "authenticated_demo",
    });
    mockedValidateAssistantVariableContract.mockReturnValue({
      ok: true,
      missingKeys: [],
    });
    mockedRecordAlert.mockResolvedValue(undefined);
  });

  it("starts a demo for an authenticated prospect without relying on demo cookies", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/vapi/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sessionKey: "trial_123",
      assistantId: "assistant_123",
      publicKey: "public_123",
      remainingTrialSessions: 1,
    });
    expect(mockedGetDemoProspectByUserAndOrg).toHaveBeenCalledWith({
      clerkUserId: "user_123",
      orgId: "org_123",
    });
    expect(mockedReserveAuthenticatedDemoSession).toHaveBeenCalledWith({
      clerkUserId: "user_123",
      orgId: "org_123",
      sessionKey: expect.any(String),
    });
  });

  it("blocks authenticated prospects that already used both demos", async () => {
    mockedReserveAuthenticatedDemoSession.mockResolvedValue({
      allowed: false,
      remaining: 0,
      sessionKey: "trial_123",
      demoCount: 2,
      demoLimit: 2,
    } as never);

    const response = await POST(
      new NextRequest("http://localhost/api/vapi/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "TRIAL_LIMIT_REACHED",
      message: "You have used both demo sessions.",
    });
  });
});
