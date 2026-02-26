"use client";

import React, { useState } from "react";
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
  isBlocked: boolean;
  minutesUsed: number;
  minutesLimit?: number | null;
  minutesRemaining?: number;
  defaultTab: string;
  entitlementMode: EntitlementMode;
}

const TrainerDashboard: React.FC<TrainerDashboardProps> = ({
  teamSnapshot,
  selectedAgent,
  accessLabel,
  isBlocked,
  minutesUsed,
  minutesLimit,
  minutesRemaining,
  defaultTab,
  entitlementMode,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || "team");
  const [billingError, setBillingError] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

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
                <div className={styles.plan}>{accessLabel}</div>
              </SignedIn>
            </div>
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
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
                  </div>
                </div>
              )}

              <div className={styles.sectionHeader}>
                <h2>Team Roster</h2>
              </div>
              <div className={styles.tableContainer}>
                <table>
                  <thead>
                    <tr>
                      <th>Agent Name</th>
                      <th>Level</th>
                      <th>Avg Score</th>
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
