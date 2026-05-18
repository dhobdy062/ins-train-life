import { POST } from "./route";
import * as clerkAuth from "@clerk/nextjs/server";
import { createTrainingSession, getOrCreateSelfTraineeProfile, getTraineeProfileById } from "@/lib/convex";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/convex", () => ({
  getTraineeProfileById: jest.fn(),
  getOrCreateSelfTraineeProfile: jest.fn(),
  getOrgTrainerObjectionConfig: jest.fn().mockResolvedValue(null),
  createTrainingSession: jest.fn().mockResolvedValue({ sessionKey: "fake_session" }),
}));

jest.mock("@/lib/clerk-org-join", () => ({
  getClerkUserProfile: jest.fn().mockResolvedValue({
    clerkUserId: "trainer_123",
    name: "Trainer User",
    email: "trainer@example.com",
  }),
}));

const mockedAuth = clerkAuth.auth as unknown as jest.MockedFunction<typeof clerkAuth.auth>;
const mockedGetTraineeProfileById = getTraineeProfileById as jest.MockedFunction<typeof getTraineeProfileById>;
const mockedGetOrCreateSelfTraineeProfile = getOrCreateSelfTraineeProfile as jest.MockedFunction<typeof getOrCreateSelfTraineeProfile>;
const mockedCreateTrainingSession = createTrainingSession as jest.MockedFunction<typeof createTrainingSession>;

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/trainer/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/trainer/sessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue({
      userId: "trainer_123",
      orgId: "org_123",
    } as Awaited<ReturnType<typeof clerkAuth.auth>>);
    mockedGetTraineeProfileById.mockResolvedValue({
      traineeId: "trainee_123",
      orgId: "org_123",
      trainerId: "trainer_123",
      clerkUserId: "clerk_trainee_123",
      clerkMembershipId: "membership_123",
      name: "Test Trainee",
      email: "trainee@example.com",
      difficultyLevel: "D2",
      numObjections: 3,
      expectedRebuttals: ["spouse"],
      status: "active",
      lastActiveAt: 1234,
    } as NonNullable<Awaited<ReturnType<typeof getTraineeProfileById>>>);
    mockedGetOrCreateSelfTraineeProfile.mockResolvedValue({
      traineeId: "self_trainee_123",
      orgId: "org_123",
      trainerId: "trainer_123",
      clerkUserId: "trainer_123",
      clerkMembershipId: null,
      name: "Trainer User",
      email: "trainer@example.com",
      availableProductTypes: ["life", "medicare_lead", "medicare_event"],
      difficultyLevel: "D2",
      numObjections: 3,
      expectedRebuttals: ["dont_remember", "not_interested"],
      status: "active",
      lastActiveAt: 1234,
      created: false,
    } as Awaited<ReturnType<typeof getOrCreateSelfTraineeProfile>>);
    process.env.VAPI_ASSISTANT_D2_LIFE_ID = "assistant_life_d2";
    process.env.VAPI_ASSISTANT_D2_MEDICARE_LEAD_ID = "assistant_medicare_lead_d2";
    process.env.VAPI_ASSISTANT_D3_MEDICARE_EVENT_ID = "assistant_medicare_event_d3";
  });

  it("creates a Life Lead session by default", async () => {
    const response = await POST(
      buildRequest({
        traineeId: "trainee_123",
        difficulty: "D2",
        selectedObjections: [{ text: "How did you get my number?", rebuttalType: "dont_remember" }],
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedCreateTrainingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        productType: "life",
        assistantId: "assistant_life_d2",
        difficulty: "D2",
      }),
    );
  });

  it("creates a Medicare Lead session with the Medicare assistant", async () => {
    const response = await POST(
      buildRequest({
        traineeId: "trainee_123",
        productType: "medicare_lead",
        difficulty: "D2",
        selectedObjections: [{ text: "I am worried this will cost me more.", rebuttalType: "medicare_cost_concern" }],
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedCreateTrainingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        productType: "medicare_lead",
        assistantId: "assistant_medicare_lead_d2",
        profileSnapshot: expect.objectContaining({ productType: "medicare_lead" }),
      }),
    );
  });

  it("creates a Medicare Event session with the Medicare event assistant", async () => {
    const response = await POST(
      buildRequest({
        traineeId: "trainee_123",
        productType: "medicare_event",
        difficulty: "D3",
        selectedObjections: [
          { text: "Transportation is difficult for me.", rebuttalType: "medicare_event_transportation" },
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedCreateTrainingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        productType: "medicare_event",
        assistantId: "assistant_medicare_event_d3",
      }),
    );
  });

  it("returns 400 for an invalid product", async () => {
    const response = await POST(
      buildRequest({
        traineeId: "trainee_123",
        productType: "medical_lead",
        difficulty: "D2",
        selectedObjections: [{ text: "How did you get my number?", rebuttalType: "dont_remember" }],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid product type." });
    expect(mockedCreateTrainingSession).not.toHaveBeenCalled();
  });

  it("returns 400 when Medicare uses a Life-only difficulty", async () => {
    const response = await POST(
      buildRequest({
        traineeId: "trainee_123",
        productType: "medicare_lead",
        difficulty: "D4",
        selectedObjections: [{ text: "I already have a Medicare plan and do not need another one.", rebuttalType: "medicare_plan_confusion" }],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "D4 is not available for Medicare Lead." });
    expect(mockedCreateTrainingSession).not.toHaveBeenCalled();
  });

  it("creates a self session with a random persisted objection sequence", async () => {
    const response = await POST(
      buildRequest({
        target: "self",
        productType: "life",
        difficulty: "D2",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedGetTraineeProfileById).not.toHaveBeenCalled();
    expect(mockedGetOrCreateSelfTraineeProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_123",
        clerkUserId: "trainer_123",
      }),
    );
    expect(mockedCreateTrainingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        traineeId: "self_trainee_123",
        traineeClerkUserId: "trainer_123",
        objectionsRequired: expect.any(Number),
        selectedObjections: expect.arrayContaining([
          expect.objectContaining({ order: 0, text: expect.any(String), rebuttalType: expect.any(String) }),
        ]),
        initialStatus: "assigned",
      }),
    );
  });

  it("rejects manually selected objections for self sessions", async () => {
    const response = await POST(
      buildRequest({
        target: "self",
        difficulty: "D2",
        selectedObjections: [{ text: "How did you get my number?", rebuttalType: "dont_remember" }],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Self sessions choose objections automatically." });
    expect(mockedCreateTrainingSession).not.toHaveBeenCalled();
  });
});
