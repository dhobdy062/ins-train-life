import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkEnabled = Boolean(publishableKey && /^pk_(test|live)_/.test(publishableKey));

  return (
    <div className="page">
      <div className="shell" style={{ alignItems: "center" }}>
        {clerkEnabled ? (
          <SignIn />
        ) : (
          <div className="glass panel">
            <div className="tag">Clerk config required</div>
            <h3>Set Clerk environment variables to enable sign in.</h3>
          </div>
        )}
      </div>
    </div>
  );
}
