import { POST } from "@/app/api/lead/route";
import { getEmailClient, getFromAddress } from "@/lib/email";
import { logEmailEvent, upsertDemoProspect } from "@/lib/convex";

const mockedProvisionDemoProspectIdentity = jest.fn();

jest.mock("@/lib/email", () => ({
  getEmailClient: jest.fn(),
  getFromAddress: jest.fn(),
}));

jest.mock("@/lib/convex", () => ({
  logEmailEvent: jest.fn(),
  upsertDemoProspect: jest.fn(),
}));

jest.mock(
  "@/lib/clerk-demo-prospects",
  () => ({
    provisionDemoProspectIdentity: (...args: unknown[]) => mockedProvisionDemoProspectIdentity(...args),
  }),
  { virtual: true },
);

const mockedGetEmailClient = getEmailClient as jest.MockedFunction<typeof getEmailClient>;
const mockedGetFromAddress = getFromAddress as jest.MockedFunction<typeof getFromAddress>;
const mockedLogEmailEvent = logEmailEvent as jest.MockedFunction<typeof logEmailEvent>;
const mockedUpsertDemoProspect = upsertDemoProspect as jest.MockedFunction<typeof upsertDemoProspect>;

describe("POST /api/lead", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetFromAddress.mockReturnValue("demo@example.com");
    mockedLogEmailEvent.mockResolvedValue(undefined);
    mockedUpsertDemoProspect.mockResolvedValue({
      demoProspectId: "demo_123",
      created: true,
      demoCount: 0,
      demoLimit: 2,
    } as never);
    mockedProvisionDemoProspectIdentity.mockResolvedValue({
      clerkUserId: "user_123",
      clerkOrgId: "org_123",
      clerkMembershipId: "membership_123",
      organizationName: "North Ridge Agency",
      normalizedEmail: "jess@example.com",
      signInUrl: "https://clerk.example.com/sign-in/token_123",
      createdUser: true,
      createdOrganization: true,
      createdMembership: true,
    } as never);
  });

  it("provisions an authenticated demo prospect without requiring policyType", async () => {
    const send = jest.fn().mockResolvedValue({ data: { id: "email_123" } });
    mockedGetEmailClient.mockReturnValue({
      emails: {
        send,
      },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jess Corrick",
          agency: "North Ridge Agency",
          email: "jess@example.com",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
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
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jess@example.com",
        subject: "Access your Cream No Sugar demo",
        html: expect.stringContaining("https://clerk.example.com/sign-in/token_123"),
      }),
    );
  });

  it("returns a recoverable error when email delivery fails after provisioning", async () => {
    const send = jest.fn().mockResolvedValue({ error: { message: "Mailbox unavailable" } });
    mockedGetEmailClient.mockReturnValue({
      emails: {
        send,
      },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jess Corrick",
          agency: "North Ridge Agency",
          email: "jess@example.com",
        }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "Authenticated demo signup succeeded, but email delivery failed.",
    });
  });
});
