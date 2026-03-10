"use client";

import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import styles from "./TraineeDashboard.module.css";

type TraineeResultsPayload = {
  trainee: {
    id: string;
    name: string;
    difficulty: string;
    numObjections: number;
    status: string;
  };
  latestSession: {
    sessionKey: string;
    startedAt: string | null;
    endedAt: string | null;
    status: string;
    assistantId: string;
    structuredOutcome: {
      rebuttalPerformanceScore?: number;
      appointmentSet?: boolean;
      callSummary?: string;
    } | null;
    recordingUrl: string | null;
    transcriptUrl: string | null;
  } | null;
  latestMetrics: {
    score: number | null;
    durationSeconds: number | null;
    toneStrikes: number | null;
    appointmentSet: boolean | null;
    eventType: string | null;
    createdAt: string | null;
  } | null;
  latestRebuttals: Array<{
    expectedType: string | null;
    objectionId: string | null;
    response: string;
    tone: string | null;
    score: number;
    grade: string;
    feedback: string | null;
    createdAt: string | null;
  }>;
  assignedSessions: Array<{
    sessionKey: string;
    status: string;
    difficulty: string;
    objectionsRequired: number;
    createdAt: string | null;
    startedAt: string | null;
    selectedObjections: Array<{ order: number; text: string; rebuttalType: string }>;
  }>;
  history: Array<{
    sessionKey: string;
    startedAt: string | null;
    endedAt: string | null;
    status: string;
    assistantId: string;
    difficulty: string;
    objectionsRequired: number;
    selectedObjections: Array<{ order: number; text: string; rebuttalType: string }>;
    structuredOutcome: {
      rebuttalPerformanceScore?: number;
      appointmentSet?: boolean;
      callSummary?: string;
    } | null;
    recordingUrl: string | null;
    transcriptUrl: string | null;
    metrics: {
      score: number | null;
      durationSeconds: number | null;
      toneStrikes: number | null;
      appointmentSet: boolean | null;
      eventType: string | null;
      createdAt: string | null;
    } | null;
  }>;
};

export type TraineeDashboardViewer = {
  userName: string;
  organizationName: string;
  initials: string;
};

