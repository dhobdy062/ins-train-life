"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./TrainerDashboard.module.css";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

interface Trainee {
  id: string;
  name: string;
  email: string;
  level: string;
  avgScore: number;
  callsThisLevel: number;
  hardStops: number;
  hardStopRate: number;
  objectionSuccessRate: number;
  appointmentSetRate: number;
  recommendation: string;
  focusArea: string;
  status: string;
  latestScore: number | null;
  latestSessionStatus: string | null;
  latestSessionAt: number | null;
}

type EntitlementMode = "paid" | "trial" | "blocked";

interface TrainerDashboardProps {
  teamSnapshot: {
    hasData: boolean;
    totalAgents: number;
    avgScore: number;
    atD3Plus: number;
    hardStopRate: number;
    trainees: Array<Trainee>;
  };
  selectedAgent: Trainee | null;
  accessLabel: string;
  planDisplayLabel: string;
  planStatusLabel?: string;
  isBlocked: boolean;
  minutesUsed: number;
  minutesLimit?: number | null;
  minutesRemaining?: number;
  defaultTab: string;
  entitlementMode: EntitlementMode;
}

type CreateTraineeApiResponse = {
  ok?: boolean;
  error?: string;
  trainingUrl?: string;
};

function formatTimestamp(timestamp: number | null) {
  if (!timestamp) {
    return "No sessions yet";
  }
  return new Date(timestamp).toLocaleString();
}

