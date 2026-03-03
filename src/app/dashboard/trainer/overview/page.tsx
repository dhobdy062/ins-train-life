import { auth } from "@clerk/nextjs/server";
import { getOrgEntitlement, getTrainerDashboardSnapshot } from "@/lib/convex";

function metric(value: number | string, label: string, hint?: string) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <span className="disclaimer">{hint}</span> : null}
    </div>
  );
}

export default async function TrainerOverviewPage() {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) {
    return null;
  }

  const [snapshot, entitlement] = await Promise.all([
    getTrainerDashboardSnapshot({ orgId, trainerId: userId }).catch(() => null),
    getOrgEntitlement({ orgId }).catch(() => null),
  ]);

  const totalAgents = snapshot?.totalAgents ?? 0;
  const avgScore = snapshot?.avgScore ?? 0;
  const atD3Plus = snapshot?.atD3Plus ?? 0;
  const hardStopRate = snapshot?.hardStopRate ?? 0;

  const paidMode = entitlement?.mode === "paid";
  const blockedMode = entitlement?.mode === "blocked";
  const usageLabel = entitlement
    ? `${entitlement.minutesUsed}${entitlement.minutesLimit ? ` / ${entitlement.minutesLimit}` : ""} minutes`
    : "Unavailable";
  const remainingLabel = entitlement
    ? entitlement.minutesLimit
      ? `${entitlement.minutesRemaining} minutes`
      : "Unlimited"
    : "Unavailable";

  return (
    <>
      <section className="glass panel">
        <div className="tag">Team Snapshot</div>
        <h3>Track trainee progress and coaching priorities at a glance</h3>
        <div className="grid">
          {metric(totalAgents, "Active trainees")}
          {metric(`${avgScore}%`, "Average score")}
          {metric(atD3Plus, "At D3 or higher")}
          {metric(`${hardStopRate}%`, "Hard-stop rate", "Target is below 5%")}
          {metric(paidMode ? "Paid" : blockedMode ? "Upgrade needed" : "Trial", "Access mode")}
          {metric(usageLabel, "Usage")}
          {metric(remainingLabel, "Remaining talk time")}
        </div>
      </section>

      <section className="glass panel">
        <div className="tag">Quick Actions</div>
        <h3>Run your core trainer workflow</h3>
        <div className="grid">
          {metric("1", "Add trainees", "Use the Trainees tab to invite and configure your team.")}
          {metric("2", "Launch sessions", "Use Session Builder for practice calls and live scoring.")}
          {metric("3", "Coach weak areas", "Use Objection Library and Scoring to sharpen performance.")}
        </div>
      </section>
    </>
  );
}
