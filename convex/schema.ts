import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const severity = v.union(
  v.literal("EASY"),
  v.literal("MEDIUM"),
  v.literal("HIGH"),
);

export default defineSchema({
  issues: defineTable({
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
  })
    .index("by_severity", ["severity"])
    .index("by_status", ["status"])
    .index("by_issue_id", ["issue_id"]),
});
