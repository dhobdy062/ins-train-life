import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import DemoConsole from "@/components/DemoConsole";
import SequencePlannerCard from "@/components/SequencePlannerCard";
import { getOrgEntitlement } from "@/lib/convex";

export default async function TrainerDashboardPage() {
  const { userId, orgId } = await auth();
  const entitlement = orgId ? await getOrgEntitlement({ orgId }).catch(() => null) : null;
  const canOpenDashboard = Boolean(userId && orgId);
  const isPaid = entitlement?.mode === "paid";
  const isTrial = entitlement?.mode === "trial";
  const isBlocked = entitlement?.mode === "blocked";

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
          {canOpenDashboard ? (
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
                  <div className="metric">
                    <span>Access mode</span>
                    <strong>{isPaid ? "Paid" : isBlocked ? "Trial locked" : "Trial"}</strong>
                  </div>
                  <div className="metric">
                    <span>Trial usage</span>
                    <strong>
                      {entitlement?.minutesUsed ?? 0}
                      {entitlement?.minutesLimit ? ` / ${entitlement.minutesLimit} minutes` : " minutes"}
                    </strong>
                  </div>
                  <div className="metric">
                    <span>Trial remaining</span>
                    <strong>{entitlement?.minutesLimit ? entitlement.minutesRemaining : "Unlimited"}</strong>
                  </div>
                </div>
              </section>

              {isTrial ? (
                <section className="glass panel">
                  <div className="tag">Trial active</div>
                  <h3>You are on trial with 15 total talk minutes.</h3>
                  <p className="disclaimer">
                    Calls continue normally once started. New calls are blocked only after your organization reaches 15
                    total minutes.
                  </p>
                </section>
              ) : null}

              {isBlocked ? (
                <section className="glass panel">
                  <div className="tag">Trial limit reached</div>
                  <h3>Your organization has used all available trial talk time.</h3>
                  <p className="disclaimer">Upgrade to continue launching new calls from this dashboard.</p>
                  <div className="hero-actions">
                    <Link className="button" href="/#pricing">
                      Upgrade plan
                    </Link>
                  </div>
                </section>
              ) : null}

              <SequencePlannerCard />
              <DemoConsole
                startDisabled={isBlocked}
                blockedStatusMessage={
                  isBlocked ? "Trial talk-time limit reached. Upgrade to continue starting new calls." : null
                }
              />
            </>
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
