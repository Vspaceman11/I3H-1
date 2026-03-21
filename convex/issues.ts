import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("open"), v.literal("resolved"))),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return ctx.db
        .query("issues")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return ctx.db.query("issues").order("desc").collect();
  },
});

export const getById = query({
  args: { id: v.id("issues") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    imageId: v.id("_storage"),
    lat: v.float64(),
    lng: v.float64(),
    category: v.string(),
    severity: v.float64(),
    description: v.string(),
    reporterId: v.string(),
  },
  handler: async (ctx, args) => {
    const issueId = await ctx.db.insert("issues", {
      ...args,
      status: "open",
      votes: 0,
      createdAt: Date.now(),
    });
    return issueId;
  },
});

export const vote = mutation({
  args: { id: v.id("issues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.id);
    if (!issue) throw new Error("Issue not found");
    await ctx.db.patch(args.id, { votes: issue.votes + 1 });
  },
});

export const resolve = mutation({
  args: { id: v.id("issues") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "resolved" });
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getImageUrl = query({
  args: { imageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.imageId);
  },
});
