import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  auditIdentityAndSessionMismatches,
  checkLaggingWebhooks,
  getOrganizationRevenueDashboard,
  getTrainingSessionEvaluationAdminSnapshot,
  logEmailEvent,
} from "@/lib/convex";
import { getAdminNotificationEmails } from "@/lib/admin-portal";
import { getAppUrl, getEmailClient, getFromAddress } from "@/lib/email";

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

function formatDate(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp).toLocaleString() : "unknown time";
}

function sampleLine(item: Record<string, unknown>, keys: string[]) {
  return keys
    .map((key) => item[key])
    .filter((value) => value !== null && value !== undefined && String(value).trim().length > 0)
    .map(String)
    .join(" | ");
}

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret") ?? getBearerToken(request);

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [audit, evaluations, revenue, lag] = await Promise.all([
    auditIdentityAndSessionMismatches({
      staleAssignedAfterHours: 24,
      staleStartedAfterHours: 2,
      sampleLimit: 8,
    }),
    getTrainingSessionEvaluationAdminSnapshot({ limit: 8 }),
    getOrganizationRevenueDashboard({ limit: 250 }).catch(() => null),
    checkLaggingWebhooks({
      maxLagMs: Number(process.env.WEBHOOK_MAX_LAG_MS || 1000 * 60 * 5),
      limit: 300,
    }),
  ]);

  const billingIssues =
    revenue?.organizations.filter((organization) => {
      const hasBillingEvent = Boolean(organization.latestBillingAt);
      const hasPlan = Boolean(organization.currentPlan);
      return (
        hasBillingEvent &&
        !organization.hasPaidAccess &&
        !hasPlan &&
        organization.billingStatus !== "subscription_inactive"
      );
    }) ?? [];

  const urgentItems = [
    ["Broken training data flow", evaluations.counts.failed],
    ["Missing trainee sign-in links", audit.counts.missingIdentityLink],
    ["Missing org memberships", audit.counts.missingMembership],
    ["Stale started sessions", audit.counts.staleStartedSessions],
    ["Assigned sessions missing trainee identity", audit.counts.assignedMissingClerkUser],
    ["Identity mismatches", audit.counts.assignedIdentityMismatch],
    ["Webhook lag", lag.laggingCount],
    ["Billing mapping issues", billingIssues.length],
  ].filter(([, count]) => Number(count) > 0);

  const warningItems = [
    ["Stale assigned sessions", audit.counts.staleAssignedSessions],
    ["Failed email deliveries", audit.counts.failedEmailDeliveries],
    ["Training sessions needing review", evaluations.counts.warning],
    ["Recoverable identity links", audit.counts.recoverableByEmail],
  ].filter(([, count]) => Number(count) > 0);

  const shouldSend = urgentItems.length > 0 || warningItems.length > 0;
  if (!shouldSend) {
    return NextResponse.json({
      ok: true,
      sent: false,
      reason: "no_actionable_issues",
      generatedAt: audit.generatedAt,
    });
  }

  const recipients = getAdminNotificationEmails();
  const appUrl = getAppUrl();
  const subjectPrefix = urgentItems.length > 0 ? "Action needed" : "Ops digest";
  const subject = `Cream No Sugar ${subjectPrefix}: ${urgentItems.length} urgent, ${warningItems.length} warning`;
  const html = renderDigestHtml({
    appUrl,
    generatedAt: audit.generatedAt,
    urgentItems,
    warningItems,
    audit,
    evaluations,
    billingIssues,
  });
  const text = renderDigestText({
    appUrl,
    generatedAt: audit.generatedAt,
    urgentItems,
    warningItems,
    audit,
    evaluations,
    billingIssues,
  });

  const resend = getEmailClient();
  const response = await resend.emails.send({
    from: getFromAddress(),
    to: recipients,
    subject,
    html,
    text,
    headers: {
      "X-Cream-Sequence": "admin_alert_digest",
    },
  });

  const status = response.error ? "failed" : "sent";
  await Promise.all(
    recipients.map((recipient) =>
      logEmailEvent({
        provider: "resend",
        eventType: "admin_alert_digest",
        sequence: "admin_alert_digest",
        recipient,
        recipientHash: hashEmail(recipient),
        status,
        providerMessageId: response.data?.id ?? undefined,
        error: response.error?.message,
        metadata: {
          source: "api/internal/admin-alerts",
          urgentItems,
          warningItems,
        },
      }).catch(() => null),
    ),
  );

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    recipients: recipients.length,
    emailId: response.data?.id ?? null,
    urgentItems,
    warningItems,
  });
}

