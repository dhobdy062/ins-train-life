import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import DemoConsole from "@/components/DemoConsole";
import SequencePlannerCard from "@/components/SequencePlannerCard";
import DashboardTabs, { DashboardTabPanel } from "@/components/dashboard/DashboardTabs";
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

const VALID_TABS = new Set(["home", "practice", "team"]);

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
      email: "sarah.johnson@example.com",
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
      email: "mike.chen@example.com",
      level: "D3",
      avgScore: 77,
      callsThisLevel: 11,
      hardStops: 1,
      hardStopRate: 5,
      objectionSuccessRate: 74,
      appointmentSetRate: 36,
      recommendation: "Continue current level",
      focusArea: "Rebuttal precision for key objections",
    },
    {
      id: "sample-jennifer-lee",
      name: "Jennifer Lee",
      email: "jennifer.lee@example.com",
      level: "D4",
      avgScore: 89,
      callsThisLevel: 9,
      hardStops: 0,
      hardStopRate: 0,
      objectionSuccessRate: 92,
      appointmentSetRate: 51,
      recommendation: "Ready to level up",
      focusArea: "Advance to higher-difficulty scenarios",
    },
    {
      id: "sample-david-martinez",
      name: "David Martinez",
      email: "david.martinez@example.com",
      level: "D1",
      avgScore: 66,
      callsThisLevel: 8,
      hardStops: 2,
      hardStopRate: 12,
      objectionSuccessRate: 59,
      appointmentSetRate: 22,
      recommendation: "Needs coaching",
      focusArea: "Tone control + hard-stop recovery",
    },
  ],
};

function formatPercent(value: number) {
  return `${value}%`;
}

function recommendationToneClass(recommendation: string) {
  const normalized = recommendation.toLowerCase();

  if (normalized.includes("level up")) {
    return "tone-success";
  }

  if (normalized.includes("coaching") || normalized.includes("drills")) {
    return "tone-danger";
  }

  if (normalized.includes("continue")) {
    return "tone-warning";
  }

  return "tone-neutral";
}

