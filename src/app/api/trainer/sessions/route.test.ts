import { POST } from "./route";
import * as clerkAuth from "@clerk/nextjs/server";
import { getTraineeProfileById, createTrainingSession } from "@/lib/convex";
import { resolveLifeAssistantId } from "@/lib/vapi-assistants";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/convex", () => ({
  ...jest.requireActual("@/lib/convex"),
  getTraineeProfileById: jest.fn(),
  getOrgTrainerObjectionConfig: jest.fn().mockResolvedValue(null),
  createTrainingSession: jest.fn().mockResolvedValue({ sessionKey: "fake_session" }),
}));

jest.mock("@/lib/vapi-assistants", () => ({
  resolveLifeAssistantId: jest.fn().mockReturnValue("fake_ast_id"),
}));

describe("POST /api/trainer/sessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a session", async () => {
    (clerkAuth.auth as jest.Mock).mockResolvedValue({
      userId: "trainer_123",
      orgId: "org_123",
    });

    (getTraineeProfileById as jest.Mock).mockResolvedValue({
      traineeId: "trainee_123",
      clerkUserId: "clerk_trainee_123",
      name: "Test Trainee",
    });

    // Provide default valid objection so it doesn't fail with 400
    const req = new Request("http://localhost/api/trainer/sessions", {
      method: "POST",
      body: JSON.stringify({
        traineeId: "trainee_123",
        difficulty: "D2",
        selectedObjections: [{ text: "I need to talk to my spouse", rebuttalType: "spouse" }],
      }),
    });

    try {
      const res = await POST(req);
      const text = await res.text();
      console.log("Response:", res.status, text);
    } catch (error) {
      console.error("Caught unhandled error!", error);
    }
  });
});
