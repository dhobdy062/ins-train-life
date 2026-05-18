import { auth } from "@clerk/nextjs/server";

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
  await searchParams;
  await auth();

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
                <a className="button primary" href="/book-demo">
                  Book a Team Demo
                </a>
                <a className="button secondary" href="/demo">
                  Try a Sample Call
                </a>
              </div>
            </div>
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
