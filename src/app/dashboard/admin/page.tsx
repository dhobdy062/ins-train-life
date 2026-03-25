import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  auditIdentityAndSessionMismatches,
  getOrganizationRevenueDashboard,
  getTrainingSessionEvaluationAdminSnapshot,
  rerunTrainingSessionEvaluation,
  sweepStaleSessions,
} from "@/lib/convex";
import { isAdminPortalUser, resolvePrimaryEmailAddress } from "@/lib/admin-portal";
import { getTrainingSessionEvaluationStatusLabel } from "@/lib/training-session-evaluation";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(value: number | null) {
  if (!value) {
    return "No billing events";
  }
  return new Date(value).toLocaleString();
}

function formatPlan(plan: {
  planId: "starter" | "pro" | "agency";
  interval: "monthly" | "annual" | null;
  stripeStatus: string | null;
} | null) {
  if (!plan) {
    return "No active plan";
  }
  const interval = plan.interval ? ` (${plan.interval})` : "";
  const status = plan.stripeStatus ? ` - ${plan.stripeStatus}` : "";
  return `${plan.planId}${interval}${status}`;
}

async function requireAdminPortalAccess() {
  const user = await currentUser().catch(() => null);
  const primaryEmail = resolvePrimaryEmailAddress(user);

  if (!isAdminPortalUser(primaryEmail)) {
    redirect("/dashboard/admin");
  }
}

