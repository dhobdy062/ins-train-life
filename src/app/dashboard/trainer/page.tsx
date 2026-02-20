import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import DemoConsole from "@/components/DemoConsole";
import SequencePlannerCard from "@/components/SequencePlannerCard";
import DashboardTabs, { DashboardTabPanel } from "@/components/dashboard/DashboardTabs";
import { getOrgEntitlement } from "@/lib/convex";

export default async function TrainerDashboardPage() {
  const { userId, orgId } = await auth();
  const entitlement = orgId ? await getOrgEntitlement({ orgId }).catch(() => null) : null;
  const canOpenDashboard = Boolean(userId && orgId);
  const isPaid = entitlement?.mode === "paid";
  const isTrial = entitlement?.mode === "trial";
  const isBlocked = entitlement?.mode === "blocked";
  const minutesUsed = entitlement?.minutesUsed ?? 0;
  const minutesLimit = entitlement?.minutesLimit;
  const minutesRemaining = entitlement?.minutesRemaining;
  const accessLabel = isPaid ? "Paid plan" : isBlocked ? "Upgrade needed" : "Trial";

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
            <Link className="button secondary" href="/dashboard/trainer">
              Home
            </Link>
          </div>
        </nav>

        <main>
          {canOpenDashboard ? (
            <>
              <DashboardTabs defaultTab="home">
                <DashboardTabPanel id="home" label="Home">
                  <section className="glass panel">
                    <div className="tag">Control center</div>
                    <h3>Lead your team&apos;s daily training plan</h3>
                    <div className="grid">
                      <div className="metric">
                        <span>Brand</span>
                        <strong>Cream No Sugar</strong>
                      </div>
                      <div className="metric">
                        <span>Role</span>
                        <strong>Trainer</strong>
                      </div>
                      <div className="metric">
                        <span>Access</span>
                        <strong>{accessLabel}</strong>
                      </div>
                      <div className="metric">
                        <span>Talk time used</span>
                        <strong>
                          {minutesUsed}
                          {minutesLimit ? ` / ${minutesLimit} minutes` : " minutes"}
                        </strong>
                      </div>
                      <div className="metric">
                        <span>Talk time remaining</span>
                        <strong>{minutesLimit ? minutesRemaining : "Unlimited"}</strong>
                      </div>
                    </div>
                  </section>

                  {isTrial ? (
                    <section className="glass panel">
                      <div className="tag">Trial active</div>
                      <h3>Your trial is active with 15 total talk minutes.</h3>
                      <p className="disclaimer">
                        In-progress calls continue normally. New calls pause after your team reaches the limit.
                      </p>
                    </section>
                  ) : null}

                  {isBlocked ? (
                    <section className="glass panel">
                      <div className="tag">Talk time limit reached</div>
                      <h3>Your team has used all available trial talk time.</h3>
                      <p className="disclaimer">Upgrade to continue launching new practice calls.</p>
                      <div className="hero-actions">
                        <Link className="button" href="/#pricing">
                          Upgrade plan
                        </Link>
                      </div>
                    </section>
                  ) : null}
                </DashboardTabPanel>

                <DashboardTabPanel id="practice" label="Practice">
                  <DemoConsole
                    startDisabled={isBlocked}
                    blockedStatusMessage={
                      isBlocked ? "Trial talk-time limit reached. Upgrade to continue starting new calls." : null
                    }
                  />
                </DashboardTabPanel>

                <DashboardTabPanel id="team" label="Team">
                  <SequencePlannerCard />
                </DashboardTabPanel>
              </DashboardTabs>
            </>
          ) : (
            <div className="glass panel">
              {userId ? (
                <>
                  <div className="tag">Organization required</div>
                  <h3>One last step: choose your organization workspace.</h3>
                  <p className="disclaimer">Training sessions and billing access are connected to that workspace.</p>
                  <Link className="button" href="/workspace/select-organization?redirect_url=%2Fdashboard%2Ftrainer">
                    Choose organization
                  </Link>
                </>
              ) : (
                <>
                  <div className="tag">Authentication required</div>
                  <h3>Sign in and choose an organization to open the trainer dashboard.</h3>
                  <p className="disclaimer">Sign-in keeps your organization&apos;s coaching progress secure.</p>
                  <Link className="button" href="/sign-in?redirect_url=/dashboard/trainer">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
