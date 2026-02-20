import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Create or update a call record from VAPI webhook
export const createOrUpdateCall = mutation({
  args: {
    agentId: v.id("users"),
    teamId: v.id("teams"),
    callDate: v.number(),
    score: v.number(),
    difficultyLevel: v.string(),
    objection: v.optional(v.string()),
    result: v.string(),
    duration: v.number(),
    transcript: v.optional(v.string()),
    feedback: v.optional(v.string()),
    coachNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if call already exists for this agent and date (within 1 hour)
    const existingCall = await ctx.db
      .query("calls")
      .withIndex("by_agent_date", (q) => 
        q.eq("agentId", args.agentId).gte("callDate", args.callDate - 3600000)
      )
      .first();

    if (existingCall) {
      // Update existing call
      return await ctx.db.patch(existingCall._id, {
        score: args.score,
        difficultyLevel: args.difficultyLevel,
        objection: args.objection,
        result: args.result,
        duration: args.duration,
        transcript: args.transcript,
        feedback: args.feedback,
        coachNotes: args.coachNotes,
      });
    } else {
      // Create new call
      return await ctx.db.insert("calls", {
        agentId: args.agentId,
        teamId: args.teamId,
        callDate: args.callDate,
        score: args.score,
        difficultyLevel: args.difficultyLevel,
        objection: args.objection,
        result: args.result,
        duration: args.duration,
        transcript: args.transcript,
        feedback: args.feedback,
        coachNotes: args.coachNotes,
      });
    }
  },
});

// Update team minutes usage
export const updateTeamMinutes = mutation({
  args: {
    teamId: v.id("teams"),
    minutesUsed: v.number(),
  },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    return await ctx.db.patch(args.teamId, {
      minutesUsed: args.minutesUsed,
    });
  },
});

// Add coach notes to a call
export const addCoachNotes = mutation({
  args: {
    callId: v.id("calls"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("Call not found");

    return await ctx.db.patch(args.callId, {
      coachNotes: args.notes,
    });
  },
});

// Award badge to user
export const awardBadge = mutation({
  args: {
    userId: v.id("users"),
    badgeId: v.id("badges"),
  },
  handler: async (ctx, args) => {
    // Check if badge already awarded
    const existingBadge = await ctx.db
      .query("userBadges")
      .withIndex("by_user_badge", (q) => 
        q.eq("userId", args.userId).eq("badgeId", args.badgeId)
      )
      .first();

    if (existingBadge) {
      return existingBadge;
    }

    // Award new badge
    return await ctx.db.insert("userBadges", {
      userId: args.userId,
      badgeId: args.badgeId,
      dateEarned: Date.now(),
    });
  },
});

// Create team
export const createTeam = mutation({
  args: {
    orgName: v.string(),
    plan: v.string(),
    seats: v.number(),
    monthlyAllocation: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("teams", {
      orgName: args.orgName,
      plan: args.plan,
      seats: args.seats,
      minutesUsed: 0,
      monthlyAllocation: args.monthlyAllocation,
    });
  },
});

// Create user
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.string(),
    teamId: v.id("teams"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      role: args.role,
      teamId: args.teamId,
      status: args.status,
    });
  },
});

// Create badge
export const createBadge = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("badges", {
      name: args.name,
      description: args.description,
      icon: args.icon,
    });
  },
});

// Update user status
export const updateUserStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    return await ctx.db.patch(args.userId, {
      status: args.status,
    });
  },
});

// Process VAPI webhook data
export const processVapiWebhook = mutation({
  args: {
    eventType: v.string(),
    data: v.object({
      callId: v.string(),
      agentId: v.string(),
      teamId: v.string(),
      score: v.number(),
      difficultyLevel: v.string(),
      objection: v.optional(v.string()),
      result: v.string(),
      duration: v.number(),
      transcript: v.optional(v.string()),
      feedback: v.optional(v.string()),
      minutesUsed: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { eventType, data } = args;

    switch (eventType) {
      case "call_completed":
        // Create or update call record
        const call = await ctx.runMutation(api.mutations.createOrUpdateCall, {
          agentId: data.agentId as any,
          teamId: data.teamId as any,
          callDate: Date.now(),
          score: data.score,
          difficultyLevel: data.difficultyLevel,
          objection: data.objection,
          result: data.result,
          duration: data.duration,
          transcript: data.transcript,
          feedback: data.feedback,
        });

        // Update team minutes
        await ctx.runMutation(api.mutations.updateTeamMinutes, {
          teamId: data.teamId as any,
          minutesUsed: data.minutesUsed,
        });

        // Check for badge awards based on score
        if (data.score >= 90) {
          // Award "Elite Closer" badge
          const eliteBadge = await ctx.db
            .query("badges")
            .withIndex("by_name", (q) => q.eq("name", "Elite Closer"))
            .first();

          if (eliteBadge) {
            await ctx.runMutation(api.mutations.awardBadge, {
              userId: data.agentId as any,
              badgeId: eliteBadge._id,
            });
          }
        }

        if (data.score >= 80) {
          // Award "Top Performer" badge
          const topPerformerBadge = await ctx.db
            .query("badges")
            .withIndex("by_name", (q) => q.eq("name", "Top Performer"))
            .first();

          if (topPerformerBadge) {
            await ctx.runMutation(api.mutations.awardBadge, {
              userId: data.agentId as any,
              badgeId: topPerformerBadge._id,
            });
          }
        }

        return call;

      case "call_started":
        // Log call start event (optional)
        return { success: true };

      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  },
});