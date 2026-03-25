import LeadForm from "@/components/LeadForm";
import PricingCards from "@/components/PricingCards";
import { SignedIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { normalizeBillingSelection } from "@/lib/billing";

const objectionNodes = [
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
];

const scoringCategories = [
  "Objection handling",
  "Tone and pacing",
  "Close effectiveness",
  "Time to appointment",
];

type HomePageProps = {
  searchParams: Promise<{ plan?: string; interval?: string }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const selection = normalizeBillingSelection({ planId: params.plan, interval: params.interval });
  const { userId } = await auth();

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
                <SignedIn>
                  <a className="button secondary" href="/workspace/dashboard">
                    Open workspace
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

          <section className="split">
            <div className="glass panel">
              <div className="tag">Difficulty levels</div>
              <h3>You decide if they pass or fail</h3>
              <div className="grid">
                {objectionNodes.map((node) => (
                  <div key={node} className="metric">
                    <span>Difficulty node</span>
                    <strong>{node}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass panel">
              <div className="tag">Scoring categories</div>
              <h3>Every call provides coaching data</h3>
              <div className="grid">
                {scoringCategories.map((category) => (
                  <div key={category} className="metric">
                    <span>Insight</span>
                    <strong>{category}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="glass panel" id="pricing">
            <div className="tag">Pricing</div>
            <h3>Pick your plan and we&apos;ll guide you through secure checkout.</h3>
            <p className="disclaimer">
              {userId
                ? "Choose monthly or annual billing to continue."
                : "Choose monthly or annual billing, then create your account to continue."}
            </p>
            <PricingCards
              selectedPlanId={selection.planId}
              selectedInterval={selection.interval}
              signedIn={Boolean(userId)}
            />
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