export default async function AdminRevenueDashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fdashboard%2Fadmin");
  }

  const user = await currentUser().catch(() => null);
  const primaryEmail = resolvePrimaryEmailAddress(user);
  const isAdmin = isAdminPortalUser(primaryEmail);

  if (!isAdmin) {
    return (
      <div className="page">
        <div className="shell">
          <section className="glass panel">
            <div className="tag">Admin Portal</div>
            <h3>Access restricted</h3>
            <p className="disclaimer">
              This dashboard is limited to allowlisted admin emails. Set <code>ADMIN_PORTAL_EMAILS</code> (or{" "}
              <code>ADMIN_EMAILS</code>) to grant access.
            </p>
            <div className="hero-actions">
              <Link className="button secondary" href="/workspace/dashboard">
                Back to workspace
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  async function runSessionIntegritySweep() {
    "use server";

    await requireAdminPortalAccess();

    await sweepStaleSessions({
      staleAssignedAfterHours: 24,
      staleStartedAfterHours: 2,
    }).catch(() => null);

    redirect("/dashboard/admin");
  }

  async function rerunSessionEvaluationAction(formData: FormData) {
    "use server";

    await requireAdminPortalAccess();

    const sessionKey = String(formData.get("sessionKey") ?? "").trim();
    const orgId = String(formData.get("orgId") ?? "").trim();
    const trainerId = String(formData.get("trainerId") ?? "").trim();
    if (!sessionKey || !orgId || !trainerId) {
      redirect("/dashboard/admin");
    }

    await rerunTrainingSessionEvaluation({
      sessionKey,
      orgId,
      trainerId,
    }).catch(() => null);

    redirect("/dashboard/admin");
  }

  const [dashboard, audit, evaluationSnapshot] = await Promise.all([
    getOrganizationRevenueDashboard({ limit: 250 }).catch(() => null),
    auditIdentityAndSessionMismatches({
      staleAssignedAfterHours: 24,
      staleStartedAfterHours: 2,
      sampleLimit: 12,
    }).catch(() => null),
    getTrainingSessionEvaluationAdminSnapshot({ limit: 12 }).catch(() => null),
  ]);

  return (
    <div className="page">
      <div className="shell">
        <section className="glass panel">
          <div className="tag">Admin Revenue Portal</div>
          <h3>Organization revenue and trainer footprint</h3>
          <p className="disclaimer">
            Snapshot generated {dashboard ? new Date(dashboard.generatedAt).toLocaleString() : "unavailable"}.
            Revenue uses current detected plan pricing (base plan only).
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href="/workspace/dashboard">
              Back to workspace
            </Link>
            <form action={runSessionIntegritySweep}>
              <button className="button secondary" type="submit">
                Sweep stale sessions
              </button>
            </form>
          </div>
        </section>

        {audit ? (
          <>
            <section className="glass panel">
              <div className="tag">Operations</div>
              <h3>Identity and session integrity</h3>
              <p className="disclaimer">
                Audit generated {new Date(audit.generatedAt).toLocaleString()}. These counts surface auth drift,
                stale sessions, failed delivery attempts, and recent alerts that require admin attention.
              </p>
              <div className="grid">
                <div className="metric">
                  <span>Missing trainee sign-in link</span>
                  <strong>{audit.counts.missingIdentityLink}</strong>
                </div>
                <div className="metric">
                  <span>Membership mismatches</span>
                  <strong>{audit.counts.missingMembership}</strong>
                </div>
                <div className="metric">
                  <span>Stale assigned sessions</span>
                  <strong>{audit.counts.staleAssignedSessions}</strong>
                </div>
                <div className="metric">
                  <span>Stale started sessions</span>
                  <strong>{audit.counts.staleStartedSessions}</strong>
                </div>
                <div className="metric">
                  <span>Recoverable by email repair</span>
                  <strong>{audit.counts.recoverableByEmail}</strong>
                </div>
                <div className="metric">
                  <span>Failed email deliveries</span>
                  <strong>{audit.counts.failedEmailDeliveries}</strong>
                </div>
                <div className="metric">
                  <span>Recent alerts reviewed</span>
                  <strong>{audit.counts.recentAlertsReviewed}</strong>
                </div>
              </div>
            </section>

            <section className="glass panel">
              <div className="tag">Issue Queue</div>
              <h3>Identity and session samples</h3>
              <div style={{ display: "grid", gap: 16 }}>
                {audit.samples.missingIdentityLink.length > 0 ? (
                  <article className="metric" style={{ alignItems: "stretch", textAlign: "left" }}>
                    <span>Missing trainee sign-in link</span>
                    {audit.samples.missingIdentityLink.map((issue, index) => (
                      <div key={`missing-link-${index}`} className="disclaimer">
                        {String(issue["name"] ?? "Unknown trainee")} • {String(issue["email"] ?? "-")} •{" "}
                        {String(issue["orgId"] ?? "-")}
                      </div>
                    ))}
                  </article>
                ) : null}
                {audit.samples.missingMembership.length > 0 ? (
                  <article className="metric" style={{ alignItems: "stretch", textAlign: "left" }}>
                    <span>Missing org membership</span>
                    {audit.samples.missingMembership.map((issue, index) => (
                      <div key={`missing-membership-${index}`} className="disclaimer">
                        {String(issue["name"] ?? "Unknown trainee")} • {String(issue["email"] ?? "-")} • user{" "}
                        {String(issue["clerkUserId"] ?? "-")}
                      </div>
                    ))}
                  </article>
                ) : null}
                {audit.samples.staleAssignedSessions.length > 0 ? (
                  <article className="metric" style={{ alignItems: "stretch", textAlign: "left" }}>
                    <span>Stale assigned sessions</span>
                    {audit.samples.staleAssignedSessions.map((issue, index) => (
                      <div key={`stale-assigned-${index}`} className="disclaimer">
                        {String(issue["sessionKey"] ?? "-")} • {String(issue["traineeName"] ?? "Unknown trainee")} •{" "}
                        {String(issue["ageHours"] ?? "-")}h old
                      </div>
                    ))}
                  </article>
                ) : null}
                {audit.samples.staleStartedSessions.length > 0 ? (
                  <article className="metric" style={{ alignItems: "stretch", textAlign: "left" }}>
                    <span>Stale started sessions</span>
                    {audit.samples.staleStartedSessions.map((issue, index) => (
                      <div key={`stale-started-${index}`} className="disclaimer">
                        {String(issue["sessionKey"] ?? "-")} • {String(issue["traineeName"] ?? "Unknown trainee")} •{" "}
                        {String(issue["ageHours"] ?? "-")}h old
                      </div>
                    ))}
                  </article>
                ) : null}
                {audit.samples.failedEmailDeliveries.length > 0 ? (
                  <article className="metric" style={{ alignItems: "stretch", textAlign: "left" }}>
                    <span>Failed email deliveries</span>
                    {audit.samples.failedEmailDeliveries.map((issue, index) => (
                      <div key={`failed-email-${index}`} className="disclaimer">
                        {String(issue["recipient"] ?? "Unknown recipient")} • {String(issue["sequence"] ?? "email")} •{" "}
                        {String(issue["error"] ?? "Delivery failed")}
                      </div>
                    ))}
                  </article>
                ) : null}
                {audit.samples.recentAlerts.length === 0 &&
                audit.samples.missingIdentityLink.length === 0 &&
                audit.samples.missingMembership.length === 0 &&
                audit.samples.staleAssignedSessions.length === 0 &&
                audit.samples.staleStartedSessions.length === 0 &&
                audit.samples.failedEmailDeliveries.length === 0 ? (
                  <p className="disclaimer">No sampled identity or stale-session issues right now.</p>
                ) : null}
              </div>
            </section>

            <section className="glass panel">
              <div className="tag">Recent Alerts</div>
              <h3>Operational alert feed</h3>
              {audit.samples.recentAlerts.length === 0 ? (
                <p className="disclaimer">No recent alerts in the current audit window.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {audit.samples.recentAlerts.map((alert, index) => (
                    <article key={`alert-${index}`} className="metric" style={{ alignItems: "stretch", textAlign: "left" }}>
                      <span>
                        {String(alert["severity"] ?? "warning").toUpperCase()} • {String(alert["source"] ?? "unknown")}
                      </span>
                      <strong>{String(alert["message"] ?? "Unknown alert")}</strong>
                      <span className="disclaimer">{formatDate(Number(alert["createdAt"] ?? 0) || null)}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {evaluationSnapshot ? (
              <>
                <section className="glass panel">
                  <div className="tag">Training Data Flow</div>
                  <h3>Session evaluation health</h3>
                  <p className="disclaimer">
                    Snapshot generated {new Date(evaluationSnapshot.generatedAt).toLocaleString()}. This tracks whether
                    completed training sessions persisted the data the trainee and trainer dashboards depend on.
                  </p>
                  <div className="grid">
                    <div className="metric">
                      <span>Total evaluated sessions</span>
                      <strong>{evaluationSnapshot.counts.total}</strong>
                    </div>
                    <div className="metric">
                      <span>Healthy</span>
                      <strong>{evaluationSnapshot.counts.passed}</strong>
                    </div>
                    <div className="metric">
                      <span>Needs review</span>
                      <strong>{evaluationSnapshot.counts.warning}</strong>
                    </div>
                    <div className="metric">
                      <span>Broken data flow</span>
                      <strong>{evaluationSnapshot.counts.failed}</strong>
                    </div>
                  </div>
                </section>

                <section className="glass panel">
                  <div className="tag">Evaluation Queue</div>
                  <h3>Recent non-passing sessions</h3>
                  {evaluationSnapshot.recentIssues.length === 0 ? (
                    <p className="disclaimer">No warning or failed session evaluations right now.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {evaluationSnapshot.recentIssues.map((evaluation) => (
                        <article
                          key={evaluation.evaluationId}
                          className="metric"
                          style={{ alignItems: "stretch", textAlign: "left", gap: 8 }}
                        >
                          <span>
                            {getTrainingSessionEvaluationStatusLabel(evaluation.status)} • {evaluation.orgId}
                          </span>
                          <strong>{evaluation.sessionKey}</strong>
                          <span className="disclaimer">
                            Trainer {evaluation.trainerId} • {evaluation.traineeName} • session status{" "}
                            {evaluation.sessionStatus ?? "missing"} • evaluated {formatDate(evaluation.evaluatedAt)}
                          </span>
                          <span className="disclaimer">{evaluation.summary}</span>
                          <div style={{ display: "grid", gap: 4 }}>
                            {evaluation.issues.map((issue, index) => (
                              <span key={`${evaluation.evaluationId}-issue-${index}`} className="disclaimer">
                                {issue.severity.toUpperCase()} • {issue.message}
                              </span>
                            ))}
                          </div>
                          <div className="hero-actions">
                            <form action={rerunSessionEvaluationAction}>
                              <input name="sessionKey" type="hidden" value={evaluation.sessionKey} />
                              <input name="orgId" type="hidden" value={evaluation.orgId} />
                              <input name="trainerId" type="hidden" value={evaluation.trainerId} />
                              <button className="button secondary" type="submit">
                                Re-run evaluation
                              </button>
                            </form>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <section className="glass panel">
                <div className="tag">Training Data Flow</div>
                <h3>Session evaluation audit unavailable</h3>
                <p className="disclaimer">The training session evaluation snapshot could not be loaded right now.</p>
              </section>
            )}
          </>
        ) : (
          <section className="glass panel">
            <div className="tag">Operations</div>
            <h3>Operational audit unavailable</h3>
            <p className="disclaimer">The identity/session audit could not be loaded right now.</p>
          </section>
        )}

        {dashboard ? (
          <>
            <section className="glass panel">
              <div className="tag">Totals</div>
              <h3>Portfolio overview</h3>
              <div className="grid">
                <div className="metric">
                  <span>Organizations (paying / total)</span>
                  <strong>
                    {dashboard.payingOrganizations} / {dashboard.totalOrganizations}
                  </strong>
                </div>
                <div className="metric">
                  <span>Active trainers</span>
                  <strong>{dashboard.activeTrainerCount}</strong>
                </div>
                <div className="metric">
                  <span>Total MRR</span>
                  <strong>{formatCurrency(dashboard.mrrCents)}</strong>
                </div>
                <div className="metric">
                  <span>Total ARR</span>
                  <strong>{formatCurrency(dashboard.arrCents)}</strong>
                </div>
              </div>
            </section>

            <section className="glass panel">
              <div className="tag">Organizations</div>
              <h3>Revenue by organization</h3>
              <div className="table-wrap" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px" }}>Organization</th>
                      <th style={{ textAlign: "left", padding: "10px" }}>Status</th>
                      <th style={{ textAlign: "left", padding: "10px" }}>Active trainers</th>
                      <th style={{ textAlign: "left", padding: "10px" }}>Current plan</th>
                      <th style={{ textAlign: "left", padding: "10px" }}>MRR</th>
                      <th style={{ textAlign: "left", padding: "10px" }}>ARR</th>
                      <th style={{ textAlign: "left", padding: "10px" }}>Last billing event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.organizations.map((organization) => (
                      <tr key={organization.orgId}>
                        <td style={{ padding: "10px" }}>
                          <div>{organization.orgName}</div>
                          <div className="disclaimer">{organization.orgId}</div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span
                            className={`status-pill ${organization.hasPaidAccess ? "tone-success" : "tone-neutral"}`}
                          >
                            {organization.orgStatus}
                          </span>
                          <div className="disclaimer">{organization.billingStatus}</div>
                        </td>
                        <td style={{ padding: "10px" }}>{organization.activeTrainerCount}</td>
                        <td style={{ padding: "10px" }}>{formatPlan(organization.currentPlan)}</td>
                        <td style={{ padding: "10px" }}>{formatCurrency(organization.mrrCents)}</td>
                        <td style={{ padding: "10px" }}>{formatCurrency(organization.arrCents)}</td>
                        <td style={{ padding: "10px" }}>{formatDate(organization.latestBillingAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="glass panel">
            <div className="tag">Data status</div>
            <h3>Revenue snapshot unavailable</h3>
            <p className="disclaimer">
              The admin dashboard could not load billing aggregates right now. Retry in a minute.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
