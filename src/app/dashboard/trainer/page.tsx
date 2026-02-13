import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import DemoConsole from "@/components/DemoConsole";
import SequencePlannerCard from "@/components/SequencePlannerCard";
import { getOrgBillingAccess } from "@/lib/convex";

export default async function TrainerDashboardPage() {
  const { userId, orgId } = await auth();
  const access = orgId ? await getOrgBillingAccess({ orgId }).catch(() => null) : null;
  const hasBillingAccess = Boolean(access?.hasAccess);

  return (
    <div className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="badge">Cream No Sugar</span>
            <span>Trainer dashboard</span>
          </div>
          <div className="hero-actions">
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                elements: {
                  rootBox: { display: "flex", alignItems: "center" },
                },
              }}
            />
            <UserButton />
            <Link className="button secondary" href="/">
              Back to home
            </Link>
          </div>
        </nav>

        <main>
          {userId && orgId && hasBillingAccess ? (
            <>
              <section className="glass panel">
                <div className="tag">Control center</div>
                <h3>Configure training, monitor agents, and launch sessions</h3>
                <div className="grid">
                  <div className="metric">
                    <span>Brand mode</span>
                    <strong>Cream No Sugar</strong>
                  </div>
                  <div className="metric">
                    <span>Dashboard role</span>
                    <strong>Trainer</strong>
                  </div>
                  <div className="metric">
                    <span>Voice session path</span>
                    <strong>/api/vapi/session/start</strong>
                  </div>
                  <div className="metric">
                    <span>Email sequence path</span>
                    <strong>/api/email/sequence</strong>
                  </div>
                </div>
              </section>

              <SequencePlannerCard />
              <DemoConsole />
            </>
          ) : userId && orgId ? (
            <div className="glass panel">
              <div className="tag">Subscription required</div>
              <h3>This organization does not have an active subscription yet.</h3>
              <p className="disclaimer">Select a paid plan to unlock team training sessions.</p>
              <Link className="button" href="/#pricing">
                View pricing
              </Link>
            </div>
          ) : (
            <div className="glass panel">
              <div className="tag">Authentication required</div>
              <h3>Sign in and choose an organization to open the trainer dashboard.</h3>
              <p className="disclaimer">Sign-in protects training configuration and organization-scoped analytics.</p>
              <Link className="button" href="/sign-in?redirect_url=/dashboard/trainer">
                Sign in
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
