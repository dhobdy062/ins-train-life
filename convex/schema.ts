
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  teams: defineTable({
    orgName: v.string(),
    plan: v.string(),
    seats: v.number(),
    minutesUsed: v.number(),
    monthlyAllocation: v.number(),
  }),
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.string(),
    teamId: v.id("teams"),
    status: v.string(),
  }),
  calls: defineTable({
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
  }),
  badges: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.optional(v.string()),
  }),
  userBadges: defineTable({
    userId: v.id("users"),
    badgeId: v.id("badges"),
    dateEarned: v.number(),
  }),
});
