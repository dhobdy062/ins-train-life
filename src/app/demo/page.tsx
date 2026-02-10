import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import DemoConsole from "@/components/DemoConsole";

export default async function DemoPage() {
  const { userId, orgId } = await auth();

  return (
    <div className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="badge">InsureTrain AI</span>
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
          {userId && orgId ? (
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
