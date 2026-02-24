
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
type TeamSnapshot = Awaited<ReturnType<typeof getTrainerDashboardSnapshot>> & {
  source: "live" | "sample";
};

const VALID_TABS = new Set(["home", "practice", "team", "settings"]);

const SAMPLE_TEAM_SNAPSHOT: TeamSnapshot = {
  source: "sample",
  hasData: false,
  totalAgents: 4,
  avgScore: 79,
  atD3Plus: 2,
  hardStopRate: 3,
  trainees: [
    {
      id: "sample-sarah-johnson",
      name: "Sarah Johnson",
      email: "cream@support.retrospxt.com",
      level: "D2",
      avgScore: 83,
      callsThisLevel: 14,
      hardStops: 0,
      hardStopRate: 0,
      objectionSuccessRate: 84,
      appointmentSetRate: 42,
      recommendation: "Ready to level up",
      focusArea: "Advance to higher-difficulty scenarios",
    },
    {
      id: "sample-mike-chen",
      name: "Mike Chen",
      email: "cream@support.retrospxt.com",
      level: "D3",
      avgScore: 77,
      callsThisLevel: 8,
      hardStops: 1,
      hardStopRate: 12.5,
      objectionSuccessRate: 65,
      appointmentSetRate: 30,
      recommendation: "Focus on objection handling",
      focusArea: "Practice objection scenarios",
    },
    {
      id: "sample-jessica-davis",
      name: "Jessica Davis",
      email: "cream@support.retrospxt.com",
      level: "D1",
      avgScore: 92,
      callsThisLevel: 25,
      hardStops: 0,
      hardStopRate: 0,
      objectionSuccessRate: 95,
      appointmentSetRate: 60,
      recommendation: "Excellent performance",
      focusArea: "Maintain consistency",
    },
    {
      id: "sample-david-lee",
      name: "David Lee",
      email: "cream@support.retrospxt.com",
      level: "D4",
      avgScore: 72,
      callsThisLevel: 5,
      hardStops: 2,
      hardStopRate: 40,
      objectionSuccessRate: 50,
      appointmentSetRate: 20,
      recommendation: "Needs coaching on hard stops",
      focusArea: "Review calls with high difficulty",
    },
  ],
};

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

  const usingSampleSnapshot = !liveSnapshot?.hasData;
  const teamSnapshot: TeamSnapshot = usingSampleSnapshot
    ? SAMPLE_TEAM_SNAPSHOT
    : {
        ...liveSnapshot,
        source: "live",
      };

  const selectedAgent: SnapshotTrainee | null =
    teamSnapshot.trainees.find((trainee) => trainee.id === selectedAgentParam) ?? teamSnapshot.trainees[0] ?? null;

  return (
    <TrainerDashboard
      teamSnapshot={teamSnapshot}
      selectedAgent={selectedAgent}
      accessLabel={accessLabel}
      isBlocked={isBlocked}
      minutesUsed={minutesUsed}
      minutesLimit={minutesLimit}
      minutesRemaining={minutesRemaining}
      defaultTab={defaultTab}
      entitlementMode={entitlement?.mode ?? "trial"}
    />
  );
}
