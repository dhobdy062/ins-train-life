import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import DemoConsole from "@/components/DemoConsole";
import { getOrgBillingAccess } from "@/lib/convex";

export default async function DemoPage() {
  const { userId, orgId } = await auth();
  const access = orgId ? await getOrgBillingAccess({ orgId }).catch(() => null) : null;
  const hasBillingAccess = Boolean(access?.hasAccess);

  return (
    <div className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="badge">Cream No Sugar</span>
            <span>Voice Demo</span>
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
            <Link className="button secondary" href="/">
              Back to home
            </Link>
          </div>
        </nav>

        <main>
          {userId && orgId && hasBillingAccess ? (
            <DemoConsole />
          ) : userId && orgId ? (
            <div className="glass panel">
              <div className="tag">Subscription required</div>
              <h3>This organization does not have an active subscription yet.</h3>
              <p className="disclaimer">
                Select a paid plan to unlock team training sessions.
              </p>
              <Link className="button" href="/#pricing">
                View pricing
              </Link>
            </div>
          ) : (
            <div className="glass panel">
              <div className="tag">Authentication required</div>
              <h3>Sign in and choose an organization to launch training.</h3>
              <p className="disclaimer">
                Sign-in protects session access and ensures usage is tracked to the correct team.
              </p>
              <Link className="button" href="/sign-in?redirect_url=/demo">
                Sign in
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
