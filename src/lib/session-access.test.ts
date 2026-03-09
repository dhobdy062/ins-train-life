import { canAccessAssignedSession } from "@/lib/session-access";

describe("canAccessAssignedSession", () => {
  const session = {
    orgId: "org_1",
    trainerId: "trainer_1",
    traineeClerkUserId: "user_trainee_1",
  };

  it("allows the owning trainer", () => {
    expect(canAccessAssignedSession(session, { userId: "trainer_1", orgId: "org_1" })).toBe(true);
  });

  it("allows the assigned trainee", () => {
    expect(canAccessAssignedSession(session, { userId: "user_trainee_1", orgId: "org_1" })).toBe(true);
  });

  it("allows org admins in the same org", () => {
    expect(canAccessAssignedSession(session, { userId: "admin_1", orgId: "org_1", orgRole: "org:admin" })).toBe(true);
  });

  it("rejects unrelated org members", () => {
    expect(canAccessAssignedSession(session, { userId: "other_user", orgId: "org_1", orgRole: "org:member" })).toBe(
      false,
    );
  });
});
