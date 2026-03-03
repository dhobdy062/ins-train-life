"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  history: Array<{
    sessionKey: string;
    startedAt: string | null;
    endedAt: string | null;
    status: string;
    assistantId: string;
    difficulty: string;
    objectionsRequired: number;
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
  inviteToken?: string | null;
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
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

function scoreClass(score: number | null) {
  if (score === null) {
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

export default function TraineeDashboard({ refreshOnLoad = false, inviteToken = null }: TraineeDashboardProps) {
  const [data, setData] = useState<TraineeResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (inviteToken) {
      params.set("inviteToken", inviteToken);
    }
    const query = params.toString();
    return query.length > 0 ? `?${query}` : "";
  }, [inviteToken]);

  const fetchResults = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch(`/api/trainee/results${queryString}`, {
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
        const message = caughtError instanceof Error ? caughtError.message : "Unable to load trainee results.";
        setError(message);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [queryString],
  );

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      if (!isActive) {
        return;
      }

      await fetchResults(false);

      if (refreshOnLoad && isActive) {
        await fetchResults(true);
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [fetchResults, refreshOnLoad]);

  const latestScore = data?.latestMetrics?.score ?? null;
  const latestSessionStatus = data?.latestSession?.status ?? "no_sessions";
  const rebuttalCount = data?.latestRebuttals.length ?? 0;

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>CREAM</div>
        <nav className={styles.sidebarNav}>
          <span className={`${styles.navItem} ${styles.active}`}>Dashboard</span>
          <Link href="/training/start" className={styles.navItem}>
            Training
          </Link>
        </nav>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>{data?.trainee.name ? `Welcome, ${data.trainee.name}` : "Trainee Dashboard"}</h1>
            <p>Live scoring from your latest training sessions.</p>
          </div>
          <div className={styles.headerProfile}>
            <button className={styles.ctaButton} onClick={() => void fetchResults(true)} disabled={refreshing || loading}>
              {refreshing ? "Refreshing..." : "Refresh Results"}
            </button>
          </div>
        </header>

        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Run another training call</h2>
          <p className={styles.ctaSubtitle}>Complete another session to update your objection-level scorecard.</p>
          <Link className={styles.ctaButton} href="/training/start">
            Start Training Call
          </Link>
        </div>

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
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Latest Score</span>
                </div>
                <p className={styles.statValue}>{latestScore === null ? "-" : `${latestScore}%`}</p>
                <div className={styles.statMeta}>
                  <span className={scoreClass(latestScore)}>{latestScore === null ? "Awaiting metrics" : "Session metric"}</span>
                  <span className={styles.statContext}>Difficulty {data?.trainee.difficulty ?? "-"}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Latest Session</span>
                </div>
                <p className={styles.statValue}>{latestSessionStatus}</p>
                <div className={styles.statMeta}>
                  <span className={styles.statContext}>Started {formatDateTime(data?.latestSession?.startedAt ?? null)}</span>
                  <span className={styles.statContext}>Ended {formatDateTime(data?.latestSession?.endedAt ?? null)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Latest Rebuttals</span>
                </div>
                <p className={styles.statValue}>{rebuttalCount}</p>
                <div className={styles.statMeta}>
                  <span className={styles.statContext}>Expected objections {data?.trainee.numObjections ?? "-"}</span>
                  <span className={styles.statContext}>Status {data?.trainee.status ?? "-"}</span>
                </div>
              </div>
            </div>

            <section className={styles.recentCallsSection}>
              <h2 className={styles.sectionTitle}>Latest Session Rebuttal Scores</h2>
              {data?.latestSession && data.latestRebuttals.length === 0 ? (
                <p>No scored rebuttals yet for the latest session.</p>
              ) : null}
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
              <h2 className={styles.sectionTitle}>Recent Sessions</h2>
              {data?.history.length === 0 ? <p>No completed sessions yet.</p> : null}
              {data?.history.length ? (
                <>
                  <div className={styles.tableHeader}>
                    <span>Started</span>
                    <span>Difficulty</span>
                    <span>Duration</span>
                    <span>Score</span>
                    <span>Status</span>
                  </div>
                  {data.history.map((session) => (
                    <div className={styles.tableRow} key={session.sessionKey}>
                      <span>{formatDateTime(session.startedAt)}</span>
                      <span>{session.difficulty}</span>
                      <span>{formatDuration(session.metrics?.durationSeconds ?? null)}</span>
                      <span className={scoreClass(session.metrics?.score ?? null)}>
                        {session.metrics?.score === null || session.metrics?.score === undefined
                          ? "-"
                          : `${session.metrics.score}%`}
                      </span>
                      <span>{session.status}</span>
                    </div>
                  ))}
                </>
              ) : null}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
