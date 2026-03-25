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

describe("POST /api/trainer/sessions/[sessionKey]/evaluation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires an authenticated trainer session", async () => {
    (clerkAuth.auth as jest.Mock).mockResolvedValue({
      userId: null,
      orgId: null,
    });

    const response = await POST(new Request("http://localhost/api/trainer/sessions/sess_1/evaluation", { method: "POST" }), {
      params: Promise.resolve({ sessionKey: "sess_1" }),
    });

    expect(response.status).toBe(401);
  });

  it("re-runs the evaluation for the requested session", async () => {
    (clerkAuth.auth as jest.Mock).mockResolvedValue({
      userId: "trainer_1",
      orgId: "org_1",
    });
    (rerunTrainingSessionEvaluation as jest.Mock).mockResolvedValue({
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
    expect(rerunTrainingSessionEvaluation).toHaveBeenCalledWith({
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
    (clerkAuth.auth as jest.Mock).mockResolvedValue({
      userId: "trainer_1",
      orgId: "org_1",
    });
    (rerunTrainingSessionEvaluation as jest.Mock).mockRejectedValue(new Error("Session not found."));

    const response = await POST(new Request("http://localhost/api/trainer/sessions/sess_1/evaluation", { method: "POST" }), {
      params: Promise.resolve({ sessionKey: "sess_1" }),
    });

    expect(response.status).toBe(404);
  });
});
