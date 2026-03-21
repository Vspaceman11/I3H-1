import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/issues",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (token !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = {
      issue_id: String(body.id || body.issue_id || ""),
      user_id: String(body.user_id || ""),
      severity: validateSeverity(body.severity),
      status: String(body.status || "open"),
      category: optStr(body.category),
      ai_description: optStr(body.ai_description),
      user_description: optStr(body.user_description),
      latitude: optNum(body.latitude),
      longitude: optNum(body.longitude),
      address: optStr(body.address),
      image_url: optStr(body.image_url),
      priority_score: Number(body.priority_score) || 0,
      reporter_points: optNum(body.reporter_points),
      authority_type: optStr(body.authority_type),
      safety_concern: body.safety_concern === true ? true : undefined,
      created_at: optStr(body.created_at),
      processed_at: String(body.processed_at || new Date().toISOString()),
    };

    if (!payload.issue_id || !payload.user_id) {
      return new Response(
        JSON.stringify({ error: "issue_id and user_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const result = await ctx.runMutation(api.issues.create, payload);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

function validateSeverity(val: unknown): "EASY" | "MEDIUM" | "HIGH" {
  if (val === "EASY" || val === "MEDIUM" || val === "HIGH") return val;
  return "MEDIUM";
}

function optStr(val: unknown): string | undefined {
  return typeof val === "string" && val.length > 0 ? val : undefined;
}

function optNum(val: unknown): number | undefined {
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

export default http;