type DigestArgs = {
  appUrl: string;
  generatedAt: number;
  urgentItems: Array<(string | number)[]>;
  warningItems: Array<(string | number)[]>;
  audit: Awaited<ReturnType<typeof auditIdentityAndSessionMismatches>>;
  evaluations: Awaited<ReturnType<typeof getTrainingSessionEvaluationAdminSnapshot>>;
  billingIssues: Array<{
    orgName: string;
    orgId: string;
    latestBillingAt: number | null;
  }>;
};

function renderDigestHtml(args: DigestArgs) {
  const rows = [
    ...args.urgentItems.map(([label, count]) => `<li><strong>${escapeHtml(String(label))}:</strong> ${count}</li>`),
    ...args.warningItems.map(([label, count]) => `<li><strong>${escapeHtml(String(label))}:</strong> ${count}</li>`),
  ].join("");

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h1>Cream No Sugar admin alerts</h1>
      <p>Generated ${escapeHtml(formatDate(args.generatedAt))}</p>
      <p><a href="${escapeHtml(args.appUrl)}/dashboard/admin">Open admin dashboard</a></p>
      <h2>Counts</h2>
      <ul>${rows}</ul>
      ${renderHtmlSampleSection("Stale started sessions", args.audit.samples.staleStartedSessions, ["sessionKey", "traineeName", "ageHours", "orgId"])}
      ${renderHtmlSampleSection("Missing trainee sign-in links", args.audit.samples.missingIdentityLink, ["name", "email", "orgId"])}
      ${renderHtmlSampleSection("Failed email deliveries", args.audit.samples.failedEmailDeliveries, ["recipient", "sequence", "error", "orgId"])}
      ${renderHtmlSampleSection("Recent failed evaluations", args.evaluations.recentIssues.filter((item) => item.status === "failed").map((item) => ({
        sessionKey: item.sessionKey,
        traineeName: item.traineeName,
        summary: item.summary,
        orgId: item.orgId,
      })), ["sessionKey", "traineeName", "summary", "orgId"])}
      ${renderHtmlSampleSection("Billing mapping issues", args.billingIssues, ["orgName", "orgId", "latestBillingAt"])}
    </div>
  `;
}

function renderDigestText(args: DigestArgs) {
  const lines = [
    "Cream No Sugar admin alerts",
    `Generated ${formatDate(args.generatedAt)}`,
    `Admin dashboard: ${args.appUrl}/dashboard/admin`,
    "",
    "Counts:",
    ...[...args.urgentItems, ...args.warningItems].map(([label, count]) => `- ${label}: ${count}`),
    "",
    ...renderTextSampleSection("Stale started sessions", args.audit.samples.staleStartedSessions, [
      "sessionKey",
      "traineeName",
      "ageHours",
      "orgId",
    ]),
    ...renderTextSampleSection("Missing trainee sign-in links", args.audit.samples.missingIdentityLink, [
      "name",
      "email",
      "orgId",
    ]),
    ...renderTextSampleSection("Failed email deliveries", args.audit.samples.failedEmailDeliveries, [
      "recipient",
      "sequence",
      "error",
      "orgId",
    ]),
    ...renderTextSampleSection(
      "Recent failed evaluations",
      args.evaluations.recentIssues
        .filter((item) => item.status === "failed")
        .map((item) => ({
          sessionKey: item.sessionKey,
          traineeName: item.traineeName,
          summary: item.summary,
          orgId: item.orgId,
        })),
      ["sessionKey", "traineeName", "summary", "orgId"],
    ),
    ...renderTextSampleSection("Billing mapping issues", args.billingIssues, ["orgName", "orgId", "latestBillingAt"]),
  ];

  return lines.join("\n");
}

function renderHtmlSampleSection(title: string, items: Array<Record<string, unknown>>, keys: string[]) {
  if (items.length === 0) {
    return "";
  }

  const rows = items
    .slice(0, 8)
    .map((item) => `<li>${escapeHtml(sampleLine(item, keys))}</li>`)
    .join("");

  return `<h2>${escapeHtml(title)}</h2><ul>${rows}</ul>`;
}

function renderTextSampleSection(title: string, items: Array<Record<string, unknown>>, keys: string[]) {
  if (items.length === 0) {
    return [];
  }

  return ["", `${title}:`, ...items.slice(0, 8).map((item) => `- ${sampleLine(item, keys)}`)];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
