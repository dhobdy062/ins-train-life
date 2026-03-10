import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import TraineeDashboard from "@/components/dashboards/TraineeDashboard";
import { resolveAuthenticatedTrainee } from "@/lib/trainee-access";

type TraineeDashboardPageProps = {
  searchParams: Promise<{
    refresh?: string;
  }>;
};

function buildInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return "TR";
  }

  return words.map((word) => word.charAt(0).toUpperCase()).join("");
}

export default async function TraineeDashboardPage({ searchParams }: TraineeDashboardPageProps) {
  const params = await searchParams;
  const refreshOnLoad = params.refresh === "1";
  const { userId, orgId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fdashboard%2Ftrainee");
  }

  if (!orgId) {
    redirect("/workspace/select-organization?redirect_url=%2Fdashboard%2Ftrainee");
  }

  const traineeAccess = await resolveAuthenticatedTrainee({
    userId,
    orgId,
    source: "dashboard/trainee",
  });
  if (!traineeAccess.trainee) {
    redirect("/workspace/dashboard");
  }

  const user = await currentUser().catch(() => null);
  const organizationName =
    typeof (sessionClaims as { org_name?: unknown } | null)?.org_name === "string"
      ? ((sessionClaims as { org_name?: string }).org_name ?? "Your team")
      : "Your team";
  const userName =
    user?.fullName?.trim() ||
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    traineeAccess.trainee.name ||
    "Trainee";

  return (
    <TraineeDashboard
      refreshOnLoad={refreshOnLoad}
      viewer={{
        userName,
        organizationName,
        initials: buildInitials(userName),
      }}
    />
  );
}
