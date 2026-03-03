import Link from "next/link";
import { OrganizationList } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { normalizeRelativeRedirect } from "@/lib/redirect";

type SelectOrganizationPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SelectOrganizationPage({ searchParams }: SelectOrganizationPageProps) {
  const params = await searchParams;
  const { userId, orgId } = await auth();
  const redirectTarget = normalizeRelativeRedirect(params.redirect_url, "/workspace/dashboard");

  if (!userId) {
    redirect(`/sign-up?redirect_url=${encodeURIComponent(redirectTarget)}`);
  }

  if (orgId) {
    redirect(redirectTarget);
  }

  return (
    <div className="page">
      <div className="shell">
        <main>
          <section className="glass panel">
            <div className="tag">Step 2 of 2: Workspace setup</div>
            <h3>Create or select your organization to continue.</h3>
            <p className="disclaimer">
              Checkout and billing are tied to an organization workspace. This takes about 10 seconds.
            </p>
            <div className="signin-card">
              <OrganizationList
                afterCreateOrganizationUrl={redirectTarget}
                afterSelectOrganizationUrl={redirectTarget}
                afterSelectPersonalUrl={`/workspace/select-organization?redirect_url=${encodeURIComponent(redirectTarget)}`}
                hidePersonal
                skipInvitationScreen
              />
            </div>
            <div className="hero-actions">
              <Link className="button secondary" href="/#pricing">
                Back to pricing
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
