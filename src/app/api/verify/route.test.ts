import { GET } from "@/app/api/verify/route";
import { createToken, verifyToken } from "@/lib/token";

jest.mock("@/lib/token", () => ({
  createToken: jest.fn(),
  verifyToken: jest.fn(),
}));

const mockedCreateToken = createToken as jest.MockedFunction<typeof createToken>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe("GET /api/verify", () => {
  const originalSecret = process.env.VERIFY_HMAC_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VERIFY_HMAC_SECRET = "test-secret";
    mockedCreateToken.mockReturnValue("trial-token");
  });

  afterAll(() => {
    process.env.VERIFY_HMAC_SECRET = originalSecret;
  });

  it("redirects valid verification to /demo?state=verified", async () => {
    mockedVerifyToken.mockReturnValue({ email: "demo@example.com" });

    const response = await GET(new Request("http://localhost/api/verify?token=valid"));

    expect(response.headers.get("location")).toBe("http://localhost/demo?state=verified");
    expect(response.cookies.get("demo_verified")?.value).toBe("true");
    expect(response.cookies.get("demo_trial_identity")?.value).toBe("trial-token");
  });

  it("redirects missing token verification to /demo?state=invalid-link", async () => {
    const response = await GET(new Request("http://localhost/api/verify"));

    expect(response.headers.get("location")).toBe("http://localhost/demo?state=invalid-link");
  });

  it("redirects unverifiable token requests to /demo?state=invalid-link", async () => {
    mockedVerifyToken.mockImplementation(() => {
      throw new Error("invalid");
    });

    const response = await GET(new Request("http://localhost/api/verify?token=invalid"));

    expect(response.headers.get("location")).toBe("http://localhost/demo?state=invalid-link");
  });
});
