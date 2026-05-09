import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import sectionStyles from "@/components/trainer/TrainerSection.module.css";
import { getOrgEntitlement, getTrainerDashboardSnapshot } from "@/lib/convex";
import styles from "./overview.module.css";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function scoreTone(score: number) {
  if (score >= 85) return styles.scoreStrong;
  if (score >= 75) return styles.scoreGood;
  return styles.scoreRisk;
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

  const trainees = snapshot?.trainees ?? [];
  const activeThisWeek = trainees.filter((member) => member.status === "active").length;
  const totalCalls = trainees.reduce((total, member) => total + member.callsThisLevel, 0);
  const avgCallScore = snapshot?.avgScore ?? 0;
  const closeRate = trainees.length
    ? Math.round(
        trainees.reduce((total, member) => total + member.appointmentSetRate, 0) / Math.max(trainees.length, 1),
      )
    : 0;

  const topPerformers = [...trainees].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
  const minutesLimit = entitlement?.minutesLimit ?? null;
  const minutesUsed = entitlement?.minutesUsed ?? 0;
  const minutesPercent = minutesLimit ? Math.min(Math.round((minutesUsed / minutesLimit) * 100), 100) : 0;

  return (
    <div className={styles.pageStack}>
      <section className={sectionStyles.panel}>
        <div className={sectionStyles.headerRow}>
          <div>
            <p className={sectionStyles.sectionTag}>Agency Dashboard</p>
            <h2>Agency Dashboard</h2>
            <p className={sectionStyles.helpText}>Review trainee activity, call volume, score trends, and coaching focus.</p>
          </div>
        </div>
      </section>

      <section className={styles.cardGrid}>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Team Close Rate</p>
          <p className={styles.kpiValue}>{closeRate}%</p>
          <p className={styles.kpiMeta}>{activeThisWeek} active this week</p>
        </article>

        <article className={`${styles.kpiCard} ${styles.kpiCardSuccess}`}>
          <p className={styles.kpiLabel}>Total Training Calls</p>
          <p className={styles.kpiValue}>{totalCalls}</p>
          <p className={styles.kpiMeta}>{snapshot?.totalAgents ?? 0} team members</p>
        </article>

        <article className={`${styles.kpiCard} ${styles.kpiCardWarn}`}>
          <p className={styles.kpiLabel}>Avg Call Score</p>
          <p className={styles.kpiValue}>{avgCallScore}%</p>
          <p className={styles.kpiMeta}>Hard-stop rate: {snapshot?.hardStopRate ?? 0}%</p>
        </article>

        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Team Minutes Used</p>
          <p className={styles.kpiValue}>
            {minutesUsed}
            <span className={styles.kpiValueSub}>{minutesLimit ? ` / ${minutesLimit}` : " / Unlimited"}</span>
          </p>
          {minutesLimit ? (
            <>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${minutesPercent}%` }}></div>
              </div>
              <p className={styles.kpiMeta}>{minutesPercent}% of monthly allocation</p>
            </>
          ) : (
            <p className={styles.kpiMeta}>Unlimited minutes on current plan</p>
          )}
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Top Performers This Week</h2>
          <Link className={styles.actionButton} href="/dashboard/trainer/trainees">
            View All
          </Link>
        </div>

        <div className={styles.performerList}>
          {topPerformers.length === 0 ? (
            <p className={styles.emptyText}>No completed sessions yet. Run a training call to populate leaderboard data.</p>
          ) : (
            topPerformers.map((member, index) => (
              <article className={styles.performerRow} key={member.id}>
                <div className={styles.rankBadge}>{index + 1}</div>
                <div className={styles.avatar}>{initials(member.name)}</div>
                <div className={styles.performerInfo}>
                  <p className={styles.performerName}>{member.name}</p>
                  <p className={styles.performerMeta}>
                    {member.callsThisLevel} calls • {member.recommendation} • {member.level}
                  </p>
                </div>
                <p className={styles.performerScore}>{member.avgScore}%</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Team Member Performance</h2>
          <Link className={styles.actionButton} href="/dashboard/trainer/scoring">
            Export Report
          </Link>
        </div>

        <div className={styles.filterTabs}>
          <span className={styles.filterTabActive}>All Members</span>
          <span>{activeThisWeek} Active This Week</span>
          <span>{trainees.filter((member) => member.avgScore < 75 || member.hardStopRate > 10).length} Need Attention</span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Status</th>
                <th>Calls</th>
                <th>Avg Score</th>
                <th>Level</th>
                <th>This Week</th>
              </tr>
            </thead>
            <tbody>
              {trainees.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    No trainees yet. Add your first team member to start collecting live training data.
                  </td>
                </tr>
              ) : (
                trainees.map((member) => {
                  const recent = member.status === "active";
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className={styles.nameCell}>
                          <strong>{member.name}</strong>
                          <span>{member.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusPill} ${recent ? styles.statusActive : styles.statusInactive}`}>
                          {recent ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{member.callsThisLevel}</td>
                      <td>
                        <div className={styles.scoreCell}>
                          <div className={styles.scoreTrack}>
                            <div className={`${styles.scoreFill} ${scoreTone(member.avgScore)}`} style={{ width: `${member.avgScore}%` }}></div>
                          </div>
                          <span>{member.avgScore}%</span>
                        </div>
                      </td>
                      <td className={styles.levelCell}>{member.level}</td>
                      <td>{member.latestSessionAt ? "1+ calls" : "0 calls"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
