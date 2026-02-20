import React from 'react';
import styles from './TrainerDashboard.module.css';

const TrainerDashboard = ({ 
    teamSnapshot,
    selectedAgent,
    accessLabel,
    isPaid,
    isBlocked,
    minutesUsed,
    minutesLimit,
    minutesRemaining,
    canOpenDashboard,
    defaultTab,
    entitlement
}) => {
    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    Cream No Sugar
                </div>
                <ul className={styles.sidebarNav}>
                    <li><a href="#" className={styles.active}>Dashboard</a></li>
                    <li><a href="#">Trainees</a></li>
                    <li><a href="#">Training Plans</a></li>
                    <li><a href="#">Analytics</a></li>
                    <li><a href="#">Settings</a></li>
                </ul>
            </aside>

            <main className={styles.main}>
                <header className={styles.header}>
                    <div className={styles.headerTitle}>
                        <h1>Welcome Back, {selectedAgent?.name}!</h1>
                        <p>Here's your team's performance overview.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.userInfo}>
                            <div className={styles.name}>{selectedAgent?.name}</div>
                            <div className={styles.plan}>{accessLabel}</div>
                        </div>
                        <div className={styles.avatar}>{selectedAgent?.name?.charAt(0)}</div>
                    </div>
                </header>

                <div className={styles.content}>
                    <div className={styles.statsGrid}>
                        <div className={`${styles.statCard} ${styles.success}`}>
                            <div className={styles.statHeader}>
                                <span className={styles.statLabel}>Active Trainees</span>
                                <span className={styles.statIcon}>👥</span>
                            </div>
                            <div className={styles.statValue}>{teamSnapshot.totalAgents}</div>
                            <div className={styles.statMeta}></div>
                        </div>

                        <div className={`${styles.statCard} ${styles.warning}`}>
                            <div className={styles.statHeader}>
                                <span className={styles.statLabel}>Avg. Score</span>
                                <span className={styles.statIcon}>🎯</span>
                            </div>
                            <div className={styles.statValue}>{teamSnapshot.avgScore}%</div>
                             <div className={styles.statMeta}></div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statHeader}>
                                <span className={styles.statLabel}>Hard Stop Rate</span>
                                <span className={styles.statIcon}>🚫</span>
                            </div>
                            <div className={styles.statValue}>{teamSnapshot.hardStopRate}%</div>
                            <div className={styles.statMeta}></div>
                        </div>
                    </div>

                    <div className={styles.sectionHeader}>
                        <h2>Trainee Leaderboard</h2>
                        <div className={styles.tabs}>
                            <button className={`${styles.tab} ${styles.active}`}>This Week</button>
                            <button className={styles.tab}>This Month</button>
                            <button className={styles.tab}>All Time</button>
                        </div>
                    </div>

                    <div className={styles.leaderboard}>
                        {teamSnapshot.trainees.map((trainee, index) => (
                            <div className={styles.leaderboardItem} key={trainee.id}>
                                <div className={`${styles.rank} ${index === 0 ? styles.gold : index === 1 ? styles.silver : index === 2 ? styles.bronze : ''}`}>{index + 1}</div>
                                <div className={styles.leaderboardAvatar}>{trainee.name.charAt(0)}</div>
                                <div className={styles.leaderboardInfo}>
                                    <div className={styles.leaderboardName}>{trainee.name}</div>
                                    <div className={styles.leaderboardStat}>Avg. Score: {trainee.avgScore}%</div>
                                </div>
                                <div className={styles.leaderboardScore}>{trainee.callsThisLevel} <span className={styles.scoreUnit}>calls</span></div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.sectionHeader}>
                        <h2>Achievements Unlocked</h2>
                        <button className={styles.btn}>View All Badges</button>
                    </div>

                    <div className={styles.badgeGrid}>
                        <div className={`${styles.badgeItem} ${styles.unlocked}`}>
                            <span className={styles.badgeIcon}>🔥</span>
                            <div className={styles.badgeName}>Hot Streak</div>
                            <div className={styles.badgeDesc}>5 wins in a row</div>
                            <div className={styles.badgeTooltip}>Unlocked by 8 trainees</div>
                        </div>
                        <div className={styles.badgeItem}>
                            <span className={styles.badgeIcon}>🎯</span>
                            <div className={styles.badgeName}>Bullseye</div>
                            <div className={styles.badgeDesc}>Score 95%+</div>
                            <div className={styles.badgeProgress}><div className={styles.badgeProgressFill} style={{width: '60%'}}></div></div>
                            <div className={styles.badgeTooltip}>6/10 trainees have this</div>
                        </div>
                        <div className={`${styles.badgeItem} ${styles.locked}`}>
                            <span className={styles.badgeIcon}>🔒</span>
                            <div className={styles.badgeName}>Master</div>
                            <div className={styles.badgeDesc}>Master a level</div>
                            <div className={styles.badgeTooltip}>Locked</div>
                        </div>
                        <div className={styles.badgeItem}>
                            <span className={styles.badgeIcon}>⭐</span>
                            <div className={styles.badgeName}>Rising Star</div>
                            <div className={styles.badgeDesc}>Top of leaderboard</div>
                            <div className={styles.badgeProgress}><div className={styles.badgeProgressFill} style={{width: '80%'}}></div></div>
                            <div className={styles.badgeTooltip}>Michael Johnson currently holds this</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TrainerDashboard;
