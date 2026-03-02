"use client";

import React from 'react';
import Link from "next/link";
import styles from './TraineeDashboard.module.css';
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

const TraineeDashboard = () => {
    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    CREAM
                </div>
                <nav className={styles.sidebarNav}>
                    <a href="#" className={`${styles.navItem} ${styles.active}`}>📊 Dashboard</a>
                    <a href="#" className={styles.navItem}>🎯 Training</a>
                    <a href="#" className={styles.navItem}>📞 Call History</a>
                    <a href="#" className={styles.navItem}>🏆 Leaderboards</a>
                    <a href="#" className={styles.navItem}>📚 Resources</a>
                </nav>
                <div className={styles.sidebarFooter}>
                    <a href="#" className={styles.navItem}>⚙️ Settings</a>
                    <a href="#" className={styles.navItem}>🚪 Logout</a>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Welcome Back!</h1>
                        <p className={styles.pageSubtitle}>Here&apos;s your performance summary. Keep up the great work!</p>
                    </div>
                    <div className={styles.headerProfile}>
                        <SignedIn>
                            <div className={styles.profileInfo}>
                                <span className={styles.profileStats}>2,450 Points | Tier 4</span>
                            </div>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className={styles.ctaButton} style={{ padding: '8px 16px', fontSize: '14px' }}>Sign In</button>
                            </SignInButton>
                        </SignedOut>
                    </div>
                </header>

                {/* CTA Card */}
                <div className={styles.ctaCard}>
                    <div className={styles.ctaContent}>
                        <h2 className={styles.ctaTitle}>Ready for Your Next Challenge?</h2>
                        <p className={styles.ctaSubtitle}>Start a new training call to sharpen your skills and climb the leaderboard.</p>
                        <Link className={styles.ctaButton} href="/training/start">
                            START TRAINING CALL
                        </Link>
                    </div>
                </div>

                {/* Streak Banner */}
                <div className={styles.streakBanner}>
                    <div className={styles.streakContent}>
                        <span className={styles.streakEmoji}>🔥</span>
                        <span className={styles.streakText}>You&apos;re on a <strong>5-day win streak!</strong> Your recent scores:</span>
                        <div className={styles.streakScores}>
                            <span className={styles.streakScore}>92</span>
                            <span className={styles.streakScore}>88</span>
                            <span className={styles.streakScore}>95</span>
                            <span className={styles.streakScore}>91</span>
                            <span className={styles.streakScore}>94</span>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Average Call Score</span>
                            <span className={styles.statIcon}>⭐</span>
                        </div>
                        <p className={styles.statValue}>91.5</p>
                        <div className={styles.statProgress}>
                            <div className={styles.statProgressBar} style={{width: '91.5%'}}></div>
                        </div>
                        <div className={styles.statMeta}>
                            <span className={`${styles.statChange} ${styles.positive}`}>+3.2 vs last week</span>
                            <span className={styles.statContext}>Top 15% of agents</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Total Training Calls</span>
                            <span className={styles.statIcon}>📞</span>
                        </div>
                        <p className={styles.statValue}>487</p>
                        <div className={styles.statProgress}>
                            <div className={styles.statProgressBar} style={{width: '75%'}}></div>
                        </div>
                        <div className={styles.statMeta}>
                            <span className={`${styles.statChange} ${styles.positive}`}>+12 this week</span>
                            <span className={styles.statContext}>Tier 4 Active</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Badges Earned</span>
                            <span className={styles.statIcon}>🏅</span>
                        </div>
                        <p className={styles.statValue}>12</p>
                        <div className={styles.statProgress}>
                            <div className={styles.statProgressBar} style={{width: '60%'}}></div>
                        </div>
                        <div className={styles.statMeta}>
                            <span className={`${styles.statChange} ${styles.positive}`}>+2 new badges</span>
                            <span className={styles.statContext}>Pro Level</span>
                        </div>
                    </div>
                </div>

                 {/* Detailed Progress Bars */}
                 <section className={styles.progressSection}>
                    <h2 className={styles.sectionTitle}>Skill Development</h2>
                    <div className={styles.progressItem}>
                        <div className={styles.progressHeader}>
                            <span className={styles.progressLabel}>Opening & Rapport</span>
                            <span className={styles.progressValue}>92%</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressBarFill} style={{width: '92%', backgroundColor: 'var(--success)'}}></div>
                        </div>
                        <p className={styles.progressContext}>Next milestone: Mastered at 95%</p>
                    </div>
                    <div className={styles.progressItem}>
                        <div className={styles.progressHeader}>
                            <span className={styles.progressLabel}>Objection Handling</span>
                            <span className={styles.progressValue}>85%</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressBarFill} style={{width: '85%', backgroundColor: 'var(--warning)'}}></div>
                        </div>
                        <p className={styles.progressContext}>Next milestone: Advanced at 90%</p>
                    </div>
                </section>

                {/* Recent Training Calls */}
                <section className={styles.recentCallsSection}>
                    <h2 className={styles.sectionTitle}>Recent Training Calls</h2>
                    <div className={styles.callsTable}>
                        <div className={styles.tableHeader}>
                            <span>Date</span>
                            <span>Level</span>
                            <span>Objection</span>
                            <span>Score</span>
                            <span>Result</span>
                        </div>
                        <div className={styles.tableRow}>
                            <span>Feb 13, 8:34 AM</span>
                            <span>D3</span>
                            <span>Already Covered</span>
                            <span className={styles.scoreExcellent}>92%</span>
                            <span className={styles.resultExcellent}>Excellent</span>
                        </div>
                        <div className={styles.tableRow}>
                            <span>Feb 13, 7:12 AM</span>
                            <span>D3</span>
                            <span>Spouse Decision</span>
                            <span className={styles.scoreGood}>88%</span>
                            <span className={styles.resultGood}>Good</span>
                        </div>
                        <div className={styles.tableRow}>
                            <span>Feb 12, 2:45 PM</span>
                            <span>D2</span>
                            <span>Not Interested</span>
                            <span className={styles.scoreExcellent}>91%</span>
                            <span className={styles.resultExcellent}>Excellent</span>
                        </div>
                    </div>
                </section>

                {/* Coach Feedback */}
                <section className={styles.coachFeedbackSection}>
                    <h2 className={styles.sectionTitle}>Latest Coach Feedback</h2>
                    <div className={styles.feedbackCard}>
                        <div className={styles.feedbackHeader}>
                            <div className={styles.feedbackMeta}>
                                <span className={styles.feedbackFrom}>From: Sarah Johnson (Your Trainer)</span>
                                <span className={styles.feedbackDate}>Date: Feb 13, 8:45 AM</span>
                            </div>
                        </div>
                        <div className={styles.feedbackContent}>
                            <p>Alex, fantastic work on your last D3 call! That 92% score on the &quot;Already Covered&quot; objection was masterful. Your confidence and clarity really showed through. Keep focusing on that same energy for the &quot;Spouse Decision&quot; objection - you&apos;re close to mastering it!</p>
                        </div>
                        <div className={styles.feedbackActions}>
                            <button className={styles.feedbackButton}>Reply to Feedback</button>
                            <button className={styles.feedbackButton}>Mark as Read</button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default TraineeDashboard;
