import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";

// Get main dashboard summary data
export const getDashboardSummary = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    // Get all active agents for this team
    const agents = await ctx.db
      .query("users")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const activeAgents = agents.filter(agent => agent.status === "Active");

    // Get calls for the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentCalls = await ctx.db
      .query("calls")
      .withIndex("by_team_date", (q) => 
        q.eq("teamId", args.teamId).gte("callDate", thirtyDaysAgo)
      )
      .collect();

    // Calculate team metrics
    const totalCalls = recentCalls.length;
    const avgScore = recentCalls.length > 0 
      ? Math.round(recentCalls.reduce((sum, call) => sum + call.score, 0) / recentCalls.length)
      : 0;

    // Calculate close rate (calls with score >= 80)
    const successfulCalls = recentCalls.filter(call => call.score >= 80).length;
    const closeRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

    // Get top performers (agents with most calls this week)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyCalls = await ctx.db
      .query("calls")
      .withIndex("by_team_date", (q) => 
        q.eq("teamId", args.teamId).gte("callDate", weekAgo)
      )
      .collect();

    // Group calls by agent and calculate performance
    const agentStats = activeAgents.map(agent => {
      const agentCalls = weeklyCalls.filter(call => call.agentId === agent._id);
      const agentAvgScore = agentCalls.length > 0
        ? Math.round(agentCalls.reduce((sum, call) => sum + call.score, 0) / agentCalls.length)
        : 0;

      return {
        id: agent._id,
        name: agent.name,
        calls: agentCalls.length,
        avgScore: agentAvgScore,
        status: agent.status,
        level: getAgentLevel(agentCalls),
        badges: [], // Will be populated separately
        thisWeek: agentCalls.length
      };
    });

    // Sort by calls made this week and take top 3
    const topPerformers = agentStats
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 3);

    // Get badges earned recently
    const recentBadges = await ctx.db
      .query("userBadges")
      .collect();

    const badgeCounts = recentBadges.reduce((acc, userBadge) => {
      const badge = acc[userBadge.badgeId] || 0;
      acc[userBadge.badgeId] = badge + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      teamName: team.orgName,
      plan: team.plan,
      stats: {
        teamCloseRate: closeRate,
        totalTrainingCalls: totalCalls,
        avgCallScore: avgScore,
        teamMinutesUsed: `${team.minutesUsed} / ${team.monthlyAllocation}`,
        minutesPercentage: Math.round((team.minutesUsed / team.monthlyAllocation) * 100)
      },
      topPerformers,
      teamMembers: agentStats,
      badgesEarned: badgeCounts
    };
  },
});

// Helper function to determine agent level based on calls
function getAgentLevel(calls: any[]) {
  if (calls.length >= 15) return "D3";
  if (calls.length >= 8) return "D2";
  return "D1";
}

