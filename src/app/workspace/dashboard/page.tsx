import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTraineeByOrgAndEmail } from "@/lib/convex";
import { isAdminPortalUser, resolvePrimaryEmailAddress } from "@/lib/admin-portal";

export default async function WorkspaceDashboardAliasPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fworkspace%2Fdashboard");
  }

  const user = await currentUser();
  const primaryEmail = resolvePrimaryEmailAddress(user);
  if (isAdminPortalUser(primaryEmail)) {
    redirect("/dashboard/admin");
  }

  if (!orgId) {
    redirect("/workspace/select-organization?redirect_url=%2Fworkspace%2Fdashboard");
  }

  if (primaryEmail) {
    const trainee = await getTraineeByOrgAndEmail({ orgId, email: primaryEmail }).catch(() => null);
    if (trainee) {
      redirect("/dashboard/trainee");
    }
  }

  redirect("/dashboard/trainer");
}
