import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const markNotified = internalMutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.issueId, { n8nNotified: true });
  },
});
