import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    avatar_url: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("citizen"), v.literal("moderator"), v.literal("admin"))
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      return { id: existing._id, created: false };
    }

    const id = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      avatar_url: args.avatar_url,
      total_points: 0,
      role: args.role ?? "citizen",
      created_at: new Date().toISOString(),
    });

    return { id, created: true };
  },
});

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const updateProfile = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("User not found");

    const updates: Record<string, string> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.avatar_url !== undefined) updates.avatar_url = args.avatar_url;

    await ctx.db.patch(args.id, updates);
    return { success: true };
  },
});

export const getPoints = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) return null;
    return { total_points: user.total_points };
  },
});
