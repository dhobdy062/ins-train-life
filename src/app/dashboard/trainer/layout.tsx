import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import TrainerTabs from "@/components/trainer/TrainerTabs";

export default async function TrainerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();
  const canOpenDashboard = Boolean(userId && orgId);

  return (
    <div className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="badge">Cream No Sugar</span>
            <span>Trainer Dashboard</span>
          </div>
          <div className="hero-actions">
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
            <UserButton />
            <Link className="button secondary" href="/">
              Back to home
            </Link>
          </div>
        </nav>

        {canOpenDashboard ? (
          <main>
            <TrainerTabs />
            {children}
          </main>
        ) : (
          <main>
            <div className="glass panel">
              <div className="tag">Authentication required</div>
              <h3>Sign in and choose an organization to open the trainer dashboard.</h3>
              <p className="disclaimer">Sign-in protects training configuration and organization-scoped analytics.</p>
              <Link className="button" href="/sign-in?redirect_url=/dashboard/trainer/overview">
                Sign in
              </Link>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