// Get team performance metrics
export const getTeamPerformance = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    // Get calls for the last 60 days to compare month-over-month
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const allCalls = await ctx.db
      .query("calls")
      .withIndex("by_team_date", (q) => 
        q.eq("teamId", args.teamId).gte("callDate", sixtyDaysAgo)
      )
      .collect();

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const thisMonthCalls = allCalls.filter(call => call.callDate >= thirtyDaysAgo);
    const lastMonthCalls = allCalls.filter(call => call.callDate < thirtyDaysAgo);

    // Calculate month-over-month metrics
    const thisMonthTotal = thisMonthCalls.length;
    const lastMonthTotal = lastMonthCalls.length;
    const callGrowth = lastMonthTotal > 0 
      ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : 0;

    const thisMonthAvgScore = thisMonthCalls.length > 0
      ? Math.round(thisMonthCalls.reduce((sum, call) => sum + call.score, 0) / thisMonthCalls.length)
      : 0;

    const lastMonthAvgScore = lastMonthCalls.length > 0
      ? Math.round(lastMonthCalls.reduce((sum, call) => sum + call.score, 0) / lastMonthCalls.length)
      : 0;

    const scoreGrowth = lastMonthAvgScore > 0
      ? Math.round(((thisMonthAvgScore - lastMonthAvgScore) / lastMonthAvgScore) * 100)
      : 0;

    // Get agents and their performance
    const agents = await ctx.db
      .query("users")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const activeAgents = agents.filter(agent => agent.status === "Active");

    // Calculate score distribution by difficulty level
    const difficultyStats = {
      "D1": { calls: 0, totalScore: 0, agents: new Set() },
      "D2": { calls: 0, totalScore: 0, agents: new Set() },
      "D3": { calls: 0, totalScore: 0, agents: new Set() },
      "D4": { calls: 0, totalScore: 0, agents: new Set() },
      "D5": { calls: 0, totalScore: 0, agents: new Set() }
    };

    thisMonthCalls.forEach(call => {
      if (difficultyStats[call.difficultyLevel as keyof typeof difficultyStats]) {
        difficultyStats[call.difficultyLevel as keyof typeof difficultyStats].calls++;
        difficultyStats[call.difficultyLevel as keyof typeof difficultyStats].totalScore += call.score;
        difficultyStats[call.difficultyLevel as keyof typeof difficultyStats].agents.add(call.agentId);
      }
    });

    // Get objection handling performance
    const objections = thisMonthCalls.filter(call => call.objection);
    const objectionStats = objections.reduce((acc, call) => {
      const objection = call.objection!;
      if (!acc[objection]) {
        acc[objection] = { success: 0, total: 0 };
      }
      acc[objection].total++;
      if (call.score >= 75) {
        acc[objection].success++;
      }
      return acc;
    }, {} as Record<string, { success: number; total: number }>);

    // Calculate weekly trends
    const weeklyTrends = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = Date.now() - i * 7 * 24 * 60 * 60 * 1000;
      const weekCalls = thisMonthCalls.filter(call => 
        call.callDate >= weekStart && call.callDate < weekEnd
      );
      
      const weekAvgScore = weekCalls.length > 0
        ? Math.round(weekCalls.reduce((sum, call) => sum + call.score, 0) / weekCalls.length)
        : 0;

      weeklyTrends.push({
        week: `Week ${4 - i}`,
        avgScore: weekAvgScore,
        calls: weekCalls.length,
        activeAgents: new Set(weekCalls.map(call => call.agentId)).size
      });
    }

    return {
      overview: {
        thisMonth: {
          avgCloseRate: thisMonthAvgScore,
          avgCallScore: thisMonthAvgScore,
          totalCalls: thisMonthTotal,
          callsPerAgent: Math.round(thisMonthTotal / activeAgents.length),
          badgesEarned: 0, // Will calculate from badges
          agentsActive: activeAgents.length
        },
        lastMonth: {
          avgCloseRate: lastMonthAvgScore,
          avgCallScore: lastMonthAvgScore,
          totalCalls: lastMonthTotal,
          callsPerAgent: Math.round(lastMonthTotal / activeAgents.length),
          badgesEarned: 0,
          agentsActive: activeAgents.length
        },
        changes: {
          avgCloseRate: scoreGrowth,
          avgCallScore: scoreGrowth,
          totalCalls: callGrowth,
          callsPerAgent: callGrowth,
          badgesEarned: 0,
          agentsActive: 0
        }
      },
      difficultyPerformance: Object.entries(difficultyStats).map(([level, stats]) => ({
        level,
        avgScore: stats.calls > 0 ? Math.round(stats.totalScore / stats.calls) : 0,
        calls: stats.calls,
        agentsTrained: stats.agents.size
      })),
      topPerformers: activeAgents.map(agent => {
        const agentCalls = thisMonthCalls.filter(call => call.agentId === agent._id);
        const agentAvgScore = agentCalls.length > 0
          ? Math.round(agentCalls.reduce((sum, call) => sum + call.score, 0) / agentCalls.length)
          : 0;

        return {
          name: agent.name,
          avgScore: agentAvgScore,
          calls: agentCalls.length,
          badges: 0, // Will populate from badges
          streak: 0 // Will calculate from consecutive wins
        };
      }).sort((a, b) => b.avgScore - a.avgScore),
      objectionHandling: Object.entries(objectionStats).map(([objection, stats]) => ({
        objection,
        successRate: Math.round((stats.success / stats.total) * 100),
        totalAttempts: stats.total
      })),
      weeklyTrends
    };
  },
});

// Get leaderboard data
export const getLeaderboardData = query({
  args: { 
    teamId: v.id("teams"),
    timeframe: v.string() // "week", "month", "all-time"
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    // Get all agents for this team
    const agents = await ctx.db
      .query("users")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const activeAgents = agents.filter(agent => agent.status === "Active");

    // Determine time range based on timeframe
    let startDate = 0;
    const now = Date.now();
    
    switch (args.timeframe) {
      case "week":
        startDate = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startDate = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "all-time":
        startDate = 0;
        break;
      default:
        startDate = now - 7 * 24 * 60 * 60 * 1000;
    }

    // Get calls for the timeframe
    const calls = startDate > 0 
      ? await ctx.db
          .query("calls")
          .withIndex("by_team_date", (q) => 
            q.eq("teamId", args.teamId).gte("callDate", startDate)
          )
          .collect()
      : await ctx.db
          .query("calls")
          .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
          .collect();

    // Get all badges for the team
    const allUserBadges = await ctx.db
      .query("userBadges")
      .collect();

    // Calculate leaderboard data for each agent
    const leaderboardData = activeAgents.map(agent => {
      const agentCalls = calls.filter(call => call.agentId === agent._id);
      const agentAvgScore = agentCalls.length > 0
        ? Math.round(agentCalls.reduce((sum, call) => sum + call.score, 0) / agentCalls.length)
        : 0;

      const agentBadges = allUserBadges.filter(ub => ub.userId === agent._id);

      // Calculate current streak (consecutive calls with score >= 80)
      let currentStreak = 0;
      const sortedCalls = agentCalls.sort((a, b) => b.callDate - a.callDate);
      for (const call of sortedCalls) {
        if (call.score >= 80) {
          currentStreak++;
        } else {
          break;
        }
      }

      return {
        id: agent._id,
        name: agent.name,
        calls: agentCalls.length,
        avgScore: agentAvgScore,
        badges: agentBadges.length,
        streak: currentStreak,
        socialShares: 0 // Will implement later
      };
    });

    // Sort by different criteria for different views
    const sortedByCalls = [...leaderboardData].sort((a, b) => b.calls - a.calls);
    const sortedByScore = [...leaderboardData].sort((a, b) => b.avgScore - a.avgScore);
    const sortedByBadges = [...leaderboardData].sort((a, b) => b.badges - a.badges);

    return {
      timeframe: args.timeframe,
      byCalls: sortedByCalls,
      byScore: sortedByScore,
      byBadges: sortedByBadges,
      topStreaks: leaderboardData
        .filter(agent => agent.streak > 0)
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 5)
    };
  },
});