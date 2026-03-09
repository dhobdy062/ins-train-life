"use client";

import Link from "next/link";
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

type TraineeDashboardProps = {
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

export default function TraineeDashboard({ refreshOnLoad = false }: TraineeDashboardProps) {
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

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>CREAM</div>
        <nav className={styles.sidebarNav}>
          <span className={`${styles.navItem} ${styles.active}`}>Dashboard</span>
          <span className={styles.navItem}>Assigned Sessions</span>
        </nav>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>{data?.trainee.name ? `Welcome, ${data.trainee.name}` : "Trainee Dashboard"}</h1>
            <p>Your trainer-assigned practice sessions and latest results.</p>
          </div>
          <div className={styles.headerProfile}>
            <button className={styles.ctaButton} onClick={() => void fetchResults(true)} disabled={refreshing || loading}>
              {refreshing ? "Refreshing..." : "Refresh Results"}
            </button>
          </div>
        </header>

        {loading ? (
          <section className={styles.progressSection}>
            <h2 className={styles.sectionTitle}>Loading results...</h2>
          </section>
        ) : null}

        {error ? (
          <section className={styles.progressSection}>
            <h2 className={styles.sectionTitle}>Unable to load results</h2>
            <p>{error}</p>
          </section>
        ) : null}

        {!loading && !error ? (
          <>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Pending Assigned Sessions</h2>
              <p className={styles.ctaSubtitle}>
                {data?.assignedSessions.length
                  ? `${data.assignedSessions.length} session${data.assignedSessions.length === 1 ? "" : "s"} ready to start.`
                  : "No pending sessions right now."}
              </p>
              {data?.assignedSessions.map((session) => (
                <div key={session.sessionKey} style={{ display: "grid", gap: 6, marginTop: 12 }}>
                  <strong>{session.difficulty} • {session.objectionsRequired} objections</strong>
                  <span>
                    {session.selectedObjections.map((row) => `${row.order + 1}. ${row.text}`).join(" | ")}
                  </span>
                  <Link className={styles.ctaButton} href={`/training/start?session=${encodeURIComponent(session.sessionKey)}`}>
                    Start Assigned Session
                  </Link>
                </div>
              ))}
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Latest Score</span>
                </div>
                <p className={styles.statValue}>{latestScore === null ? "-" : `${latestScore}%`}</p>
                <div className={styles.statMeta}>
                  <span className={scoreClass(latestScore)}>{latestScore === null ? "Awaiting metrics" : "Session score"}</span>
                  <span className={styles.statContext}>Difficulty {data?.trainee.difficulty ?? "-"}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Latest Session</span>
                </div>
                <p className={styles.statValue}>{data?.latestSession?.status ?? "no_sessions"}</p>
                <div className={styles.statMeta}>
                  <span className={styles.statContext}>Started {formatDateTime(data?.latestSession?.startedAt ?? null)}</span>
                  <span className={styles.statContext}>Ended {formatDateTime(data?.latestSession?.endedAt ?? null)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Latest Summary</span>
                </div>
                <p className={styles.statValue}>{data?.latestSession?.structuredOutcome?.appointmentSet ? "Booked" : "Open"}</p>
                <div className={styles.statMeta}>
                  <span className={styles.statContext}>{data?.latestSession?.structuredOutcome?.callSummary ?? "No summary yet."}</span>
                </div>
              </div>
            </div>

            <section className={styles.recentCallsSection}>
              <h2 className={styles.sectionTitle}>Latest Session Rebuttal Scores</h2>
              {data?.latestSession && data.latestRebuttals.length === 0 ? <p>No scored rebuttals yet for the latest session.</p> : null}
              {!data?.latestSession ? <p>No completed sessions yet.</p> : null}
              {data?.latestRebuttals.length ? (
                <>
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
                </>
              ) : null}
            </section>

            <section className={styles.coachFeedbackSection}>
              <h2 className={styles.sectionTitle}>Session History</h2>
              {data?.history.length === 0 ? <p>No completed sessions yet.</p> : null}
              {data?.history.length ? (
                <div style={{ display: "grid", gap: 16 }}>
                  {data.history.map((session) => (
                    <article className={styles.statCard} key={session.sessionKey}>
                      <div className={styles.statHeader}>
                        <span className={styles.statTitle}>{session.difficulty} • {session.status}</span>
                      </div>
                      <p className={styles.statValue}>{session.metrics?.score ?? session.structuredOutcome?.rebuttalPerformanceScore ?? "-"}</p>
                      <div className={styles.statMeta}>
                        <span className={styles.statContext}>Started {formatDateTime(session.startedAt)}</span>
                        <span className={styles.statContext}>Duration {formatDuration(session.metrics?.durationSeconds ?? null)}</span>
                      </div>
                      <p>{session.structuredOutcome?.callSummary ?? "No call summary yet."}</p>
                      <p>{session.selectedObjections.map((row) => `${row.order + 1}. ${row.text}`).join(" | ")}</p>
                      <div className={styles.headerProfile} style={{ justifyContent: "flex-start", gap: 12 }}>
                        {session.recordingUrl ? (
                          <a className={styles.ctaButton} href={session.recordingUrl} target="_blank" rel="noreferrer">
                            Recording
                          </a>
                        ) : null}
                        {session.transcriptUrl ? (
                          <a className={styles.ctaButton} href={session.transcriptUrl} target="_blank" rel="noreferrer">
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
