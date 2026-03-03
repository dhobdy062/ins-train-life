
import { auth } from "@clerk/nextjs/server";
import TrainerDashboard from "@/components/dashboards/TrainerDashboard";
import { getOrgEntitlement, getTrainerDashboardSnapshot } from "@/lib/convex";

type TrainerDashboardPageProps = {
  searchParams: Promise<{
    tab?: string;
    agent?: string;
  }>;
};

type SnapshotTrainee = Awaited<ReturnType<typeof getTrainerDashboardSnapshot>>["trainees"][number];
type TeamSnapshot = Awaited<ReturnType<typeof getTrainerDashboardSnapshot>>;
type CurrentPlan = NonNullable<Awaited<ReturnType<typeof getOrgEntitlement>>["currentPlan"]>;

const VALID_TABS = new Set(["home", "practice", "team", "settings"]);

function formatPlanDisplayLabel(plan: CurrentPlan | null | undefined) {
  if (!plan) {
    return "Plan unavailable";
  }

  const planName = plan.planId === "starter" ? "Starter" : plan.planId === "pro" ? "Pro" : "Agency";
  const interval = plan.interval === "monthly" ? "Monthly" : plan.interval === "annual" ? "Annual" : null;

  return interval ? `${planName} (${interval})` : planName;
}

function formatStripeStatus(status: string) {
  return status
    .split("_")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");
}

export default async function TrainerDashboardPage({ searchParams }: TrainerDashboardPageProps) {
  const params = await searchParams;
  const requestedTab = typeof params.tab === "string" ? params.tab : "";
  const selectedAgentParam = typeof params.agent === "string" ? params.agent : "";
  const defaultTab = VALID_TABS.has(requestedTab) ? requestedTab : "team";

  const { userId, orgId } = await auth();
  const canOpenDashboard = Boolean(userId && orgId);
  const entitlement = orgId ? await getOrgEntitlement({ orgId }).catch(() => null) : null;
  const liveSnapshot = canOpenDashboard
    ? await getTrainerDashboardSnapshot({ orgId: orgId as string, trainerId: userId ?? undefined }).catch(() => null)
    : null;

  const isPaid = entitlement?.mode === "paid";
  const isBlocked = entitlement?.mode === "blocked";
  const minutesUsed = entitlement?.minutesUsed ?? 0;
  const minutesLimit = entitlement?.minutesLimit;
  const minutesRemaining = entitlement?.minutesRemaining;
  const accessLabel = isPaid ? "Paid plan" : isBlocked ? "Upgrade needed" : "Trial";
  const planDisplayLabel = formatPlanDisplayLabel(entitlement?.currentPlan);
  const planStatusLabel = entitlement?.currentPlan?.stripeStatus
    ? `${accessLabel} | ${formatStripeStatus(entitlement.currentPlan.stripeStatus)}`
    : accessLabel;

  const teamSnapshot: TeamSnapshot = liveSnapshot ?? {
    hasData: false,
    totalAgents: 0,
    avgScore: 0,
    atD3Plus: 0,
    hardStopRate: 0,
    trainees: [],
  };

  const selectedAgent: SnapshotTrainee | null =
    teamSnapshot.trainees.find((trainee) => trainee.id === selectedAgentParam) ?? teamSnapshot.trainees[0] ?? null;

  return (
    <TrainerDashboard
      teamSnapshot={teamSnapshot}
      selectedAgent={selectedAgent}
      accessLabel={accessLabel}
      planDisplayLabel={planDisplayLabel}
      planStatusLabel={planStatusLabel}
      isBlocked={isBlocked}
      minutesUsed={minutesUsed}
      minutesLimit={minutesLimit}
      minutesRemaining={minutesRemaining}
      defaultTab={defaultTab}
      entitlementMode={entitlement?.mode ?? "trial"}
    />
  );
}
