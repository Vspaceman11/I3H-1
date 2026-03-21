import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const severity = v.union(
  v.literal("EASY"),
  v.literal("MEDIUM"),
  v.literal("HIGH"),
);

export default defineSchema({
  issues: defineTable({
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
    severity,
    status: v.string(),
    user_description: v.optional(v.string()),
    user_id: v.string(),
  })
    .index("by_issue_id", ["issue_id"])
    .index("by_severity", ["severity"])
    .index("by_status", ["status"]),
});
