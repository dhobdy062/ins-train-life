import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="page">
      <div className="shell" style={{ alignItems: "center" }}>
        <SignUp />
      </div>
    </div>
  );
}
