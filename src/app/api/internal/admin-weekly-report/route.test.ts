import { GET } from "@/app/api/internal/admin-weekly-report/route";
import {
  auditIdentityAndSessionMismatches,
  checkLaggingWebhooks,
  getOrganizationRevenueDashboard,
  getTrainingSessionEvaluationAdminSnapshot,
  logEmailEvent,
} from "@/lib/convex";
import { getWeeklyAdminReportEmail } from "@/lib/admin-portal";
import { getAppUrl, getEmailClient, getFromAddress } from "@/lib/email";

jest.mock("@/lib/convex", () => ({
  auditIdentityAndSessionMismatches: jest.fn(),
  checkLaggingWebhooks: jest.fn(),
  getOrganizationRevenueDashboard: jest.fn(),
  getTrainingSessionEvaluationAdminSnapshot: jest.fn(),
  logEmailEvent: jest.fn(),
}));

jest.mock("@/lib/admin-portal", () => ({
  getWeeklyAdminReportEmail: jest.fn(),
}));

jest.mock("@/lib/email", () => ({
  getAppUrl: jest.fn(),
  getEmailClient: jest.fn(),
  getFromAddress: jest.fn(),
}));

const mockedAudit = auditIdentityAndSessionMismatches as jest.MockedFunction<typeof auditIdentityAndSessionMismatches>;
const mockedCheckLaggingWebhooks = checkLaggingWebhooks as jest.MockedFunction<typeof checkLaggingWebhooks>;
const mockedDashboard = getOrganizationRevenueDashboard as jest.MockedFunction<typeof getOrganizationRevenueDashboard>;
const mockedEvaluations = getTrainingSessionEvaluationAdminSnapshot as jest.MockedFunction<
  typeof getTrainingSessionEvaluationAdminSnapshot
>;
const mockedLogEmailEvent = logEmailEvent as jest.MockedFunction<typeof logEmailEvent>;
const mockedGetWeeklyAdminReportEmail = getWeeklyAdminReportEmail as jest.MockedFunction<typeof getWeeklyAdminReportEmail>;
const mockedGetAppUrl = getAppUrl as jest.MockedFunction<typeof getAppUrl>;
const mockedGetEmailClient = getEmailClient as jest.MockedFunction<typeof getEmailClient>;
const mockedGetFromAddress = getFromAddress as jest.MockedFunction<typeof getFromAddress>;

describe("GET /api/internal/admin-weekly-report", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";

    mockedAudit.mockResolvedValue({
      generatedAt: 1_700_000_000_000,
      scope: {
        orgId: null,
        staleAssignedAfterHours: 24,
        staleStartedAfterHours: 2,
      },
      counts: {
        traineesReviewed: 4,
        sessionsReviewed: 6,
        recentAlertsReviewed: 1,
        failedEmailDeliveries: 0,
        missingIdentityLink: 0,
        missingMembership: 0,
        recoverableByEmail: 0,
        assignedMissingClerkUser: 0,
        assignedIdentityMismatch: 0,
        staleAssignedSessions: 0,
        staleStartedSessions: 0,
      },
      samples: {
        missingIdentityLink: [],
        missingMembership: [],
        recoverableByEmail: [],
        assignedMissingClerkUser: [],
        assignedIdentityMismatch: [],
        staleAssignedSessions: [],
        staleStartedSessions: [],
        failedEmailDeliveries: [],
        recentAlerts: [],
      },
    });
    mockedEvaluations.mockResolvedValue({
      generatedAt: 1_700_000_000_000,
      counts: {
        total: 6,
        passed: 5,
        warning: 1,
        failed: 0,
      },
      recentIssues: [],
    });
    mockedDashboard.mockResolvedValue({
      generatedAt: 1_700_000_000_000,
      totalOrganizations: 2,
      payingOrganizations: 1,
      activeTrainerCount: 3,
      mrrCents: 7900,
      arrCents: 94800,
      organizations: [
        {
          orgId: "org_123",
          orgName: "North Ridge Agency",
          orgStatus: "active",
          activeTrainerCount: 3,
          billingStatus: "subscription_active",
          hasPaidAccess: true,
          mrrCents: 7900,
          arrCents: 94800,
          latestBillingAt: 1_700_000_000_000,
          currentPlan: {
            planId: "starter",
            interval: "monthly",
            stripeStatus: "active",
            source: "subscription_price",
          },
        },
      ],
    });
    mockedCheckLaggingWebhooks.mockResolvedValue({
      checked: 4,
      laggingCount: 0,
    });
    mockedLogEmailEvent.mockResolvedValue(undefined);
    mockedGetWeeklyAdminReportEmail.mockReturnValue("admin@example.com");
    mockedGetAppUrl.mockReturnValue("https://cream.example.com");
    mockedGetFromAddress.mockReturnValue("reports@example.com");
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("sends the weekly report to exactly one configured admin email", async () => {
    const send = jest.fn().mockResolvedValue({ data: { id: "email_123" } });
    mockedGetEmailClient.mockReturnValue({
      emails: {
        send,
      },
    } as never);

    const response = await GET(
      new Request("https://cream.example.com/api/internal/admin-weekly-report", {
        headers: {
          authorization: "Bearer cron-secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      sent: true,
      recipient: "admin@example.com",
      emailId: "email_123",
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "reports@example.com",
        to: "admin@example.com",
        subject: expect.stringContaining("weekly admin report"),
        text: expect.stringContaining("Admin dashboard: https://cream.example.com/dashboard/admin"),
      }),
    );
    expect(Array.isArray(send.mock.calls[0][0].to)).toBe(false);
    expect(mockedLogEmailEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "admin_weekly_report",
        recipient: "admin@example.com",
        status: "sent",
      }),
    );
  });

  it("rejects requests without the cron secret", async () => {
    const response = await GET(new Request("https://cream.example.com/api/internal/admin-weekly-report"));

    expect(response.status).toBe(401);
    expect(mockedGetEmailClient).not.toHaveBeenCalled();
  });
});
