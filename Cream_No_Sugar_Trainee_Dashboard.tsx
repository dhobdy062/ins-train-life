import React from 'react';
import styles from './Cream_No_Sugar_Trainee_Dashboard.module.css';

const TraineeDashboard = () => {
    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    CREAM
                </div>
                <nav className={styles.sidebarNav}>
                    <a href="#" className={`${styles.navItem} ${styles.active}`}><i className="icon-dashboard"></i> Dashboard</a>
                    <a href="#" className={styles.navItem}><i className="icon-training"></i> Training</a>
                    <a href="#" className={styles.navItem}><i className="icon-history"></i> Call History</a>
                    <a href="#" className={styles.navItem}><i className="icon-leaderboard"></i> Leaderboards</a>
                    <a href="#" className={styles.navItem}><i className="icon-resources"></i> Resources</a>
                </nav>
                <div className={styles.sidebarFooter}>
                    <a href="#" className={styles.navItem}><i className="icon-settings"></i> Settings</a>
                    <a href="#" className={styles.navItem}><i className="icon-logout"></i> Logout</a>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Welcome Back, Alex!</h1>
                        <p className={styles.pageSubtitle}>Here&apos;s your performance summary. Keep up the great work!</p>
                    </div>
                    <div className={styles.headerProfile}>
                        <div className={styles.profileInfo}>
                            <span className={styles.profileName}>Alex Thompson</span>
                            <span className={styles.profileStats}>2,450 Points | Tier 4</span>
                        </div>
                        <img src="https://i.pravatar.cc/60?u=alex" alt="Alex Thompson" className={styles.profileAvatar} />
                    </div>
                </header>

                {/* CTA Card */}
                <div className={styles.ctaCard}>
                    <div className={styles.ctaContent}>
                        <h2 className={styles.ctaTitle}>Ready for Your Next Challenge?</h2>
                        <p className={styles.ctaSubtitle}>Start a new training call to sharpen your skills and climb the leaderboard.</p>
                        <button className={styles.ctaButton}>START TRAINING CALL</button>
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
                    {/* Repeat for each stat card */}
                    <div className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Average Call Score</span>
                            <i className={`${styles.statIcon} icon-star`}></i>
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
                    {/* ... other stat cards ... */}
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
                    {/* ... other progress items ... */}
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
                        <div className={styles.tableRow}>
                            <span>Feb 12, 10:20 AM</span>
                            <span>D3</span>
                            <span>Spouse Decision</span>
                            <span className={styles.scoreGood}>87%</span>
                            <span className={styles.resultGood}>Good</span>
                        </div>
                        <div className={styles.tableRow}>
                            <span>Feb 11, 3:30 PM</span>
                            <span>D2</span>
                            <span>Don&apos;t Remember</span>
                            <span className={styles.scoreExcellent}>90%</span>
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
                            <p>Mike, fantastic work on your last D3 call! That 92% score on the &quot;Already Covered&quot; objection was masterful. Your confidence and clarity really showed through. Keep focusing on that same energy for the &quot;Spouse Decision&quot; objection - you&apos;re close to mastering it!</p>
                        </div>
                        <div className={styles.feedbackActions}>
                            <button className={styles.feedbackButton}>Reply to Feedback</button>
                            <button className={styles.feedbackButton}>Mark as Read</button>
                        </div>
                    </div>
                </section>

                {/* Your Next Goals */}
                <section className={styles.goalsSection}>
                    <h2 className={styles.sectionTitle}>Your Next Goals</h2>
                    <div className={styles.goalsList}>
                        <div className={styles.goalItem}>
                            <div className={styles.goalHeader}>
                                <span className={styles.goalNumber}>1</span>
                                <span className={styles.goalTitle}>Master D3 Completely</span>
                            </div>
                            <p className={styles.goalDescription}>(6 more calls needed) You&apos;re at 72%. Get to 80% to unlock D4.</p>
                            <div className={styles.goalProgress}>
                                <div className={styles.goalProgressBar} style={{width: '72%'}}></div>
                            </div>
                        </div>
                        <div className={styles.goalItem}>
                            <div className={styles.goalHeader}>
                                <span className={styles.goalNumber}>2</span>
                                <span className={styles.goalTitle}>Fix &quot;Spouse Decision&quot; Objection</span>
                            </div>
                            <p className={styles.goalDescription}>(Currently 68%) This is holding you back. Practice 10 times this week.</p>
                            <div className={styles.goalProgress}>
                                <div className={styles.goalProgressBar} style={{width: '68%'}}></div>
                            </div>
                        </div>
                        <div className={styles.goalItem}>
                            <div className={styles.goalHeader}>
                                <span className={styles.goalNumber}>3</span>
                                <span className={styles.goalTitle}>Hit 70% Appointment Rate</span>
                            </div>
                            <p className={styles.goalDescription}>(Currently 62%) Set one more appointment in next 8 calls to unlock badge.</p>
                            <div className={styles.goalProgress}>
                                <div className={styles.goalProgressBar} style={{width: '62%'}}></div>
                            </div>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default TraineeDashboard;
