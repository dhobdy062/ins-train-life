import { buildAssignedSessionStartUpdate } from "@/lib/assigned-session-start";

describe("buildAssignedSessionStartUpdate", () => {
  it("starts assigned sessions and backfills missing trainee identity", () => {
    expect(
      buildAssignedSessionStartUpdate(
        {
          status: "assigned",
          startedAt: null,
          traineeClerkUserId: null,
        },
        "user_trainee_1",
        1234,
      ),
    ).toEqual({
      patch: {
        status: "started",
        startedAt: 1234,
        traineeClerkUserId: "user_trainee_1",
        updatedAt: 1234,
      },
      status: "started",
      startedAt: 1234,
      traineeClerkUserId: "user_trainee_1",
    });
  });

  it("backfills the trainee identity for in-progress sessions that are missing it", () => {
    expect(
      buildAssignedSessionStartUpdate(
        {
          status: "started",
          startedAt: 4567,
          traineeClerkUserId: null,
        },
        "user_trainee_1",
        9999,
      ),
    ).toEqual({
      patch: {
        traineeClerkUserId: "user_trainee_1",
        updatedAt: 9999,
      },
      status: "started",
      startedAt: 4567,
      traineeClerkUserId: "user_trainee_1",
    });
  });

  it("leaves already-linked started sessions unchanged", () => {
    expect(
      buildAssignedSessionStartUpdate(
        {
          status: "started",
          startedAt: 4567,
          traineeClerkUserId: "user_trainee_1",
        },
        "user_trainee_1",
        9999,
      ),
    ).toEqual({
      patch: null,
      status: "started",
      startedAt: 4567,
      traineeClerkUserId: "user_trainee_1",
    });
  });
});