type TraineeDashboardProps = {
  viewer: TraineeDashboardViewer;
  refreshOnLoad?: boolean;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString();
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return "-";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

function scoreClass(score: number | null) {
  if (score === null || score === undefined) {
    return "";
  }
  if (score >= 90) {
    return styles.scoreExcellent;
  }
  if (score >= 75) {
    return styles.scoreGood;
  }
  return "";
}

export default function TraineeDashboard({ viewer, refreshOnLoad = false }: TraineeDashboardProps) {
  const [data, setData] = useState<TraineeResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch("/api/trainee/results", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as TraineeResultsPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load trainee results.");
      }

      setData(payload);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load trainee results.");
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchResults(false).then(async () => {
      if (refreshOnLoad) {
        await fetchResults(true);
      }
    });
  }, [fetchResults, refreshOnLoad]);

  const latestScore = data?.latestMetrics?.score ?? data?.latestSession?.structuredOutcome?.rebuttalPerformanceScore ?? null;
  const latestSummary = data?.latestSession?.structuredOutcome?.callSummary ?? "No coach summary yet.";
  const latestOutcomeLabel = data?.latestSession
    ? data.latestSession.structuredOutcome?.appointmentSet
      ? "Booked"
      : "Open"
    : "Waiting";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.sidebarLogo}>Cream No Sugar</div>
          <p className={styles.sidebarOrg}>{viewer.organizationName}</p>
        </div>

        <nav className={styles.sidebarNav} aria-label="Trainee dashboard navigation">
          <a className={styles.navItem} href="#dashboard">
            Dashboard
          </a>
          <a className={styles.navItem} href="#assigned-sessions">
            Assigned Sessions
          </a>
          <a className={styles.navItem} href="#session-history">
            Session History
          </a>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link className={styles.sidebarLink} href="/workspace/dashboard">
            Workspace Home
          </Link>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header} id="dashboard">
          <div className={styles.headerLeft}>
            <h1>Welcome back, {viewer.userName}</h1>
            <p>{viewer.organizationName} trainee workspace</p>
          </div>

          <div className={styles.headerActions}>
            <button className={styles.refreshButton} onClick={() => void fetchResults(true)} disabled={refreshing || loading}>
              {refreshing ? "Refreshing..." : "Refresh Results"}
            </button>

            <div className={styles.utilityBar}>
              <div className={styles.switcherBlock}>
                <span className={styles.utilityLabel}>Team</span>
                <OrganizationSwitcher
                  hidePersonal
                  appearance={{
                    elements: {
                      rootBox: { display: "flex", alignItems: "center" },
                    },
                  }}
                />
              </div>

              <div className={styles.profileCard}>
                <div className={styles.profileInfo}>
                  <span className={styles.profileName}>{viewer.userName}</span>
                  <span className={styles.profileMeta}>{viewer.organizationName}</span>
                </div>
                <div className={styles.profileAvatar} aria-hidden="true">
                  {viewer.initials}
                </div>
              </div>

              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        {loading ? (
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Loading results...</h2>
          </section>
        ) : null}

        {error ? (
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Unable to load results</h2>
            <p className={styles.disclaimer}>{error}</p>
          </section>
        ) : null}

        {!loading && !error ? (
          <>
            <section className={styles.ctaCard} id="assigned-sessions">
              <div className={styles.ctaCopy}>
                <h2 className={styles.ctaTitle}>Assigned sessions ready to start</h2>
                <p className={styles.ctaSubtitle}>
                  {data?.assignedSessions.length
                    ? `${data.assignedSessions.length} session${data.assignedSessions.length === 1 ? "" : "s"} waiting for you.`
                    : "No pending sessions right now."}
                </p>
              </div>

              <div className={styles.assignedGrid}>
                {data?.assignedSessions.length ? (
                  data.assignedSessions.map((session) => (
                    <article key={session.sessionKey} className={styles.assignedCard}>
                      <div className={styles.assignedMeta}>
                        <span>{session.difficulty}</span>
                        <span>{session.objectionsRequired} objections</span>
                        <span>Assigned {formatDateTime(session.createdAt)}</span>
                      </div>
                      <strong className={styles.assignedTitle}>{session.sessionKey}</strong>
                      <p className={styles.disclaimer}>
                        {session.selectedObjections.map((row) => `${row.order + 1}. ${row.text}`).join(" | ")}
                      </p>
                      <Link className={styles.ctaButton} href={`/training/start?session=${encodeURIComponent(session.sessionKey)}`}>
                        Start Assigned Session
                      </Link>
                    </article>
                  ))
                ) : (
                  <article className={styles.assignedCard}>
                    <strong className={styles.assignedTitle}>No active assignments</strong>
                    <p className={styles.disclaimer}>
                      Your next trainer-built session will appear here as soon as it is ready.
                    </p>
                  </article>
                )}
              </div>
            </section>

            <section className={styles.streakBanner}>
              <div className={styles.streakContent}>
                <span className={styles.streakTag}>Current focus</span>
                <strong>Difficulty {data?.trainee.difficulty ?? "-"}</strong>
                <span>{data?.trainee.numObjections ?? 0} objection targets in your current plan</span>
              </div>
              <div className={styles.streakScore}>
                {latestScore === null ? "Awaiting score" : `${latestScore}% latest score`}
              </div>
            </section>

            <section className={styles.statsGrid}>
              <article className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Latest Score</span>
                  <span className={styles.metricPill}>Performance</span>
                </div>
                <p className={styles.statValue}>{latestScore === null ? "-" : `${latestScore}%`}</p>
                <div className={styles.statMeta}>
                  <span className={scoreClass(latestScore)}>{latestScore === null ? "Waiting for metrics" : "Session score"}</span>
                  <span className={styles.statContext}>Difficulty {data?.trainee.difficulty ?? "-"}</span>
                </div>
              </article>

              <article className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Latest Session</span>
                  <span className={styles.metricPill}>Status</span>
                </div>
                <p className={styles.statValue}>{data?.latestSession?.status ?? "no sessions"}</p>
                <div className={styles.statMeta}>
                  <span className={styles.statContext}>Started {formatDateTime(data?.latestSession?.startedAt ?? null)}</span>
                  <span className={styles.statContext}>Ended {formatDateTime(data?.latestSession?.endedAt ?? null)}</span>
                </div>
              </article>

              <article className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Latest Summary</span>
                  <span className={styles.metricPill}>Outcome</span>
                </div>
                <p className={styles.statValue}>{latestOutcomeLabel}</p>
                <div className={styles.statMeta}>
                  <span className={styles.statContext}>{latestSummary}</span>
                </div>
              </article>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>Latest Session Rebuttal Scores</h2>
              {data?.latestSession && data.latestRebuttals.length === 0 ? (
                <p className={styles.disclaimer}>No scored rebuttals yet for the latest session.</p>
              ) : null}
              {!data?.latestSession ? <p className={styles.disclaimer}>No completed sessions yet.</p> : null}
              {data?.latestRebuttals.length ? (
                <div className={styles.tableWrap}>
                  <div className={styles.tableHeader}>
                    <span>Time</span>
                    <span>Expected</span>
                    <span>Score</span>
                    <span>Grade</span>
                    <span>Tone</span>
                  </div>
                  {data.latestRebuttals.map((rebuttal, index) => (
                    <div className={styles.tableRow} key={`${rebuttal.createdAt ?? "row"}_${index}`}>
                      <span>{formatDateTime(rebuttal.createdAt)}</span>
                      <span>{rebuttal.expectedType ?? rebuttal.objectionId ?? "-"}</span>
                      <span className={scoreClass(rebuttal.score)}>{`${rebuttal.score}%`}</span>
                      <span>{rebuttal.grade}</span>
                      <span>{rebuttal.tone ?? "-"}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className={styles.panel} id="session-history">
              <h2 className={styles.sectionTitle}>Session History</h2>
              {data?.history.length === 0 ? <p className={styles.disclaimer}>No completed sessions yet.</p> : null}
              {data?.history.length ? (
                <div className={styles.historyGrid}>
                  {data.history.map((session) => (
                    <article className={styles.historyCard} key={session.sessionKey}>
                      <div className={styles.statHeader}>
                        <span className={styles.statTitle}>{`${session.difficulty} | ${session.status}`}</span>
                        <span className={styles.metricPill}>{session.metrics?.eventType ?? "Session"}</span>
                      </div>
                      <p className={styles.statValue}>
                        {session.metrics?.score ?? session.structuredOutcome?.rebuttalPerformanceScore ?? "-"}
                      </p>
                      <div className={styles.statMeta}>
                        <span className={styles.statContext}>Started {formatDateTime(session.startedAt)}</span>
                        <span className={styles.statContext}>Duration {formatDuration(session.metrics?.durationSeconds ?? null)}</span>
                      </div>
                      <p className={styles.disclaimer}>{session.structuredOutcome?.callSummary ?? "No coach summary yet."}</p>
                      <p className={styles.disclaimer}>
                        {session.selectedObjections.map((row) => `${row.order + 1}. ${row.text}`).join(" | ")}
                      </p>
                      <div className={styles.historyActions}>
                        {session.recordingUrl ? (
                          <a className={styles.secondaryButton} href={session.recordingUrl} target="_blank" rel="noreferrer">
                            Recording
                          </a>
                        ) : null}
                        {session.transcriptUrl ? (
                          <a className={styles.secondaryButton} href={session.transcriptUrl} target="_blank" rel="noreferrer">
                            Transcript
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
