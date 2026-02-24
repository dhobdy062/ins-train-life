"use client";

import React, { useState } from 'react';
import styles from '../../components/dashboards/TrainerDashboard.module.css';

// Mock data from the original page
const SAMPLE_TEAM_SNAPSHOT = {
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

export default function DashboardPreview() {
  const [activeTab, setActiveTab] = useState('team');
  const teamSnapshot = SAMPLE_TEAM_SNAPSHOT;
  const selectedAgent = teamSnapshot.trainees[0];
  const accessLabel = "Trial mode";
  const minutesUsed = 45;
  const minutesLimit = 100;
  const minutesRemaining = 55;

  return (
    <div className={styles.container} style={{ minHeight: '100vh' }}>
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
              <div className={styles.plan}>{accessLabel}</div>
            </div>
            <div className={styles.authWrapper}>
              <button className={styles.btn}>Demo User</button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className={styles.content}>
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
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '40px' }}>
               <h3 style={{ color: '#1a365d', marginBottom: '16px' }}>Focus: {selectedAgent.name}</h3>
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
            <table className={styles.table}>
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
                  <tr key={member.id} style={selectedAgent?.id === member.id ? { backgroundColor: '#f8fafc' } : {}}>
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
}
