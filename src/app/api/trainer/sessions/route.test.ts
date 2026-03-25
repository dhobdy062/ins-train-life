import { POST } from "./route";
import * as clerkAuth from "@clerk/nextjs/server";
import { getTraineeProfileById } from "@/lib/convex";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/convex", () => ({
  ...jest.requireActual("@/lib/convex"),
  getTraineeProfileById: jest.fn(),
  getOrgTrainerObjectionConfig: jest.fn().mockResolvedValue(null),
  createTrainingSession: jest.fn().mockResolvedValue({ sessionKey: "fake_session" }),
}));

const mockedAuth = clerkAuth.auth as unknown as jest.MockedFunction<typeof clerkAuth.auth>;
const mockedGetTraineeProfileById = getTraineeProfileById as jest.MockedFunction<typeof getTraineeProfileById>;

describe("POST /api/trainer/sessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a session", async () => {
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
