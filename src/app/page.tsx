import LeadForm from "@/components/LeadForm";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const objectionNodes = [
  "D1 Busy schedule",
  "D2 Does not remember lead",
  "D3 Needs spouse",
  "D4 Already covered",
  "D5 High interest, high skepticism",
];

const trainingTracks = [
  "Term Life",
  "Whole Life",
  "Universal Life",
  "Indexed Universal Life (IUL)",
];

export default function Home() {
  return (
    <div className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="badge">InsureTrain AI</span>
            <span>Simulated Prospect Lab</span>
          </div>
          <div className="hero-actions">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="button secondary" type="button">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="button" type="button">
                  Sign up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <a className="button secondary" href="/demo">
                Open workspace
              </a>
              <UserButton />
            </SignedIn>
          </div>
        </nav>

        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="tag">Life insurance sales training</div>
              <h1>Practice the hardest part of the call before you pick up the phone.</h1>
              <p>
                A two-minute simulated prospect that pushes real objections, adapts difficulty in real time, and
                only concedes when your agent earns the appointment.
              </p>
              <div className="hero-actions">
                <a className="button" href="#demo">
                  Start the 2-minute call
                </a>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button className="button secondary" type="button">
                      Create trainer account
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <a className="button secondary" href="/demo">
                    Launch authenticated widget
                  </a>
                </SignedIn>
              </div>
              <div className="split">
                <div className="card">
                  <h4>Purpose-built for life insurance teams</h4>
                  <p className="disclaimer">
                    Teach agents to reframe, de-escalate, and secure the calendar invite without sounding scripted.
                  </p>
                </div>
                <div className="card">
                  <h4>Vapi-ready voice engine</h4>
                  <p className="disclaimer">
                    Plug into Vapi to run browser-based voice sessions with automatic scoring and coaching output.
                  </p>
                </div>
              </div>
            </div>

            <LeadForm />
          </section>

          <section className="glass panel" id="demo">
            <div className="tag">What the prospect does</div>
            <h3>Objection layers that force the rep to earn the sit.</h3>
            <div className="grid">
              {objectionNodes.map((node) => (
                <div key={node} className="metric">
                  <span>Difficulty node</span>
                  <strong>{node}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="split">
            <div className="glass panel">
              <div className="tag">Training coverage</div>
              <h3>Full life insurance portfolio support</h3>
              <div className="grid">
                {trainingTracks.map((track) => (
                  <div key={track} className="metric">
                    <span>Track</span>
                    <strong>{track}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass panel">
              <div className="tag">Scoring output</div>
              <h3>Turn every demo into coaching data</h3>
              <div className="grid">
                <div className="metric">
                  <span>Insight</span>
                  <strong>Objection handling</strong>
                </div>
                <div className="metric">
                  <span>Insight</span>
                  <strong>Tone and pacing</strong>
                </div>
                <div className="metric">
                  <span>Insight</span>
                  <strong>Close effectiveness</strong>
                </div>
                <div className="metric">
                  <span>Insight</span>
                  <strong>Time to appointment</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="glass panel" id="pricing">
            <div className="tag">Pricing</div>
            <h3>Scale training per agent, per team, or per call.</h3>
            <div className="split">
              <div className="card">
                <h4>Team subscription</h4>
                <p className="disclaimer">
                  Monthly per-agent access to full call library, difficulty tiers, and scoring analytics.
                </p>
              </div>
              <div className="card">
                <h4>Enterprise licensing</h4>
                <p className="disclaimer">
                  White-label the simulator for FMOs, IMOs, onboarding, or carrier certification pipelines.
                </p>
              </div>
              <div className="card">
                <h4>Pay-per-simulated-call</h4>
                <p className="disclaimer">
                  Give new reps a low-commitment path to practice and prove readiness.
                </p>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <span>InsureTrain AI. Built for life insurance sales coaches.</span>
          <span>Demo flow is Term Life by default. Whole Life, Universal Life, and IUL are included.</span>
        </footer>
      </div>
    </div>
  );
}
