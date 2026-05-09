import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import TrainerTabs from "@/components/trainer/TrainerTabs";
import { getOrgEntitlement } from "@/lib/convex";
import styles from "./layout.module.css";

export default async function TrainerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();
  const canOpenDashboard = Boolean(userId && orgId);

  const entitlement = canOpenDashboard
    ? await getOrgEntitlement({ orgId: orgId as string }).catch(() => null)
    : null;
  const planLabel =
    entitlement?.mode === "paid" ? "Paid plan" : entitlement?.mode === "blocked" ? "Upgrade required" : "Trial plan";
  const usageLabel = entitlement
    ? `${entitlement.minutesUsed}${entitlement.minutesLimit ? ` / ${entitlement.minutesLimit}` : ""} mins used`
    : "Usage unavailable";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.brandTop}>
            <span className={styles.brandBadge}>Cream No Sugar</span>
            <span className={styles.brandSubtext}>Trainer Workspace</span>
          </div>
          <p className={styles.brandOrg}>{canOpenDashboard ? "Dashboard workspace" : "Sign in to open your dashboard"}</p>
        </div>
        {canOpenDashboard ? (
          <>
            <TrainerTabs />
            <Link className={styles.homeLink} href="/">
              Back to Home
            </Link>
          </>
        ) : (
          <Link className={styles.homeLink} href="/">
            Back to Home
          </Link>
        )}
      </aside>

      <div className={styles.main}>
        <header className={styles.topBar}>
          <div className={styles.pageContext}>Trainer Dashboard</div>
          <div className={styles.topActions}>
            {canOpenDashboard ? (
              <OrganizationSwitcher
                hidePersonal
                appearance={{
                  elements: {
                    rootBox: { display: "flex", alignItems: "center" },
                  },
                }}
              />
            ) : null}
            <div className={styles.planStack}>
              <span className={styles.planLabel}>{planLabel}</span>
              <span className={styles.usageLabel}>{usageLabel}</span>
            </div>
            <UserButton />
          </div>
        </header>

        {canOpenDashboard ? (
          <main className={styles.contentArea}>
            {children}
          </main>
        ) : (
          <main className={styles.contentArea}>
            <div className={styles.authCard}>
              <h3>Sign in and choose a team to open the trainer dashboard.</h3>
              <p>Sign-in protects training configuration and team-scoped analytics.</p>
              <Link className={styles.primaryButton} href="/sign-in?redirect_url=/dashboard/trainer/overview">
                Sign in
              </Link>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
