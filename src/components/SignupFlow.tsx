"use client";

import { SignUp } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import OrgCodeSignup from "@/components/OrgCodeSignup";

type SignupFlowProps = {
  redirectTarget: string;
  checkoutTarget: string;
};

export default function SignupFlow({ redirectTarget, checkoutTarget }: SignupFlowProps) {
  const [confirmationToken, setConfirmationToken] = useState("");
  const finalRedirect = useMemo(() => {
    if (!confirmationToken) {
      return redirectTarget;
    }
    return `/api/signup/org-code/complete?token=${encodeURIComponent(confirmationToken)}`;
  }, [confirmationToken, redirectTarget]);

  return (
    <div className="signin-layout">
      <section className="glass panel pricing-stack">
        <div className="tag">Join or create workspace</div>
        <h3>Use an organization ID to join without checkout.</h3>
        <p className="disclaimer">
          Enter the last 6 characters of your organization ID to join an existing team. Leave it blank to create your own
          organization with your account before checkout.
        </p>
        <OrgCodeSignup onConfirmed={setConfirmationToken} />
        <a className="button secondary" href={checkoutTarget}>
          Create my own organization and continue to checkout
        </a>
      </section>
      <section className="signin-card">
        <SignUp forceRedirectUrl={finalRedirect} fallbackRedirectUrl={finalRedirect} />
      </section>
    </div>
  );
}
