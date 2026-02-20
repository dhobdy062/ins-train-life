'''
import React from 'react';
import styles from './Cream_No_Sugar_Trainer_Dashboard.module.css';

const TrainerDashboard = () => {
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
                        <h1>Welcome Back, Sarah!</h1>
                        <p>Here's your team's performance overview.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.userInfo}>
                            <div className={styles.name}>Sarah Johnson</div>
                            <div className={styles.plan}>Pro Plan</div>
                        </div>
                        <div className={styles.avatar}>SJ</div>
                    </div>
                </header>

                <div className={styles.content}>
                    <div className={styles.statsGrid}>
                        <div className={`${styles.statCard} ${styles.success}`}>
                            <div className={styles.statHeader}>
                                <span className={styles.statLabel}>Active Trainees</span>
                                <span className={styles.statIcon}>👥</span>
                            </div>
                            <div className={styles.statValue}>18</div>
                            <div className={styles.statChange} >
                                +2 this month
                            </div>
                            <div className={styles.statMeta}>vs. last month</div>
                        </div>

                        <div className={`${styles.statCard} ${styles.warning}`}>
                            <div className={styles.statHeader}>
                                <span className={styles.statLabel}>Avg. Score</span>
                                <span className={styles.statIcon}>🎯</span>
                            </div>
                            <div className={styles.statValue}>82%</div>
                            <div className={styles.statChange} >
                                -3% this week
                            </div>
                            <div className={styles.statMeta}>vs. last week</div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statHeader}>
                                <span className={styles.statLabel}>Calls Reviewed</span>
                                <span className={styles.statIcon}>🎧</span>
                            </div>
                            <div className={styles.statValue}>124</div>
                            <div className={styles.statProgress}>
                                <div className={styles.statProgressFill} style={{width: '78%'}}></div>
                            </div>
                            <div className={styles.statMeta}>78% of weekly goal</div>
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
                        <div className={styles.leaderboardItem}>
                            <div className={`${styles.rank} ${styles.gold}`}>1</div>
                            <div className={styles.leaderboardAvatar}>MJ</div>
                            <div className={styles.leaderboardInfo}>
                                <div className={styles.leaderboardName}>Michael Johnson</div>
                                <div className={styles.leaderboardStat}>Avg. Score: 94%</div>
                            </div>
                            <div className={styles.leaderboardScore}>1,240 <span className={styles.scoreUnit}>pts</span></div>
                        </div>
                        <div className={styles.leaderboardItem}>
                            <div className={`${styles.rank} ${styles.silver}`}>2</div>
                            <div className={styles.leaderboardAvatar}>ED</div>
                            <div className={styles.leaderboardInfo}>
                                <div className={styles.leaderboardName}>Emily Davis</div>
                                <div className={styles.leaderboardStat}>Avg. Score: 91%</div>
                            </div>
                            <div className={styles.leaderboardScore}>1,180 <span className={styles.scoreUnit}>pts</span></div>
                        </div>
                        <div className={styles.leaderboardItem}>
                            <div className={`${styles.rank} ${styles.bronze}`}>3</div>
                            <div className={styles.leaderboardAvatar}>RW</div>
                            <div className={styles.leaderboardInfo}>
                                <div className={styles.leaderboardName}>Robert Williams</div>
                                <div className={styles.leaderboardStat}>Avg. Score: 89%</div>
                            </div>
                            <div className={styles.leaderboardScore}>1,150 <span className={styles.scoreUnit}>pts</span></div>
                        </div>
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
'''