import { auth } from "@clerk/nextjs/server";
import { getTraineeResultsSnapshot } from "@/lib/convex";
import { resolveAuthenticatedTrainee } from "@/lib/trainee-access";
import { GET } from "@/app/api/trainee/results/route";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/convex", () => ({
  getTraineeResultsSnapshot: jest.fn(),
}));

jest.mock("@/lib/trainee-access", () => ({
  resolveAuthenticatedTrainee: jest.fn(),
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedGetTraineeResultsSnapshot = getTraineeResultsSnapshot as jest.MockedFunction<typeof getTraineeResultsSnapshot>;
const mockedResolveAuthenticatedTrainee = resolveAuthenticatedTrainee as jest.MockedFunction<
  typeof resolveAuthenticatedTrainee
>;

describe("GET /api/trainee/results", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
    } as Awaited<ReturnType<typeof auth>>);
  });

  it("returns 401 when the viewer is not signed in", async () => {
    mockedAuth.mockResolvedValue({
      userId: null,
      orgId: null,
    } as Awaited<ReturnType<typeof auth>>);

    const response = await GET(new Request("https://example.test/api/trainee/results"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Sign in to open your trainee dashboard.",
    });
  });

  it("returns 404 when no trainee seat can be resolved", async () => {
    mockedResolveAuthenticatedTrainee.mockResolvedValue({
      trainee: null,
      resolution: "not_found",
      repaired: false,
    });

    const response = await GET(new Request("https://example.test/api/trainee/results"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Your trainee seat is not active for this team yet.",
    });
    expect(mockedGetTraineeResultsSnapshot).not.toHaveBeenCalled();
  });

  it("clamps the limit and returns the normalized snapshot payload", async () => {
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
      resolution: "email_match_repaired",
      repaired: true,
    });
    mockedGetTraineeResultsSnapshot.mockResolvedValue({
      trainee: {
        id: "trainee_1",
        name: "Alex Agent",
        difficulty: "D2",
        numObjections: 3,
        status: "active",
      },
      latestSession: {
        sessionKey: "sess_1",
        status: "completed",
        productType: "medicare_lead",
        assistantId: "assistant_1",
        difficulty: "D2",
        objectionsRequired: 3,
        startedAt: 1000,
        endedAt: 2000,
        structuredOutcome: {
          rebuttalPerformanceScore: 91,
          appointmentSet: true,
          callSummary: "Strong call",
          capturedAt: 3000,
          providerEventId: "evt_1",
        },
        recordingUrl: "https://files.test/recording.wav",
        transcriptUrl: "https://files.test/transcript.txt",
      },
      latestMetrics: {
        rebuttalScore: 91,
        durationSeconds: 180,
        toneStrikeCount: 0,
        appointmentSet: true,
        eventType: "call.completed",
        createdAt: 3000,
      },
      latestRebuttals: [
        {
          objectionId: "obj_1",
          rebuttalTypeExpected: "busy",
          response: "I can be brief.",
          toneAnalysis: "calm",
          score: 92,
          grade: "A",
          feedback: "Good pace.",
          createdAt: 1500,
        },
      ],
      assignedSessions: [
        {
          sessionKey: "sess_assigned",
          status: "assigned",
          productType: "medicare_event",
          difficulty: "D2",
          objectionsRequired: 2,
          createdAt: 4000,
          startedAt: null,
          selectedObjections: [{ order: 0, text: "Busy", rebuttalType: "busy" }],
        },
      ],
      history: [
        {
          sessionKey: "sess_1",
          status: "completed",
          productType: "medicare_lead",
          assistantId: "assistant_1",
          difficulty: "D2",
          objectionsRequired: 3,
          startedAt: 1000,
          endedAt: 2000,
          selectedObjections: [{ order: 0, text: "Busy", rebuttalType: "busy" }],
          structuredOutcome: {
            rebuttalPerformanceScore: 91,
            appointmentSet: true,
            callSummary: "Strong call",
            capturedAt: 3000,
            providerEventId: "evt_1",
          },
          recordingUrl: "https://files.test/recording.wav",
          transcriptUrl: "https://files.test/transcript.txt",
          metrics: {
            rebuttalScore: 91,
            durationSeconds: 180,
            toneStrikeCount: 0,
            appointmentSet: true,
            eventType: "call.completed",
            createdAt: 3000,
          },
        },
      ],
    });

    const response = await GET(new Request("https://example.test/api/trainee/results?limit=99"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockedGetTraineeResultsSnapshot).toHaveBeenCalledWith({
      traineeId: "trainee_1",
      orgId: "org_1",
      limit: 25,
    });
    expect(payload).toMatchObject({
      resolution: "email_match_repaired",
      identityRepaired: true,
      trainee: {
        id: "trainee_1",
        name: "Alex Agent",
        difficulty: "D2",
        numObjections: 3,
        status: "active",
      },
      latestSession: {
        sessionKey: "sess_1",
        status: "completed",
        productType: "medicare_lead",
        assistantId: "assistant_1",
        recordingUrl: "https://files.test/recording.wav",
        transcriptUrl: "https://files.test/transcript.txt",
      },
      latestMetrics: {
        score: 91,
        durationSeconds: 180,
        toneStrikes: 0,
        appointmentSet: true,
        eventType: "call.completed",
      },
    });
    expect(payload.latestSession.startedAt).toBe("1970-01-01T00:00:01.000Z");
    expect(payload.latestSession.endedAt).toBe("1970-01-01T00:00:02.000Z");
    expect(payload.latestMetrics.createdAt).toBe("1970-01-01T00:00:03.000Z");
    expect(payload.history[0].productType).toBe("medicare_lead");
    expect(payload.assignedSessions[0].productType).toBe("medicare_event");
    expect(payload.assignedSessions[0].startedAt).toBeNull();
  });
});
