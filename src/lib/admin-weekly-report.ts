type CountItem = [string, number];

type RevenueSnapshot = {
  generatedAt: number;
  totalOrganizations: number;
  payingOrganizations: number;
  activeTrainerCount: number;
  mrrCents: number;
  arrCents: number;
  organizations: Array<{
    orgId: string;
    orgName: string;
    orgStatus: string;
    activeTrainerCount: number;
    billingStatus: string;
    hasPaidAccess: boolean;
    mrrCents: number;
    arrCents: number;
    latestBillingAt: number | null;
    currentPlan: {
      planId: "starter" | "pro" | "agency";
      interval: "monthly" | "annual" | null;
      stripeStatus: string | null;
      source: "subscription_price" | "checkout_metadata" | "event_fallback";
    } | null;
  }>;
} | null;

type OperationsAudit = {
  generatedAt: number;
  counts: {
    traineesReviewed: number;
    sessionsReviewed: number;
    recentAlertsReviewed: number;
    failedEmailDeliveries: number;
    missingIdentityLink: number;
    missingMembership: number;
    recoverableByEmail: number;
    assignedMissingClerkUser: number;
    assignedIdentityMismatch: number;
    staleAssignedSessions: number;
    staleStartedSessions: number;
  };
  samples: {
    staleAssignedSessions: Array<Record<string, unknown>>;
    staleStartedSessions: Array<Record<string, unknown>>;
    failedEmailDeliveries: Array<Record<string, unknown>>;
    recentAlerts: Array<Record<string, unknown>>;
  };
};

type EvaluationSnapshot = {
  generatedAt: number;
  counts: {
    total: number;
    passed: number;
    warning: number;
    failed: number;
  };
  recentIssues: Array<{
    sessionKey: string;
    orgId: string;
    traineeName: string;
    status: string;
    summary: string;
    evaluatedAt: number;
  }>;
};

type WebhookLagSnapshot = {
  checked: number;
  laggingCount: number;
  maxLagMs: number;
};

export type WeeklyAdminReport = {
  appUrl: string;
  generatedAt: number;
  revenue: RevenueSnapshot;
  audit: OperationsAudit;
  evaluations: EvaluationSnapshot;
  webhookLag: WebhookLagSnapshot;
  billingIssues: Array<{
    orgName: string;
    orgId: string;
    latestBillingAt: number | null;
    billingStatus?: string;
  }>;
};

export function getWeeklyAdminReportSubject(report: WeeklyAdminReport) {
  const urgentCount =
    report.evaluations.counts.failed +
    report.audit.counts.staleStartedSessions +
    report.audit.counts.missingMembership +
    report.webhookLag.laggingCount +
    report.billingIssues.length;

  const revenueLabel = report.revenue ? formatCurrency(report.revenue.mrrCents) : "revenue unavailable";
  return `Cream No Sugar weekly admin report: ${revenueLabel} MRR, ${urgentCount} needs review`;
}

