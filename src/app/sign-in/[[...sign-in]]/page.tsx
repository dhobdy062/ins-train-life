import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="page">
      <div className="shell" style={{ alignItems: "center" }}>
        <SignIn />
      </div>
    </div>
  );
}
