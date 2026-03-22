import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PGN-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const redeemReward = mutation({
  args: {
    user_id: v.id("users"),
    reward_name: v.string(),
    points_cost: v.number(),
    discount_percent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    if (!user) throw new ConvexError("User not found");

    if (user.total_points < args.points_cost) {
      throw new ConvexError(
        `Not enough points: ${user.total_points} available, ${args.points_cost} required`
      );
    }

    const newPoints = user.total_points - args.points_cost;
    await ctx.db.patch(args.user_id, { total_points: newPoints });

    return { success: true, remaining: newPoints };
  },
});

export const issueForApprovedReport = mutation({
  args: {
    user_id: v.id("users"),
    issue_id: v.id("issues"),
    discount_percent: v.number(),
    points_cost: v.number(),
    valid_days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    if (!user) throw new Error("User not found");

    const issue = await ctx.db.get(args.issue_id);
    if (!issue) throw new Error("Issue not found");
    if (issue.status !== "approved") {
      throw new Error("Coupon can only be issued for approved issues");
    }
    if (issue.user_id !== args.user_id) {
      throw new Error("Coupon can only be issued to the reporter");
    }

    if (user.total_points < args.points_cost) {
      throw new Error(
        `Insufficient points: ${user.total_points} available, ${args.points_cost} required`
      );
    }

    const daysValid = args.valid_days ?? 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    const code = generateCouponCode();
    const id = await ctx.db.insert("coupons", {
      user_id: args.user_id,
      issue_id: args.issue_id,
      code,
      points_cost: args.points_cost,
      discount_percent: args.discount_percent,
      status: "active",
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    await ctx.db.patch(args.user_id, {
      total_points: user.total_points - args.points_cost,
    });

    return { id, code };
  },
});

export const listByUser = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupons")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();
  },
});

export const redeem = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!coupon) throw new Error("Coupon not found");
    if (coupon.status === "redeemed") throw new Error("Coupon already redeemed");
    if (coupon.status === "expired") throw new Error("Coupon has expired");

    if (new Date(coupon.expires_at) < new Date()) {
      await ctx.db.patch(coupon._id, { status: "expired" });
      throw new Error("Coupon has expired");
    }

    await ctx.db.patch(coupon._id, {
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
    });

    return { success: true, discount_percent: coupon.discount_percent };
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});
