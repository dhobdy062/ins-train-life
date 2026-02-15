import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TrialConsole from "@/components/TrialConsole";
import DashboardTabs, { DashboardTabPanel } from "@/components/dashboard/DashboardTabs";
import { verifyToken } from "@/lib/token";

function getCallNumber() {
  return process.env.TRAINING_CALL_NUMBER || "Call line pending";
}

export default async function TraineeDashboardPage() {
  const secret = process.env.VERIFY_HMAC_SECRET;
  if (!secret) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const trialIdentityToken = cookieStore.get("demo_trial_identity")?.value;
  if (!trialIdentityToken) {
    redirect("/");
  }

  const payload = (() => {
    try {
      return verifyToken(trialIdentityToken, secret);
    } catch {
      return null;
    }
  })();
  if (!payload?.email) {
    redirect("/");
  }

  const callNumber = getCallNumber();
  const hasPhoneNumber = callNumber !== "Call line pending";

  return (
    <div className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="badge">Cream No Sugar</span>
            <span>Trainee dashboard</span>
          </div>
          <Link className="button secondary" href="/dashboard/trainee">
            Home
          </Link>
        </nav>

        <main>
          <DashboardTabs defaultTab="home">
            <DashboardTabPanel id="home" label="Home">
              <section className="glass panel">
                <div className="tag">Training profile</div>
                <h3>Welcome back, your practice workspace is ready</h3>
                <div className="grid">
                  <div className="metric">
                    <span>Verified email</span>
                    <strong>{payload.email}</strong>
                  </div>
                  <div className="metric">
                    <span>Program</span>
                    <strong>Cream No Sugar</strong>
                  </div>
                  <div className="metric">
                    <span>Status</span>
                    <strong>Active</strong>
                  </div>
                </div>
              </section>
            </DashboardTabPanel>

            <DashboardTabPanel id="practice" label="Practice">
              <TrialConsole />
            </DashboardTabPanel>

            <DashboardTabPanel id="call-options" label="Call Options">
              <section className="glass panel">
                <div className="tag">Call options</div>
                <h3>Choose your preferred training format</h3>
                <p className="disclaimer">Use web calling or call the training line directly from your phone.</p>
                <div className="metric">
                  <span>Training call number</span>
                  <strong>{callNumber}</strong>
                </div>
                <div className="hero-actions">
                  {hasPhoneNumber ? (
                    <a className="button" href={`tel:${callNumber}`}>
                      Call now
                    </a>
                  ) : (
                    <Link className="button secondary" href="/#pricing">
                      Call line unavailable
                    </Link>
                  )}
                  <Link className="button secondary" href="/#pricing">
                    View paid plans
                  </Link>
                </div>
              </section>
            </DashboardTabPanel>
          </DashboardTabs>
        </main>
      </div>
    </div>
  );
}
