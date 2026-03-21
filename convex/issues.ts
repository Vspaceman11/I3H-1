import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
  args: {
    issue_id: v.string(),
    user_id: v.string(),
    severity: v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HIGH")),
    status: v.string(),
    category: v.optional(v.string()),
    ai_description: v.optional(v.string()),
    user_description: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    address: v.optional(v.string()),
    image_url: v.optional(v.string()),
    priority_score: v.number(),
    reporter_points: v.optional(v.number()),
    authority_type: v.optional(v.string()),
    safety_concern: v.optional(v.boolean()),
    created_at: v.optional(v.string()),
    processed_at: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_issue_id", (q) => q.eq("issue_id", args.issue_id))
      .first();

    if (existing) {
      return { id: existing._id, deduplicated: true };
    }

    const id = await ctx.db.insert("issues", args);
    return { id, deduplicated: false };
  },
});
