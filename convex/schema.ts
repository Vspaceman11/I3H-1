import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    avatar_url: v.optional(v.string()),
    total_points: v.number(),
    role: v.union(v.literal("citizen"), v.literal("moderator"), v.literal("admin")),
    created_at: v.string(),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  issues: defineTable({
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
    points_awarded: v.number(),
    authority_type: v.optional(v.string()),
    safety_concern: v.optional(v.boolean()),
    created_at: v.string(),
    processed_at: v.string(),

    storageId: v.optional(v.id("_storage")),
    analysisStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("done"),
      v.literal("error"),
    )),
    analysisError: v.optional(v.string()),
    n8nExecutionId: v.optional(v.string()),
  })
    .index("by_severity", ["severity"])
    .index("by_status", ["status"])
    .index("by_issue_id", ["issue_id"])
    .index("by_user", ["user_id"]),

  coupons: defineTable({
    user_id: v.id("users"),
    issue_id: v.id("issues"),
    code: v.string(),
    points_cost: v.number(),
    discount_percent: v.number(),
    status: v.union(v.literal("active"), v.literal("redeemed"), v.literal("expired")),
    expires_at: v.string(),
    redeemed_at: v.optional(v.string()),
    created_at: v.string(),
  })
    .index("by_user", ["user_id"])
    .index("by_code", ["code"])
    .index("by_status", ["status"]),
});