export function renderWeeklyAdminReportHtml(report: WeeklyAdminReport) {
  const revenue = report.revenue;
  const topOrganizations = revenue?.organizations.slice(0, 8) ?? [];
  const operationalCounts = getOperationalCounts(report);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h1>Cream No Sugar weekly admin report</h1>
      <p>Generated ${escapeHtml(formatDate(report.generatedAt))}</p>
      <p><a href="${escapeHtml(report.appUrl)}/dashboard/admin">Open admin dashboard</a></p>

      <h2>Revenue</h2>
      ${
        revenue
          ? `<ul>
              <li><strong>MRR:</strong> ${escapeHtml(formatCurrency(revenue.mrrCents))}</li>
              <li><strong>ARR:</strong> ${escapeHtml(formatCurrency(revenue.arrCents))}</li>
              <li><strong>Paying organizations:</strong> ${revenue.payingOrganizations} / ${revenue.totalOrganizations}</li>
              <li><strong>Active trainers:</strong> ${revenue.activeTrainerCount}</li>
            </ul>`
          : "<p>Revenue snapshot unavailable.</p>"
      }

      <h2>Training and operations</h2>
      <ul>
        ${operationalCounts
          .map(([label, count]) => `<li><strong>${escapeHtml(label)}:</strong> ${count}</li>`)
          .join("")}
      </ul>

      ${renderHtmlTable(
        "Top organizations",
        topOrganizations.map((organization) => ({
          Organization: organization.orgName,
          Plan: formatPlan(organization.currentPlan),
          Status: organization.billingStatus,
          Trainers: organization.activeTrainerCount,
          MRR: formatCurrency(organization.mrrCents),
        })),
      )}
      ${renderHtmlSampleSection("Recent evaluation issues", report.evaluations.recentIssues, [
        "sessionKey",
        "traineeName",
        "status",
        "summary",
      ])}
      ${renderHtmlSampleSection("Stale sessions", [
        ...report.audit.samples.staleStartedSessions,
        ...report.audit.samples.staleAssignedSessions,
      ], ["sessionKey", "traineeName", "ageHours", "orgId"])}
      ${renderHtmlSampleSection("Failed email deliveries", report.audit.samples.failedEmailDeliveries, [
        "recipient",
        "sequence",
        "error",
        "orgId",
      ])}
      ${renderHtmlSampleSection("Billing mapping issues", report.billingIssues, [
        "orgName",
        "orgId",
        "billingStatus",
        "latestBillingAt",
      ])}
    </div>
  `;
}

export function renderWeeklyAdminReportText(report: WeeklyAdminReport) {
  const revenue = report.revenue;
  const topOrganizations = revenue?.organizations.slice(0, 8) ?? [];

  return [
    "Cream No Sugar weekly admin report",
    `Generated ${formatDate(report.generatedAt)}`,
    `Admin dashboard: ${report.appUrl}/dashboard/admin`,
    "",
    "Revenue:",
    revenue
      ? [
          `- MRR: ${formatCurrency(revenue.mrrCents)}`,
          `- ARR: ${formatCurrency(revenue.arrCents)}`,
          `- Paying organizations: ${revenue.payingOrganizations} / ${revenue.totalOrganizations}`,
          `- Active trainers: ${revenue.activeTrainerCount}`,
        ].join("\n")
      : "- Revenue snapshot unavailable",
    "",
    "Training and operations:",
    ...getOperationalCounts(report).map(([label, count]) => `- ${label}: ${count}`),
    "",
    "Top organizations:",
    ...(topOrganizations.length > 0
      ? topOrganizations.map(
          (organization) =>
            `- ${organization.orgName}: ${formatPlan(organization.currentPlan)} | ${organization.billingStatus} | ${organization.activeTrainerCount} trainers | ${formatCurrency(organization.mrrCents)} MRR`,
        )
      : ["- No organizations available"]),
    ...renderTextSampleSection("Recent evaluation issues", report.evaluations.recentIssues, [
      "sessionKey",
      "traineeName",
      "status",
      "summary",
    ]),
    ...renderTextSampleSection(
      "Stale sessions",
      [...report.audit.samples.staleStartedSessions, ...report.audit.samples.staleAssignedSessions],
      ["sessionKey", "traineeName", "ageHours", "orgId"],
    ),
    ...renderTextSampleSection("Failed email deliveries", report.audit.samples.failedEmailDeliveries, [
      "recipient",
      "sequence",
      "error",
      "orgId",
    ]),
    ...renderTextSampleSection("Billing mapping issues", report.billingIssues, [
      "orgName",
      "orgId",
      "billingStatus",
      "latestBillingAt",
    ]),
  ].join("\n");
}

export function getBillingMappingIssues(revenue: RevenueSnapshot) {
  return (
    revenue?.organizations.filter((organization) => {
      const hasBillingEvent = Boolean(organization.latestBillingAt);
      const hasPlan = Boolean(organization.currentPlan);
      return (
        hasBillingEvent &&
        !organization.hasPaidAccess &&
        !hasPlan &&
        organization.billingStatus !== "subscription_inactive"
      );
    }) ?? []
  );
}

function getOperationalCounts(report: WeeklyAdminReport): CountItem[] {
  return [
    ["Total evaluated sessions", report.evaluations.counts.total],
    ["Healthy evaluations", report.evaluations.counts.passed],
    ["Evaluations needing review", report.evaluations.counts.warning],
    ["Broken training data flow", report.evaluations.counts.failed],
    ["Trainees reviewed", report.audit.counts.traineesReviewed],
    ["Sessions reviewed", report.audit.counts.sessionsReviewed],
    ["Stale assigned sessions", report.audit.counts.staleAssignedSessions],
    ["Stale started sessions", report.audit.counts.staleStartedSessions],
    ["Missing trainee sign-in links", report.audit.counts.missingIdentityLink],
    ["Missing org memberships", report.audit.counts.missingMembership],
    ["Failed email deliveries", report.audit.counts.failedEmailDeliveries],
    ["Webhook lagging events", report.webhookLag.laggingCount],
  ];
}

function renderHtmlTable(title: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) {
    return "";
  }

  const columns = Object.keys(rows[0]);
  return `
    <h2>${escapeHtml(title)}</h2>
    <table style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>${columns
          .map((column) => `<th style="border-bottom: 1px solid #d1d5db; text-align: left; padding: 8px;">${escapeHtml(column)}</th>`)
          .join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${columns
                .map((column) => `<td style="border-bottom: 1px solid #f3f4f6; padding: 8px;">${escapeHtml(String(row[column] ?? ""))}</td>`)
                .join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
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

function sampleLine(item: Record<string, unknown>, keys: string[]) {
  return keys
    .map((key) => item[key])
    .filter((value) => value !== null && value !== undefined && String(value).trim().length > 0)
    .map((value) => (typeof value === "number" && value > 1_000_000_000_000 ? formatDate(value) : String(value)))
    .join(" | ");
}

function formatPlan(plan: NonNullable<NonNullable<RevenueSnapshot>["organizations"][number]["currentPlan"]> | null) {
  if (!plan) {
    return "No active plan";
  }

  const interval = plan.interval ? ` (${plan.interval})` : "";
  const status = plan.stripeStatus ? ` - ${plan.stripeStatus}` : "";
  return `${plan.planId}${interval}${status}`;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp).toLocaleString() : "unknown time";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
