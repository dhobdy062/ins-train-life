import { POST } from "./route";
import * as clerkAuth from "@clerk/nextjs/server";
import { rerunTrainingSessionEvaluation } from "@/lib/convex";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/convex", () => ({
  ...jest.requireActual("@/lib/convex"),
  rerunTrainingSessionEvaluation: jest.fn(),
}));

const mockedAuth = clerkAuth.auth as unknown as jest.MockedFunction<typeof clerkAuth.auth>;
const mockedRerunTrainingSessionEvaluation = rerunTrainingSessionEvaluation as jest.MockedFunction<
  typeof rerunTrainingSessionEvaluation
>;

describe("POST /api/trainer/sessions/[sessionKey]/evaluation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires an authenticated trainer session", async () => {
    mockedAuth.mockResolvedValue({
      userId: null,
      orgId: null,
    } as Awaited<ReturnType<typeof clerkAuth.auth>>);

    const response = await POST(new Request("http://localhost/api/trainer/sessions/sess_1/evaluation", { method: "POST" }), {
      params: Promise.resolve({ sessionKey: "sess_1" }),
    });

    expect(response.status).toBe(401);
  });

  it("re-runs the evaluation for the requested session", async () => {
    mockedAuth.mockResolvedValue({
      userId: "trainer_1",
      orgId: "org_1",
    } as Awaited<ReturnType<typeof clerkAuth.auth>>);
    mockedRerunTrainingSessionEvaluation.mockResolvedValue({
      found: true,
      evaluationId: "eval_1",
      status: "failed",
      attemptCount: 3,
    });

    const response = await POST(new Request("http://localhost/api/trainer/sessions/sess_1/evaluation", { method: "POST" }), {
      params: Promise.resolve({ sessionKey: "sess_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedRerunTrainingSessionEvaluation).toHaveBeenCalledWith({
      sessionKey: "sess_1",
      orgId: "org_1",
      trainerId: "trainer_1",
    });
    expect(body).toEqual({
      ok: true,
      found: true,
      evaluationId: "eval_1",
      status: "failed",
      attemptCount: 3,
    });
  });

  it("returns 404 when the trainer does not own the session", async () => {
    mockedAuth.mockResolvedValue({
      userId: "trainer_1",
      orgId: "org_1",
    } as Awaited<ReturnType<typeof clerkAuth.auth>>);
    mockedRerunTrainingSessionEvaluation.mockRejectedValue(new Error("Session not found."));

    const response = await POST(new Request("http://localhost/api/trainer/sessions/sess_1/evaluation", { method: "POST" }), {
      params: Promise.resolve({ sessionKey: "sess_1" }),
    });

    expect(response.status).toBe(404);
  });
});