function levelToneClass(level: string) {
  const normalized = level.toUpperCase();
  if (normalized === "D5") return "tone-danger";
  if (normalized === "D4") return "tone-warning";
  if (normalized === "D3") return "tone-info";
  return "tone-success";
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
    <div className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="badge">Cream No Sugar</span>
            <span>Trainer dashboard</span>
          </div>
          <div className="hero-actions">
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                elements: {
                  rootBox: { display: "flex", alignItems: "center" },
                },
              }}
            />
            <UserButton />
            <Link className="button secondary" href="/dashboard/trainer">
              Home
            </Link>
          </div>
        </nav>

        <main>
          {canOpenDashboard ? (
            <DashboardTabs defaultTab={defaultTab}>
              <DashboardTabPanel id="home" label="Home">
                <section className="glass panel">
                  <div className="tag">Control center</div>
                  <h3>Lead your team&apos;s daily training plan</h3>
                  <div className="grid">
                    <div className="metric">
                      <span>Talk time remaining</span>
                      <strong>{minutesLimit ? minutesRemaining : "Unlimited"}</strong>
                    </div>
                    <div className="metric">
                      <span>Talk time used</span>
                      <strong>
                        {minutesUsed}
                        {minutesLimit ? ` / ${minutesLimit} minutes` : " minutes"}
                      </strong>
                    </div>
                    <div className="metric">
                      <span>Access mode</span>
                      <strong>{accessLabel}</strong>
                    </div>
                    <div className="metric">
                      <span>Team avg score</span>
                      <strong>{formatPercent(teamSnapshot.avgScore)}</strong>
                    </div>
                  </div>
                  <div className="hero-actions">
                    <Link className="button" href="/dashboard/trainer?tab=team">
                      Open Team Dashboard
                    </Link>
                  </div>
                </section>

                {usingSampleSnapshot ? (
                  <section className="glass panel">
                    <div className="tag">Starter data loaded</div>
                    <h3>Your dashboard is pre-populated so trainers can learn the workflow immediately.</h3>
                    <p className="disclaimer">
                      Invite trainees and run live sessions. Sample agents are automatically replaced as real call data arrives.
                    </p>
                  </section>
                ) : null}

                {!usingSampleSnapshot ? (
                  <section className="glass panel">
                    <div className="tag">Live performance feed</div>
                    <h3>Real trainee metrics are now powering this dashboard.</h3>
                    <p className="disclaimer">Use the Team tab to review individual metrics and coaching priorities.</p>
                  </section>
                ) : null}

                {isBlocked ? (
                  <section className="glass panel">
                    <div className="tag">Talk time limit reached</div>
                    <h3>Your team has used all available trial talk time.</h3>
                    <p className="disclaimer">Upgrade to continue launching new practice calls.</p>
                    <div className="hero-actions">
                      <Link className="button" href="/#pricing">
                        Upgrade plan
                      </Link>
                    </div>
                  </section>
                ) : null}
              </DashboardTabPanel>

              <DashboardTabPanel id="practice" label="Practice & Monitoring">
                <div className="glass panel">
                  <div className="tag">Practice console</div>
                  <h3>Practice or monitor</h3>
                  <p className="disclaimer">
                    Use the console to run your own practice sessions or monitor your team&apos;s progress in real-time.
                  </p>
                  <DemoConsole
                    startDisabled={isBlocked}
                    blockedStatusMessage={
                      isBlocked ? "Trial talk-time limit reached. Upgrade to continue starting new calls." : null
                    }
                  />
                </div>
              </DashboardTabPanel>

              <DashboardTabPanel id="team" label="Team">
                <section className="glass panel">
                  <div className="tag">Team dashboard</div>
                  <h3>Agent management and performance overview</h3>
                  <p className="disclaimer">
                    {usingSampleSnapshot
                      ? "Showing configured starter agents so your dashboard has immediate context on first login."
                      : "Showing live metrics from your organization training sessions."}
                  </p>
                  <div className="grid">
                    <div className="metric">
                      <span>Total agents</span>
                      <strong>{teamSnapshot.totalAgents}</strong>
                    </div>
                    <div className="metric">
                      <span>Average score</span>
                      <strong>{formatPercent(teamSnapshot.avgScore)}</strong>
                    </div>
                    <div className="metric">
                      <span>Agents at D3+</span>
                      <strong>{teamSnapshot.atD3Plus}</strong>
                    </div>
                    <div className="metric">
                      <span>Hard-stop rate</span>
                      <strong>{formatPercent(teamSnapshot.hardStopRate)}</strong>
                    </div>
                  </div>
                </section>

                <section className="glass panel">
                  <div className="tag">Team roster</div>
                  <h3>Configured agents and linked metrics</h3>

                  {teamSnapshot.trainees.length ? (
                    <div className="table-wrap">
                      <table className="roster-table">
                        <thead>
                          <tr>
                            <th>Agent</th>
                            <th>Level</th>
                            <th>Avg score</th>
                            <th>Calls (level)</th>
                            <th>Hard stops</th>
                            <th>Recommendation</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamSnapshot.trainees.map((trainee) => (
                            <tr key={trainee.id}>
                              <td>
                                <div className="table-primary">{trainee.name}</div>
                                <div className="table-secondary">{trainee.email}</div>
                              </td>
                              <td>
                                <span className={`status-pill ${levelToneClass(trainee.level)}`}>{trainee.level}</span>
                              </td>
                              <td>{formatPercent(trainee.avgScore)}</td>
                              <td>{trainee.callsThisLevel}</td>
                              <td>{trainee.hardStops}</td>
                              <td>
                                <span className={`status-pill ${recommendationToneClass(trainee.recommendation)}`}>
                                  {trainee.recommendation}
                                </span>
                              </td>
                              <td>
                                <Link
                                  className="button secondary"
                                  href={`/dashboard/trainer?tab=team&agent=${encodeURIComponent(trainee.id)}`}
                                >
                                  View metrics
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="disclaimer">No trainees available yet. Invite trainees to start generating live metrics.</p>
                  )}
                </section>

                {selectedAgent ? (
                  <section className="glass panel">
                    <div className="tag">Agent profile</div>
                    <h3>{selectedAgent.name}</h3>
                    <p className="disclaimer">Focused coaching direction: {selectedAgent.focusArea}</p>
                    <div className="grid">
                      <div className="metric">
                        <span>Current level</span>
                        <strong>{selectedAgent.level}</strong>
                      </div>
                      <div className="metric">
                        <span>Objection success</span>
                        <strong>{formatPercent(selectedAgent.objectionSuccessRate)}</strong>
                      </div>
                      <div className="metric">
                        <span>Appointment set rate</span>
                        <strong>{formatPercent(selectedAgent.appointmentSetRate)}</strong>
                      </div>
                      <div className="metric">
                        <span>Hard-stop rate</span>
                        <strong>{formatPercent(selectedAgent.hardStopRate)}</strong>
                      </div>
                    </div>
                  </section>
                ) : null}

                <SequencePlannerCard />
              </DashboardTabPanel>
            </DashboardTabs>
          ) : (
            <div className="glass panel">
              {userId ? (
                <>
                  <div className="tag">Organization required</div>
                  <h3>One last step: choose your organization workspace.</h3>
                  <p className="disclaimer">Training sessions and billing access are connected to that workspace.</p>
                  <Link className="button" href="/workspace/select-organization?redirect_url=%2Fdashboard%2Ftrainer">
                    Choose organization
                  </Link>
                </>
              ) : (
                <>
                  <div className="tag">Authentication required</div>
                  <h3>Sign in and choose an organization to open the trainer dashboard.</h3>
                  <p className="disclaimer">Sign-in keeps your organization&apos;s coaching progress secure.</p>
                  <Link className="button" href="/sign-in?redirect_url=/dashboard/trainer">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
