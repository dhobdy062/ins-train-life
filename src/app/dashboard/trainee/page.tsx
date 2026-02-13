import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TrialConsole from "@/components/TrialConsole";
import { verifyToken } from "@/lib/token";

function getCallNumber() {
  return process.env.TRAINING_CALL_NUMBER || "Not configured";
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
  const hasPhoneNumber = callNumber !== "Not configured";

  return (
    <div className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="badge">Cream No Sugar</span>
            <span>Trainee dashboard</span>
          </div>
          <Link className="button secondary" href="/">
            Back to home
          </Link>
        </nav>

        <main>
          <section className="glass panel">
            <div className="tag">Training profile</div>
            <h3>Welcome back, your trainee dashboard is active</h3>
            <div className="grid">
              <div className="metric">
                <span>Verified email</span>
                <strong>{payload.email}</strong>
              </div>
              <div className="metric">
                <span>Brand mode</span>
                <strong>Cream No Sugar</strong>
              </div>
              <div className="metric">
                <span>Sequence stage</span>
                <strong>trainee_invitation</strong>
              </div>
            </div>
          </section>

          <div className="split">
            <TrialConsole />

            <section className="glass panel">
              <div className="tag">Phone option</div>
              <h3>Prefer calling in?</h3>
              <p className="disclaimer">
                If you do not want the web widget, call the training line and complete your test session by phone.
              </p>
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
                    Number not configured
                  </Link>
                )}
                <Link className="button secondary" href="/#pricing">
                  View paid plans
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