const TrainerDashboard: React.FC<TrainerDashboardProps> = ({
  teamSnapshot,
  selectedAgent,
  accessLabel,
  planDisplayLabel,
  planStatusLabel,
  isBlocked,
  minutesUsed,
  minutesLimit,
  minutesRemaining,
  defaultTab,
  entitlementMode,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(defaultTab || "team");
  const [billingError, setBillingError] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [isSubmittingTrainee, setIsSubmittingTrainee] = useState(false);
  const [traineeStatus, setTraineeStatus] = useState<string | null>(null);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [traineeForm, setTraineeForm] = useState({
    name: "",
    email: "",
    difficultyLevel: "D2",
    numObjections: 3,
  });

  async function openBillingPortal() {
    try {
      setBillingError(null);
      setOpeningPortal(true);
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to open billing settings.");
      }
      window.location.href = payload.url;
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to open billing settings.");
    } finally {
      setOpeningPortal(false);
    }
  }

  async function handleAddTrainee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingTrainee(true);
    setTraineeStatus(null);
    setLatestInviteUrl(null);

    try {
      const response = await fetch("/api/trainer/trainees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(traineeForm),
      });

      const payload = (await response.json().catch(() => ({}))) as CreateTraineeApiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to create trainee.");
      }

      setTraineeStatus("Trainee created and invitation sent.");
      setLatestInviteUrl(payload.trainingUrl ?? null);
      setTraineeForm({
        name: "",
        email: "",
        difficultyLevel: "D2",
        numObjections: 3,
      });
      router.refresh();
    } catch (error) {
      setTraineeStatus(error instanceof Error ? error.message : "Unable to create trainee.");
    } finally {
      setIsSubmittingTrainee(false);
    }
  }

  const trialDescription =
    entitlementMode === "trial" || entitlementMode === "blocked"
      ? "Trial accounts have a shared usage cap and can practice until the included trial minutes are used."
      : "";
  const paidDescription =
    entitlementMode === "paid"
      ? "Paid accounts have an active Stripe subscription and can manage upgrades or downgrades in billing settings."
      : "";

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span>CREAM</span>
        </div>
        <nav className={styles.sidebarNav}>
          <ul>
            <li>
              <a
                href="#"
                className={activeTab === "team" ? styles.active : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("team");
                }}
              >
                Team Overview
              </a>
            </li>
            <li>
              <a
                href="#"
                className={activeTab === "practice" ? styles.active : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("practice");
                }}
              >
                Practice Console
              </a>
            </li>
            <li>
              <a
                href="#"
                className={activeTab === "settings" ? styles.active : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("settings");
                }}
              >
                Account Settings
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>Trainer Dashboard</h1>
            <p>Monitor your team&apos;s progress and performance metrics.</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.userInfo}>
              <SignedIn>
                <div className={styles.plan}>{planDisplayLabel}</div>
                <div className={styles.planSub}>{planStatusLabel ?? accessLabel}</div>
              </SignedIn>
            </div>
            <button className={styles.btn} type="button" onClick={() => router.refresh()}>
              Refresh
            </button>
            <div className={styles.authWrapper}>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className={styles.btn}>Sign In</button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          {isBlocked && (
            <div style={{ backgroundColor: "#fee2e2", border: "1px solid #ef4444", padding: "16px", borderRadius: "8px", marginBottom: "24px", color: "#991b1b" }}>
              <strong>Upgrade Needed:</strong> Your team has reached the trial limit. Please upgrade to continue training.
            </div>
          )}

          {activeTab === "settings" ? (
            <section className={styles.billingSection}>
              <h2>Account & Billing</h2>
              <p>
                Trial vs paid access is determined by subscription status. Trial orgs are capped by trial minutes, while paid orgs have an active Stripe subscription.
              </p>
              {trialDescription ? <p className={styles.billingNote}>{trialDescription}</p> : null}
              {paidDescription ? <p className={styles.billingNote}>{paidDescription}</p> : null}
              <div className={styles.billingActions}>
                <a className={styles.btn} href="/checkout/start?plan=starter&interval=monthly">Start paid plan (Starter)</a>
                <a className={styles.btn} href="/checkout/start?plan=pro&interval=monthly">Choose Pro</a>
                <a className={styles.btn} href="/checkout/start?plan=agency&interval=monthly">Choose Agency</a>
                <button className={styles.btn} type="button" onClick={openBillingPortal} disabled={openingPortal}>
                  {openingPortal ? "Opening billing..." : "Manage paid plan (upgrade/downgrade)"}
                </button>
              </div>
              {billingError ? <p className={styles.billingError}>{billingError}</p> : null}
            </section>
          ) : (
            <>
              <div
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  marginBottom: "24px",
                }}
              >
                <h3 style={{ marginTop: 0, color: "var(--primary-dark)" }}>Add Trainee</h3>
                <form
                  onSubmit={handleAddTrainee}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1.2fr 0.8fr 0.8fr auto",
                    gap: "10px",
                    alignItems: "end",
                  }}
                >
                  <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#666" }}>
                    Name
                    <input
                      required
                      value={traineeForm.name}
                      onChange={(event) => setTraineeForm((previous) => ({ ...previous, name: event.target.value }))}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 10px" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#666" }}>
                    Email
                    <input
                      required
                      type="email"
                      value={traineeForm.email}
                      onChange={(event) => setTraineeForm((previous) => ({ ...previous, email: event.target.value }))}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 10px" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#666" }}>
                    Difficulty
                    <select
                      value={traineeForm.difficultyLevel}
                      onChange={(event) =>
                        setTraineeForm((previous) => ({ ...previous, difficultyLevel: event.target.value }))
                      }
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 10px" }}
                    >
                      <option value="D1">D1</option>
                      <option value="D2">D2</option>
                      <option value="D3">D3</option>
                      <option value="D4">D4</option>
                      <option value="D5">D5</option>
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#666" }}>
                    Objections
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={traineeForm.numObjections}
                      onChange={(event) =>
                        setTraineeForm((previous) => ({
                          ...previous,
                          numObjections: Number(event.target.value),
                        }))
                      }
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 10px" }}
                    />
                  </label>
                  <button className={styles.btn} type="submit" disabled={isSubmittingTrainee}>
                    {isSubmittingTrainee ? "Adding..." : "+ Add Trainee"}
                  </button>
                </form>
                <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#666" }}>
                  IP is captured after trainee consent from their invite link.
                </p>
                {traineeStatus ? <p style={{ margin: "8px 0 0", fontSize: "13px" }}>{traineeStatus}</p> : null}
                {latestInviteUrl ? (
                  <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#555" }}>
                    Invite link: <a href={latestInviteUrl}>{latestInviteUrl}</a>
                  </p>
                ) : null}
                <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#555" }}>
                  Dashboard reads live data from trainees, sessions, metrics, and rebuttal responses.
                </p>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Avg Team Score</span>
                    <span className={styles.statIcon}>📊</span>
                  </div>
                  <div className={styles.statValue}>{teamSnapshot.avgScore}%</div>
                  <div className={styles.statProgress}>
                    <div className={styles.statProgressFill} style={{ width: `${teamSnapshot.avgScore}%` }}></div>
                  </div>
                  <div className={styles.statMeta}>Across all trainees</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>At D3+ Level</span>
                    <span className={styles.statIcon}>🏆</span>
                  </div>
                  <div className={styles.statValue}>{teamSnapshot.atD3Plus}</div>
                  <div className={styles.statMeta}>Agents at advanced level</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Minutes Remaining</span>
                    <span className={styles.statIcon}>⏱️</span>
                  </div>
                  <div className={styles.statValue}>{minutesRemaining ?? "Unlimited"}</div>
                  <div className={styles.statMeta}>
                    {minutesUsed} minutes used {minutesLimit ? `/ ${minutesLimit}` : ""}
                  </div>
                  <div className={styles.planMeta}>Current plan: {planDisplayLabel}</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <span className={styles.statLabel}>Hard Stop Rate</span>
                    <span className={styles.statIcon}>⚠️</span>
                  </div>
                  <div className={styles.statValue}>{teamSnapshot.hardStopRate}%</div>
                  <div className={styles.statMeta}>Target: &lt; 5%</div>
                </div>
              </div>

              {selectedAgent && (
                <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "2px solid var(--border)", marginBottom: "40px" }}>
                  <h3 style={{ color: "var(--primary-dark)", marginBottom: "16px" }}>Focus: {selectedAgent.name}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "20px" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#999" }}>Recommendation</div>
                      <div style={{ fontWeight: "600" }}>{selectedAgent.recommendation}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#999" }}>Focus Area</div>
                      <div style={{ fontWeight: "600" }}>{selectedAgent.focusArea}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#999" }}>Appt. Rate</div>
                      <div style={{ fontWeight: "600" }}>{selectedAgent.appointmentSetRate}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#999" }}>Most Recent Session</div>
                      <div style={{ fontWeight: "600" }}>{formatTimestamp(selectedAgent.latestSessionAt)}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.sectionHeader}>
                <h2>Team Roster</h2>
              </div>
              <div className={styles.tableContainer}>
                {teamSnapshot.trainees.length === 0 ? (
                  <p style={{ padding: "16px 0", color: "#666" }}>
                    No trainees yet. Add a trainee above to start collecting Vapi training results.
                  </p>
                ) : null}
                <table>
                  <thead>
                    <tr>
                      <th>Agent Name</th>
                      <th>Level</th>
                      <th>Avg Score</th>
                      <th>Latest Score</th>
                      <th>Latest Session</th>
                      <th>Appt. Rate</th>
                      <th>Hard Stops</th>
                      <th>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamSnapshot.trainees.map((member) => (
                      <tr key={member.id} style={selectedAgent?.id === member.id ? { backgroundColor: "#fffaf0" } : {}}>
                        <td>
                          <div className={styles.agentName}>{member.name}</div>
                          <div style={{ fontSize: "11px", color: "#999" }}>{member.email}</div>
                        </td>
                        <td>{member.level}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span>{member.avgScore}%</span>
                            <div className={styles.scoreBar}>
                              <div className={styles.scoreBarFill} style={{ width: `${member.avgScore}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td>{member.latestScore === null ? "-" : `${member.latestScore}%`}</td>
                        <td>
                          <div>{formatTimestamp(member.latestSessionAt)}</div>
                          <div style={{ fontSize: "11px", color: "#999" }}>{member.latestSessionStatus ?? "no_session"}</div>
                        </td>
                        <td>{member.appointmentSetRate}%</td>
                        <td>
                          <span className={`${styles.badge} ${member.hardStopRate > 10 ? styles.inactive : styles.active}`}>
                            {member.hardStopRate}%
                          </span>
                        </td>
                        <td style={{ fontSize: "12px" }}>{member.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TrainerDashboard;
