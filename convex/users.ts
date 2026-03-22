import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const SUBJECT_DIVIDER = "|";

const currentUserReturn = v.union(
  v.null(),
  v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    total_points: v.number(),
    role: v.union(v.literal("citizen"), v.literal("moderator"), v.literal("admin")),
    created_at: v.string(),
  }),
);

export const currentUser = query({
  args: {},
  returns: currentUserReturn,
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity === null) return null;
      const [userIdStr] = identity.subject.split(SUBJECT_DIVIDER);
      if (!userIdStr) return null;
      const userId = userIdStr as Id<"users">;
      const doc = await ctx.db.get(userId);
      if (!doc) return null;
      return {
        _id: doc._id,
        _creationTime: doc._creationTime,
        name: doc.name,
        image: doc.image,
        email: doc.email,
        avatar_url: doc.avatar_url,
        total_points: typeof doc.total_points === "number" ? doc.total_points : 0,
        role: (doc.role === "moderator" || doc.role === "admin"
          ? doc.role
          : "citizen") as "citizen" | "moderator" | "admin",
        created_at:
          typeof doc.created_at === "string" && doc.created_at.length > 0
            ? doc.created_at
            : new Date(doc._creationTime).toISOString(),
      };
    } catch {
      return null;
    }
  },
});

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
      .withIndex("email", (q) => q.eq("email", args.email))
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
      .withIndex("email", (q) => q.eq("email", args.email))
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
