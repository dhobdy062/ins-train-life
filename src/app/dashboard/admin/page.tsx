import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrganizationRevenueDashboard } from "@/lib/convex";
import { isAdminPortalUser, resolvePrimaryEmailAddress } from "@/lib/admin-portal";

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

  const dashboard = await getOrganizationRevenueDashboard({ limit: 250 }).catch(() => null);

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
          </div>
        </section>

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
