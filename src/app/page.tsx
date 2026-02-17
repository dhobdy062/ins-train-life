import LeadForm from "@/components/LeadForm";
import PricingCards from "@/components/PricingCards";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { normalizeBillingSelection } from "@/lib/billing";

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

type HomePageProps = {
  searchParams: Promise<{ plan?: string; interval?: string }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const selection = normalizeBillingSelection({ planId: params.plan, interval: params.interval });

  return (
    <div className="page">
      <div className="shell">
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="tag">Life insurance sales training</div>
              <h1>Practice the toughest conversations before real money is on the line</h1>
              <p>
                Instead of spending hours roleplaying in 1-1, you can upskill your entire downline at the same time.
              </p>
              <div className="hero-actions">
                <a className="button secondary" href="#demo">
                  Start a sample call
                </a>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button className="button" type="button">
                      Setup trainer account
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <a className="button secondary" href="/dashboard/trainer">
                    Launch authenticated widget
                  </a>
                </SignedIn>
              </div>
              <div className="split">
                <div className="card">
                <h4>The first real objection shouldn&apos;t be with a real prospect</h4>
                <p className="disclaimer">
                  Cream No Sugar. Smooth Delivered Training. No Sugar Added. You don&apos;t get paid to feel ready. You are
                  paid to close. Cream No Sugar helps you get there.
                </p>
              </div>
                <div className="card">
                <h4>Confidence Comes from Repitition</h4>
                <p className="disclaimer">
                  Give every agent a live realistic prospect for training whenever they need it.
                </p>
              </div>
              </div>
            </div>

            <LeadForm />
          </section>

          <section className="glass panel" id="demo">
            <div className="tag">Customize the Difficulty and Objections</div>
            <h3>You decide if they pass or fail</h3>
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
              <h3>Customize the Knowledge Base</h3>
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
              <h3>Every call provides coaching data</h3>
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
            <h3>Choose the plan, then continue directly to secure checkout.</h3>
            <PricingCards selectedPlanId={selection.planId} selectedInterval={selection.interval} />
          </section>
        </main>

        <footer className="footer">
          <span>Cream No Sugar. Built to Build Better Performing Salespeople</span>
          <span>Demo Includes Term Life only</span>
          <a className="footer-link" href="/FAQ_Page.html" target="_blank" rel="noreferrer">
            Frequently Asked Questions
          </a>
        </footer>
      </div>
    </div>
  );
}
