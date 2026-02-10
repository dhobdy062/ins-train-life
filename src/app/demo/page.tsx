import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import DemoConsole from "@/components/DemoConsole";

export default async function DemoPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkEnabled = Boolean(publishableKey && /^pk_(test|live)_/.test(publishableKey));
  const { userId, orgId } = clerkEnabled ? await auth() : { userId: null, orgId: null };

  return (
    <div className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="badge">InsureTrain AI</span>
            <span>Voice Demo</span>
          </div>
          {clerkEnabled ? (
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
          ) : (
            <Link className="button secondary" href="/">
              Back to home
            </Link>
          )}
        </nav>

        <main>
          {!clerkEnabled ? (
            <div className="glass panel">
              <div className="tag">Clerk config required</div>
              <h3>Set Clerk keys to enable authenticated VAPI sessions.</h3>
              <p className="disclaimer">
                Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel for development, preview,
                and production environments.
              </p>
            </div>
          ) : userId && orgId ? (
            <DemoConsole />
          ) : (
            <div className="glass panel">
              <div className="tag">Authentication required</div>
              <h3>Sign in and choose an organization to launch the VAPI widget.</h3>
              <p className="disclaimer">
                Web training sessions are now secured with Clerk auth + org context so usage, metrics, and billing
                are tracked correctly.
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
