import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const POINTS_BY_SEVERITY = { EASY: 5, MEDIUM: 10, HIGH: 20 } as const;

export const create = mutation({
  args: {
    issue_id: v.string(),
    user_id: v.id("users"),
    severity: v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HIGH")),
    status: v.union(
      v.literal("open"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("resolved")
    ),
    category: v.optional(v.string()),
    ai_description: v.optional(v.string()),
    user_description: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    address: v.optional(v.string()),
    image_url: v.optional(v.string()),
    priority_score: v.number(),
    authority_type: v.optional(v.string()),
    safety_concern: v.optional(v.boolean()),
    created_at: v.string(),
    processed_at: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_issue_id", (q) => q.eq("issue_id", args.issue_id))
      .first();

    if (existing) {
      return { id: existing._id, deduplicated: true, points_awarded: 0 };
    }

    const points = POINTS_BY_SEVERITY[args.severity];

    const id = await ctx.db.insert("issues", {
      ...args,
      points_awarded: points,
    });

    const user = await ctx.db.get(args.user_id);
    if (user) {
      await ctx.db.patch(args.user_id, {
        total_points: user.total_points + points,
      });
    }

    return { id, deduplicated: false, points_awarded: points };
  },
});

export const getByIssueId = query({
  args: { issue_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("issues")
      .withIndex("by_issue_id", (q) => q.eq("issue_id", args.issue_id))
      .first();
  },
});

export const listByUser = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("issues")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();
  },
});

export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("open"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("resolved")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("issues")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

export const approve = mutation({
  args: { id: v.id("issues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.id);
    if (!issue) throw new Error("Issue not found");
    if (issue.status !== "open" && issue.status !== "in_review") {
      throw new Error(`Cannot approve issue with status "${issue.status}"`);
    }
    await ctx.db.patch(args.id, { status: "approved" });
    return { success: true };
  },
});
