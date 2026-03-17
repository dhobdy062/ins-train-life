import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const startDemoCall = mutation({
  args: { ip: v.string() },
  handler: async (ctx, { ip }) => {
    const VAPI_API_KEY = process.env.VAPI_API_KEY;
    const VAPI_AGENT_ID = process.env.VAPI_AGENT_ID;

    if (!VAPI_API_KEY || !VAPI_AGENT_ID) {
      throw new Error("Vapi API key or Agent ID not set");
    }

    const existingCall = await ctx.db
      .query("ipCallTracking")
      .withIndex("by_ipAddress", (q) => q.eq("ipAddress", ip))
      .first();

    if (existingCall && existingCall.callCount >= 2) {
      throw new Error("You have reached the maximum number of demo calls.");
    }

    if (existingCall) {
      await ctx.db.patch(existingCall._id, {
        callCount: existingCall.callCount + 1,
      });
    } else {
      await ctx.db.insert("ipCallTracking", {
        ipAddress: ip,
        callCount: 1,
      });
    }

    const response = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VAPI_API_KEY}`,
      },
      body: JSON.stringify({
        assistantId: VAPI_AGENT_ID,
        // This is a placeholder for a phone number. 
        // In a real application, you would get this from the user.
        customer: {
          number: "+1234567890",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi API error: ${errorText}`);
    }

    const call = await response.json();
    return call;
  },
});