import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="badge">Cream No Sugar</span>
            <span>Payment confirmed</span>
          </div>
          <Link className="button secondary" href="/">
            Back to home
          </Link>
        </nav>
        <main>
          <div className="glass panel">
            <div className="tag">Success</div>
            <h3>Welcome to Cream No Sugar.</h3>
            <p className="disclaimer">
              Your subscription is active. Next, onboard your team, configure your call assistant, and assign
              difficulty tiers.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/demo">
                Run the 2-minute demo
              </Link>
              <button className="button secondary">Request onboarding call</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
