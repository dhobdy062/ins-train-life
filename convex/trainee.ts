import { v } from "convex/values";
import { query } from "./_generated/server";

// Get trainee dashboard data
export const getTraineeDashboard = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get calls for the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentCalls = await ctx.db
      .query("calls")
      .withIndex("by_agent_date", (q) => 
        q.eq("agentId", args.userId).gte("callDate", thirtyDaysAgo)
      )
      .collect();

    // Calculate personal metrics
    const totalCalls = recentCalls.length;
    const avgScore = totalCalls > 0 
      ? Math.round(recentCalls.reduce((sum, call) => sum + call.score, 0) / totalCalls)
      : 0;
    
    const successfulCalls = recentCalls.filter(call => call.score >= 80).length;
    const closeRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

    // Get badges earned
    const userBadges = await ctx.db
      .query("userBadges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const badgeDetails = await Promise.all(
      userBadges.map(ub => ctx.db.get(ub.badgeId))
    );

    // Calculate current streak
    let currentStreak = 0;
    const sortedCalls = recentCalls.sort((a, b) => b.callDate - a.callDate);
    for (const call of sortedCalls) {
      if (call.score >= 80) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Get recent call history
    const callHistory = sortedCalls.slice(0, 10).map(call => ({
      date: call.callDate,
      difficulty: call.difficultyLevel,
      score: call.score,
      result: call.result,
      duration: call.duration,
      coachNotes: call.coachNotes,
    }));

    // Get team rank (based on avg score this month)
    const teamMembers = await ctx.db
      .query("users")
      .withIndex("by_team", (q) => q.eq("teamId", user.teamId))
      .collect();

    const teamScores = await Promise.all(
      teamMembers.map(async member => {
        const memberCalls = await ctx.db
          .query("calls")
          .withIndex("by_agent_date", (q) => 
            q.eq("agentId", member._id).gte("callDate", thirtyDaysAgo)
          )
          .collect();
        
        const memberAvgScore = memberCalls.length > 0
          ? memberCalls.reduce((sum, call) => sum + call.score, 0) / memberCalls.length
          : 0;

        return { userId: member._id, avgScore: memberAvgScore };
      })
    );

    const sortedTeam = teamScores.sort((a, b) => b.avgScore - a.avgScore);
    const rank = sortedTeam.findIndex(member => member.userId === args.userId) + 1;

    return {
      name: user.name,
      avatarUrl: user.avatarUrl,
      level: getAgentLevel(totalCalls),
      teamRank: `${rank}/${teamMembers.length}`,
      stats: {
        avgCloseRate: closeRate,
        avgCallScore: avgScore,
        totalTrainingCalls: totalCalls,
        currentStreak,
      },
      badges: badgeDetails.map(badge => ({
        name: badge?.name,
        description: badge?.description,
        icon: badge?.icon,
      })),
      recentActivity: callHistory,
      weeklyProgress: getWeeklyProgress(recentCalls),
    };
  },
});

// Helper to get agent level
function getAgentLevel(callCount: number) {
  if (callCount >= 50) return "D5";
  if (callCount >= 30) return "D4";
  if (callCount >= 15) return "D3";
  if (callCount >= 8) return "D2";
  return "D1";
}

// Helper to calculate weekly progress
function getWeeklyProgress(calls: any[]) {
  const weeklyProgress = {
    calls: [0, 0, 0, 0],
    scores: [0, 0, 0, 0],
  };

  const now = Date.now();

  calls.forEach(call => {
    const weekIndex = Math.floor((now - call.callDate) / (7 * 24 * 60 * 60 * 1000));
    if (weekIndex < 4) {
      weeklyProgress.calls[3 - weekIndex]++;
      weeklyProgress.scores[3 - weekIndex] += call.score;
    }
  });

  // Calculate average score for each week
  for (let i = 0; i < 4; i++) {
    if (weeklyProgress.calls[i] > 0) {
      weeklyProgress.scores[i] = Math.round(weeklyProgress.scores[i] / weeklyProgress.calls[i]);
    }
  }

  return weeklyProgress;
}