import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SelfServeSessionSetup from "@/components/trainee/SelfServeSessionSetup";
import { resolvePrimaryEmailAddress } from "@/lib/admin-portal";
import { ALL_TRAINING_PRODUCT_TYPES } from "@/lib/training-products";

export default async function TrainerPracticeSetupPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fdashboard%2Ftrainer%2Fpractice");
  }

  if (!orgId) {
    redirect("/workspace/select-organization?redirect_url=%2Fdashboard%2Ftrainer%2Fpractice");
  }

  const user = await currentUser().catch(() => null);
  const email = resolvePrimaryEmailAddress(user);
  const fallbackName = email ? email.split("@")[0] : null;
  const name =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    fallbackName ||
    "Trainer";

  return (
    <div className="page">
      <div className="shell">
        <main>
          <SelfServeSessionSetup
            traineeName={name}
            availableProductTypes={[...ALL_TRAINING_PRODUCT_TYPES]}
            initialDifficulty="D2"
            initialNumObjections={3}
          />
        </main>
      </div>
    </div>
  );
}

