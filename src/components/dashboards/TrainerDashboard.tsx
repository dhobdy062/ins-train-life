"use client";

import React, { useState } from 'react';
import styles from './TrainerDashboard.module.css';

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
  isPaid: boolean;
  isBlocked: boolean;
  minutesUsed: number;
  minutesLimit?: number | null;
  minutesRemaining?: number;
  canOpenDashboard: boolean;
  defaultTab: string;
  entitlement?: Record<string, unknown> | null;
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
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || 'team');

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span>CREAM</span>
        </div>
        <nav className={styles.sidebarNav}>
          <ul>
            <li>
              <a 
                href="#" 
                className={activeTab === 'team' ? styles.active : ''} 
                onClick={(e) => { e.preventDefault(); setActiveTab('team'); }}
              >
                Team Overview
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className={activeTab === 'practice' ? styles.active : ''} 
                onClick={(e) => { e.preventDefault(); setActiveTab('practice'); }}
              >
                Practice Console
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>Trainer Dashboard</h1>
            <p>Monitor your team&apos;s progress and performance metrics.</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.userInfo}>
              <div className={styles.name}>Sarah Johnson</div>
              <div className={styles.plan}>{accessLabel}</div>
            </div>
            <div className={styles.avatar}>SJ</div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className={styles.content}>
          {isBlocked && (
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #ef4444', padding: '16px', borderRadius: '8px', marginBottom: '24px', color: '#991b1b' }}>
              <strong>Upgrade Needed:</strong> Your team has reached the trial limit. Please upgrade to continue training.
            </div>
          )}

          {/* Stats Grid */}
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
              <div className={styles.statValue}>{minutesRemaining ?? 'Unlimited'}</div>
              <div className={styles.statMeta}>{minutesUsed} minutes used {minutesLimit ? `/ ${minutesLimit}` : ''}</div>
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
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '2px solid var(--border)', marginBottom: '40px' }}>
               <h3 style={{ color: 'var(--primary-dark)', marginBottom: '16px' }}>Focus: {selectedAgent.name}</h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#999' }}>Recommendation</div>
                    <div style={{ fontWeight: '600' }}>{selectedAgent.recommendation}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#999' }}>Focus Area</div>
                    <div style={{ fontWeight: '600' }}>{selectedAgent.focusArea}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#999' }}>Appt. Rate</div>
                    <div style={{ fontWeight: '600' }}>{selectedAgent.appointmentSetRate}%</div>
                  </div>
               </div>
            </div>
          )}

          {/* Agent Table */}
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
                  <tr key={member.id} style={selectedAgent?.id === member.id ? { backgroundColor: '#fffaf0' } : {}}>
                    <td>
                      <div className={styles.agentName}>{member.name}</div>
                      <div style={{fontSize: '11px', color: '#999'}}>{member.email}</div>
                    </td>
                    <td>{member.level}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                    <td style={{fontSize: '12px'}}>{member.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TrainerDashboard;
