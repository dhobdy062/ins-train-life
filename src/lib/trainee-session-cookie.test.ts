import {
  createTraineeSessionCookie,
  verifyTraineeSessionCookie,
} from "@/lib/trainee-session-cookie";

describe("trainee session cookie", () => {
  const originalSecret = process.env.TRAINEE_SESSION_SECRET;
  const originalVerifySecret = process.env.VERIFY_HMAC_SECRET;

  beforeEach(() => {
    process.env.TRAINEE_SESSION_SECRET = "unit-test-secret";
    process.env.VERIFY_HMAC_SECRET = "unit-test-verify-secret";
  });

  afterAll(() => {
    process.env.TRAINEE_SESSION_SECRET = originalSecret;
    process.env.VERIFY_HMAC_SECRET = originalVerifySecret;
  });

  it("verifies a valid signed cookie", () => {
    const token = createTraineeSessionCookie({
      traineeId: "trainee_1",
      orgId: "org_1",
      trainerId: "trainer_1",
    });

    const parsed = verifyTraineeSessionCookie(token);
    expect(parsed).not.toBeNull();
    expect(parsed?.traineeId).toBe("trainee_1");
    expect(parsed?.orgId).toBe("org_1");
    expect(parsed?.trainerId).toBe("trainer_1");
  });

  it("fails verification when token is tampered", () => {
    const token = createTraineeSessionCookie({
      traineeId: "trainee_1",
      orgId: "org_1",
      trainerId: "trainer_1",
    });

    const tampered = `${token}x`;
    expect(verifyTraineeSessionCookie(tampered)).toBeNull();
  });
});
