import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Ingest issues from n8n after processing (same contract as your Convex Site URL).
 * Set header `X-Webhook-Secret` to the value of ISSUES_INGEST_SECRET in Convex env.
 */
http.route({
  path: "/api/issues",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.ISSUES_INGEST_SECRET;
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "ISSUES_INGEST_SECRET not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const headerSecret = request.headers.get("x-webhook-secret");
    if (headerSecret !== secret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (typeof body !== "object" || body === null) {
      return new Response(JSON.stringify({ error: "Body must be an object" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const o = body as Record<string, unknown>;

    const issue_id = o.issue_id;
    const priority_score = o.priority_score;
    const processed_at = o.processed_at;
    const severity = o.severity;
    const status = o.status;
    const user_id = o.user_id;

    if (typeof issue_id !== "string" || issue_id.length === 0) {
      return new Response(JSON.stringify({ error: "issue_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof priority_score !== "number" || Number.isNaN(priority_score)) {
      return new Response(JSON.stringify({ error: "priority_score must be a number" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof processed_at !== "string") {
      return new Response(JSON.stringify({ error: "processed_at must be a string" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (severity !== "EASY" && severity !== "MEDIUM" && severity !== "HIGH") {
      return new Response(JSON.stringify({ error: "severity must be EASY, MEDIUM, or HIGH" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof status !== "string") {
      return new Response(JSON.stringify({ error: "status must be a string" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof user_id !== "string") {
      return new Response(JSON.stringify({ error: "user_id must be a string" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const optionalString = (k: string): string | undefined => {
      const v = o[k];
      if (v === undefined || v === null) return undefined;
      if (typeof v !== "string") return undefined;
      return v;
    };
    const optionalNumber = (k: string): number | undefined => {
      const v = o[k];
      if (v === undefined || v === null) return undefined;
      if (typeof v !== "number" || Number.isNaN(v)) return undefined;
      return v;
    };
    const optionalBool = (k: string): boolean | undefined => {
      const v = o[k];
      if (v === undefined || v === null) return undefined;
      if (typeof v !== "boolean") return undefined;
      return v;
    };

    const result = await ctx.runMutation(internal.issues.upsertFromN8n, {
      address: optionalString("address"),
      ai_description: optionalString("ai_description"),
      authority_type: optionalString("authority_type"),
      category: optionalString("category"),
      created_at: optionalString("created_at"),
      image_url: optionalString("image_url"),
      issue_id,
      latitude: optionalNumber("latitude"),
      longitude: optionalNumber("longitude"),
      priority_score,
      processed_at,
      reporter_points: optionalNumber("reporter_points"),
      safety_concern: optionalBool("safety_concern"),
      severity,
      status,
      user_description: optionalString("user_description"),
      user_id,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
