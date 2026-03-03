import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTraineeByOrgAndEmail } from "@/lib/convex";

function resolvePrimaryEmailAddress(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return null;
  }

  const primaryId = user.primaryEmailAddressId ?? null;
  const emailAddresses = Array.isArray(user.emailAddresses) ? user.emailAddresses : [];
  const primaryMatch = primaryId ? emailAddresses.find((email) => email.id === primaryId) : null;
  const candidate = primaryMatch?.emailAddress ?? emailAddresses[0]?.emailAddress ?? null;

  if (!candidate) {
    return null;
  }

  const normalized = candidate.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export default async function WorkspaceDashboardAliasPage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fworkspace%2Fdashboard");
  }

  if (!orgId) {
    redirect("/workspace/select-organization?redirect_url=%2Fworkspace%2Fdashboard");
  }

  const user = await currentUser();
  const primaryEmail = resolvePrimaryEmailAddress(user);

  if (primaryEmail) {
    const trainee = await getTraineeByOrgAndEmail({ orgId, email: primaryEmail }).catch(() => null);
    if (trainee) {
      redirect("/dashboard/trainee");
    }
  }

  redirect("/dashboard/trainer");
}
