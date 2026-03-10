import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminPortalUser, resolvePrimaryEmailAddress } from "@/lib/admin-portal";
import { resolveAuthenticatedTrainee } from "@/lib/trainee-access";

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

  const traineeAccess = await resolveAuthenticatedTrainee({
    userId,
    orgId,
    source: "workspace/dashboard",
  });
  if (traineeAccess.trainee) {
    redirect("/dashboard/trainee");
  }

  redirect("/dashboard/trainer");
}
