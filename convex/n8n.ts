"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const ESCALATION_SEVERITY_THRESHOLD = 8;

export const escalateIfSevere = action({
  args: {
    issueId: v.id("issues"),
    category: v.string(),
    severity: v.float64(),
    description: v.string(),
    lat: v.float64(),
    lng: v.float64(),
  },
  handler: async (ctx, args) => {
    if (args.severity <= ESCALATION_SEVERITY_THRESHOLD) return { escalated: false };

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      console.warn("n8n webhook not configured, skipping escalation");
      return { escalated: false, reason: "not_configured" };
    }

    const idempotencyKey = `pigeon-eye-${args.issueId}-${Date.now()}`;

    const payload = {
      issueId: args.issueId,
      category: args.category,
      severity: args.severity,
      description: args.description,
      location: { lat: args.lat, lng: args.lng },
      city: "Heilbronn",
      timestamp: new Date().toISOString(),
      idempotencyKey,
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": webhookSecret,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`n8n webhook failed: ${response.status}`);
      }

      await ctx.runMutation(internal.mutations.markNotified, {
        issueId: args.issueId,
      });

      return { escalated: true };
    } catch (error) {
      console.error("n8n escalation failed:", error);
      return {
        escalated: false,
        reason: error instanceof Error ? error.message : "unknown",
      };
    }
  },
});
