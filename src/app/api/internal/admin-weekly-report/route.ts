import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  auditIdentityAndSessionMismatches,
  checkLaggingWebhooks,
  getOrganizationRevenueDashboard,
  getTrainingSessionEvaluationAdminSnapshot,
  logEmailEvent,
} from "@/lib/convex";
import { getWeeklyAdminReportEmail } from "@/lib/admin-portal";
import { getAppUrl, getEmailClient, getFromAddress } from "@/lib/email";
import {
  getBillingMappingIssues,
  getWeeklyAdminReportSubject,
  renderWeeklyAdminReportHtml,
  renderWeeklyAdminReportText,
} from "@/lib/admin-weekly-report";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 15;

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length);
}

function hashEmail(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret") ?? getBearerToken(request);

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const maxLagMs = Number(process.env.WEBHOOK_MAX_LAG_MS || 1000 * 60 * 5);
  const [audit, evaluations, revenue, lag] = await Promise.all([
    auditIdentityAndSessionMismatches({
      staleAssignedAfterHours: 24,
      staleStartedAfterHours: 2,
      sampleLimit: 8,
    }),
    getTrainingSessionEvaluationAdminSnapshot({ limit: 8 }),
    getOrganizationRevenueDashboard({ limit: 250 }).catch(() => null),
    checkLaggingWebhooks({
      maxLagMs,
      limit: 300,
    }),
  ]);

  const recipient = getWeeklyAdminReportEmail();
  const report = {
    appUrl: getAppUrl(),
    generatedAt: Date.now(),
    revenue,
    audit,
    evaluations,
    webhookLag: {
      ...lag,
      maxLagMs,
    },
    billingIssues: getBillingMappingIssues(revenue),
  };

  const resend = getEmailClient();
  const response = await resend.emails.send({
    from: getFromAddress(),
    to: recipient,
    subject: getWeeklyAdminReportSubject(report),
    html: renderWeeklyAdminReportHtml(report),
    text: renderWeeklyAdminReportText(report),
    headers: {
      "X-Cream-Sequence": "admin_weekly_report",
    },
  });

  const status = response.error ? "failed" : "sent";
  await logEmailEvent({
    provider: "resend",
    eventType: "admin_weekly_report",
    sequence: "admin_weekly_report",
    recipient,
    recipientHash: hashEmail(recipient),
    status,
    providerMessageId: response.data?.id ?? undefined,
    error: response.error?.message,
    metadata: {
      source: "api/internal/admin-weekly-report",
      mrrCents: revenue?.mrrCents ?? null,
      payingOrganizations: revenue?.payingOrganizations ?? null,
      billingIssueCount: report.billingIssues.length,
      evaluationIssueCount: evaluations.recentIssues.length,
      webhookLaggingCount: lag.laggingCount,
    },
  }).catch(() => null);

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    recipient,
    emailId: response.data?.id ?? null,
    billingIssueCount: report.billingIssues.length,
    evaluationIssueCount: evaluations.recentIssues.length,
    webhookLaggingCount: lag.laggingCount,
  });
}
