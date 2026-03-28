import { GET } from "@/app/api/verify/route";
import { verifyToken } from "@/lib/token";
import { provisionDemoProspectIdentity } from "@/lib/clerk-demo-prospects";
import { upsertDemoProspect } from "@/lib/convex";

jest.mock("@/lib/token", () => ({
  verifyToken: jest.fn(),
}));

jest.mock("@/lib/convex", () => ({
  upsertDemoProspect: jest.fn(),
}));

jest.mock("@/lib/clerk-demo-prospects", () => ({
  provisionDemoProspectIdentity: jest.fn(),
}));

const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockedProvisionDemoProspectIdentity =
  provisionDemoProspectIdentity as jest.MockedFunction<typeof provisionDemoProspectIdentity>;
const mockedUpsertDemoProspect = upsertDemoProspect as jest.MockedFunction<typeof upsertDemoProspect>;

describe("GET /api/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerifyToken.mockReturnValue({
      name: "Jess Corrick",
      agency: "North Ridge Agency",
      email: "jess@example.com",
      exp: Date.now() + 60_000,
    } as never);
    mockedProvisionDemoProspectIdentity.mockResolvedValue({
      clerkUserId: "user_123",
      clerkOrgId: "org_123",
      clerkMembershipId: "membership_123",
      organizationName: "North Ridge Agency",
      normalizedEmail: "jess@example.com",
      signInUrl: "https://clerk.example.com/sign-in/token_123",
    } as never);
    mockedUpsertDemoProspect.mockResolvedValue({
      demoProspectId: "demo_123",
      created: true,
      demoCount: 0,
      demoLimit: 2,
    } as never);
  });

  it("redirects valid legacy verification links into authenticated Clerk sign-in", async () => {
    process.env.VERIFY_HMAC_SECRET = "test-secret";

    const response = await GET(new Request("http://localhost/api/verify?token=valid"));

    expect(response.headers.get("location")).toBe("https://clerk.example.com/sign-in/token_123");
    expect(mockedProvisionDemoProspectIdentity).toHaveBeenCalledWith({
      email: "jess@example.com",
      name: "Jess Corrick",
      organizationName: "North Ridge Agency",
    });
    expect(mockedUpsertDemoProspect).toHaveBeenCalledWith({
      clerkUserId: "user_123",
      orgId: "org_123",
      email: "jess@example.com",
      name: "Jess Corrick",
      organizationName: "North Ridge Agency",
    });
  });

  it("redirects missing token requests back to the lead form", async () => {
    const response = await GET(new Request("http://localhost/api/verify"));

    expect(response.headers.get("location")).toBe("http://localhost/#lead-form");
  });

  it("redirects unverifiable token requests back to the lead form", async () => {
    process.env.VERIFY_HMAC_SECRET = "test-secret";
    mockedVerifyToken.mockReturnValue(null);

    const response = await GET(new Request("http://localhost/api/verify?token=invalid"));

    expect(response.headers.get("location")).toBe("http://localhost/#lead-form");
  });
});
