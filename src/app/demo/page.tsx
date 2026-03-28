import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PublicDemoConsole from "@/components/PublicDemoConsole";
import { getDemoProspectByUserAndOrg } from "@/lib/convex";

type DemoPageProps = {
  searchParams?: Promise<{ state?: string }>;
};

const demoProspectProfile = {
  name: "Angela Brooks",
  summary: "43-year-old working parent",
  details:
    "Two children and a spouse, with a busy life centered on work, family, and staying organized.",
  description:
    "She already has some life insurance coverage through her employer and sees herself as responsible and practical, but short on free time. She has a basic understanding of life insurance and believes her work coverage provides at least some protection. She is cautious and moderately skeptical about purchasing additional insurance, and she does not commit easily.",
};

export default async function DemoPage(_props?: DemoPageProps) {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fdemo");
  }

  if (!orgId) {
    redirect("/workspace/select-organization?redirect_url=%2Fdemo");
  }

  const demoProspect = await getDemoProspectByUserAndOrg({
    clerkUserId: userId,
    orgId,
  });

  if (!demoProspect) {
    redirect("/workspace/dashboard");
  }

  return (
    <div className="page">
      <div className="shell">
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="tag">Authenticated demo</div>
              <h1>Start your authenticated demo call</h1>
              <p>
                You are signed in under <strong>{demoProspect.organizationName}</strong>. Use this protected demo page
                to try the voice agent before moving into the full workspace.
              </p>
              <div className="hero-actions">
                <Link className="button secondary" href="/workspace/dashboard">
                  Open workspace
                </Link>
                <Link className="button secondary" href="/#pricing">
                  View pricing
                </Link>
              </div>
            </div>

            <div style={{ display: "grid", gap: 24 }}>
              <PublicDemoConsole organizationName={demoProspect.organizationName} />

              <section className="glass panel" aria-label="Prospect profile">
                <div className="tag">Prospect profile</div>
                <h2 style={{ fontSize: "1.5rem", lineHeight: 1.2 }}>{demoProspectProfile.name}</h2>
                <div className="grid">
                  <div className="metric">
                    <span>Profile</span>
                    <strong>{demoProspectProfile.summary}</strong>
                  </div>
                  <div className="metric">
                    <span>Household</span>
                    <strong>{demoProspectProfile.details}</strong>
                  </div>
                </div>
                <p>{demoProspectProfile.description}</p>
              </section>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
