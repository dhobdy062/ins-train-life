import { cookies } from "next/headers";
import PublicDemoConsole, { type PublicDemoState } from "@/components/PublicDemoConsole";

type DemoPageProps = {
  searchParams: Promise<{ state?: string }>;
};

function normalizeState(value?: string): PublicDemoState {
  if (value === "verified") {
    return "verified";
  }

  if (value === "invalid-link") {
    return "invalid-link";
  }

  return "default";
}

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const hasValidDemoAccess = Boolean(cookieStore.get("demo_trial_identity")?.value);
  const state = normalizeState(params.state);

  return (
    <div className="page">
      <div className="shell">
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="tag">Public demo</div>
              <h1>Try a live life-insurance demo call before you commit to the full workspace</h1>
              <p>
                This page is built for a quick public trial. Verify your email, start a guided demo call, and move to
                a paid plan only when you are ready for full team training.
              </p>
              <div className="hero-actions">
                <a className="button secondary" href="/">
                  Back to landing page
                </a>
                <a className="button secondary" href="/#pricing">
                  View pricing
                </a>
              </div>
            </div>

            <PublicDemoConsole state={state} hasValidDemoAccess={hasValidDemoAccess} />
          </section>
        </main>
      </div>
    </div>
  );
}
