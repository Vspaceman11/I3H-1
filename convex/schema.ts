import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  issues: defineTable({
    imageId: v.id("_storage"),
    lat: v.float64(),
    lng: v.float64(),
    category: v.string(),
    severity: v.float64(),
    status: v.union(v.literal("open"), v.literal("resolved")),
    reporterId: v.string(),
    votes: v.float64(),
    description: v.string(),
    createdAt: v.float64(),
    aiAnalysis: v.optional(
      v.object({
        category: v.string(),
        severity: v.float64(),
        description: v.string(),
      })
    ),
    n8nNotified: v.optional(v.boolean()),
  })
    .index("by_status", ["status"])
    .index("by_reporter", ["reporterId"])
    .index("by_severity", ["severity"]),

  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    points: v.float64(),
    reportsCount: v.float64(),
  }).index("by_clerkId", ["clerkId"]),
});
