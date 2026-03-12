import { canAccessSessionFiles, canDeleteSessionFiles } from "@/lib/session-file-access";

describe("session file access", () => {
  const session = {
    orgId: "org_1",
    trainerId: "trainer_1",
    traineeClerkUserId: "user_trainee_1",
  };

  it("allows trainer, trainee, and same-org admin to access session files", () => {
    expect(canAccessSessionFiles(session, { userId: "trainer_1", orgId: "org_1" })).toBe(true);
    expect(canAccessSessionFiles(session, { userId: "user_trainee_1", orgId: "org_1" })).toBe(true);
    expect(canAccessSessionFiles(session, { userId: "admin_1", orgId: "org_1", orgRole: "org:admin" })).toBe(true);
  });

  it("rejects unrelated org members from accessing session files", () => {
    expect(canAccessSessionFiles(session, { userId: "member_1", orgId: "org_1", orgRole: "org:member" })).toBe(
      false,
    );
  });

  it("allows only the trainer or same-org admin to delete session files", () => {
    expect(canDeleteSessionFiles(session, { userId: "trainer_1", orgId: "org_1" })).toBe(true);
    expect(canDeleteSessionFiles(session, { userId: "admin_1", orgId: "org_1", orgRole: "org:admin" })).toBe(true);
    expect(canDeleteSessionFiles(session, { userId: "user_trainee_1", orgId: "org_1" })).toBe(false);
    expect(canDeleteSessionFiles(session, { userId: "member_1", orgId: "org_1", orgRole: "org:member" })).toBe(
      false,
    );
  });
});
