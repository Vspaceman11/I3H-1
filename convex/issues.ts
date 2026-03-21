import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const severityValidator = v.union(
  v.literal("EASY"),
  v.literal("MEDIUM"),
  v.literal("HIGH"),
);

const issueUpsertArgs = {
  address: v.optional(v.string()),
  ai_description: v.optional(v.string()),
  authority_type: v.optional(v.string()),
  category: v.optional(v.string()),
  created_at: v.optional(v.string()),
  image_url: v.optional(v.string()),
  issue_id: v.string(),
  latitude: v.optional(v.float64()),
  longitude: v.optional(v.float64()),
  priority_score: v.float64(),
  processed_at: v.string(),
  reporter_points: v.optional(v.float64()),
  safety_concern: v.optional(v.boolean()),
  severity: severityValidator,
  status: v.string(),
  user_description: v.optional(v.string()),
  user_id: v.string(),
} as const;

/** Called only from `convex/http.ts` after secret check (n8n ingest). */
export const upsertFromN8n = internalMutation({
  args: issueUpsertArgs,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("issues")
      .withIndex("by_issue_id", (q) => q.eq("issue_id", args.issue_id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return { convexId: existing._id, updated: true as const };
    }

    const convexId = await ctx.db.insert("issues", args);
    return { convexId, updated: false as const };
  },
});

export const list = query({
  args: {
    status: v.optional(v.string()),
    severity: v.optional(severityValidator),
  },
  handler: async (ctx, args) => {
    if (args.status !== undefined && args.severity !== undefined) {
      const rows = await ctx.db
        .query("issues")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
      return rows.filter((r) => r.severity === args.severity);
    }
    if (args.status !== undefined) {
      return ctx.db
        .query("issues")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    if (args.severity !== undefined) {
      return ctx.db
        .query("issues")
        .withIndex("by_severity", (q) => q.eq("severity", args.severity!))
        .order("desc")
        .collect();
    }
    return ctx.db.query("issues").order("desc").collect();
  },
});

export const getByIssueId = query({
  args: { issueId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("issues")
      .withIndex("by_issue_id", (q) => q.eq("issue_id", args.issueId))
      .unique();
  },
});
