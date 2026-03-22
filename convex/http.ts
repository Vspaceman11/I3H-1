import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

    const rawUserId = String(body.user_id || "");
    const issueId = String(body.id || body.issue_id || "");

    if (!issueId || !rawUserId) {
      return new Response(
        JSON.stringify({ error: "issue_id and user_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const resolved = await ctx.runQuery(internal.issues.resolveIssueForHttpPost, {
        identifier: issueId,
      });

      if (resolved.kind === "by_convex_id" || resolved.kind === "by_issue_id") {
        await ctx.runMutation(internal.issues.updateAnalysis, {
          issueId: resolved.id,
          severity: parseSeverity(body.severity),
          category: optStr(body.category),
          ai_description: optStr(body.ai_description),
          priority_score: optNum(body.priority_score),
          safety_concern: body.safety_concern === true ? true : undefined,
          authority_type: optStr(body.authority_type),
          address: optStr(body.address),
          image_url: optStr(body.image_url),
          status: parseStatusOptional(body.status),
          n8nExecutionId: optStr(body.execution_id),
        });
        return new Response(
          JSON.stringify({ success: true, id: resolved.id, merged: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const userResult = await ctx.runMutation(api.users.create, {
        name: rawUserId,
        email: rawUserId + "@pigeon-eye.local",
      });

      const payload = {
        issue_id: issueId,
        user_id: userResult.id,
        severity: validateSeverity(body.severity),
        status: validateStatus(body.status),
        category: optStr(body.category),
        ai_description: optStr(body.ai_description),
        user_description: optStr(body.user_description),
        latitude: optNum(body.latitude),
        longitude: optNum(body.longitude),
        address: optStr(body.address),
        image_url: optStr(body.image_url),
        priority_score: Number(body.priority_score) || 0,
        authority_type: optStr(body.authority_type),
        safety_concern: body.safety_concern === true ? true : undefined,
        created_at: String(body.created_at || new Date().toISOString()),
        processed_at: String(body.processed_at || new Date().toISOString()),
      };

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

function validateStatus(val: unknown): "open" | "in_review" | "approved" | "rejected" | "resolved" {
  const valid = ["open", "in_review", "approved", "rejected", "resolved"];
  if (typeof val === "string" && valid.includes(val)) return val as "open";
  return "open";
}

function optStr(val: unknown): string | undefined {
  return typeof val === "string" && val.length > 0 ? val : undefined;
}

function optNum(val: unknown): number | undefined {
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

function parseSeverity(val: unknown): "EASY" | "MEDIUM" | "HIGH" | undefined {
  if (val === "EASY" || val === "MEDIUM" || val === "HIGH") return val;
  return undefined;
}

function parseStatusOptional(
  val: unknown,
):
  | "open"
  | "in_review"
  | "approved"
  | "rejected"
  | "resolved"
  | undefined {
  if (
    val === "open" ||
    val === "in_review" ||
    val === "approved" ||
    val === "rejected" ||
    val === "resolved"
  ) {
    return val;
  }
  return undefined;
}

http.route({
  path: "/api/issues",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

// ── n8n callback: analysis results ───────────────────────

http.route({
  path: "/api/issues/analysis",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      const token = request.headers.get("Authorization")?.replace("Bearer ", "");
      if (token !== secret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const rawIssueId = String(body.issue_id ?? "");
    if (!rawIssueId) {
      return new Response(
        JSON.stringify({ error: "issue_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }

    const resolved = await ctx.runQuery(internal.issues.resolveIssueForHttpPost, {
      identifier: rawIssueId,
    });

    if (!resolved.id) {
      return new Response(
        JSON.stringify({ error: `Issue not found: ${rawIssueId}` }),
        { status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }

    const issueId = resolved.id;

    const isError = body.error === true || typeof body.error_message === "string";

    if (isError) {
      await ctx.runMutation(internal.issues.markAnalysisError, {
        issueId,
        error: String(body.error_message ?? "Unknown n8n error"),
      });
      return new Response(JSON.stringify({ success: true, recorded: "error" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    try {
      await ctx.runMutation(internal.issues.updateAnalysis, {
        issueId,
        severity: parseSeverity(body.severity),
        category: optStr(body.category),
        ai_description: optStr(body.ai_description),
        priority_score: optNum(body.priority_score),
        safety_concern: body.safety_concern === true ? true : undefined,
        authority_type: optStr(body.authority_type),
        address: optStr(body.address),
        image_url: optStr(body.image_url),
        n8nExecutionId: optStr(body.execution_id),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Internal error";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }
  }),
});

http.route({
  path: "/api/issues/analysis",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

// ── n8n callback: escalation letter ──────────────────────

http.route({
  path: "/api/issues/escalation-letter",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      const token = request.headers.get("Authorization")?.replace("Bearer ", "");
      if (token !== secret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const rawIssueId = String(body.issue_id ?? "");
    if (!rawIssueId) {
      return new Response(
        JSON.stringify({ error: "issue_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }

    const resolved = await ctx.runQuery(internal.issues.resolveIssueForHttpPost, {
      identifier: rawIssueId,
    });

    if (!resolved.id) {
      return new Response(
        JSON.stringify({ error: `Issue not found: ${rawIssueId}` }),
        { status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }

    const isError = body.error === true || typeof body.error_message === "string";
    if (isError) {
      await ctx.runMutation(internal.issues.markLetterError, {
        issueId: resolved.id,
        error: String(body.error_message ?? "Letter generation failed in n8n"),
      });
      return new Response(JSON.stringify({ success: true, recorded: "error" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const subject = String(body.subject ?? body.email_subject ?? "");
    const letterBody = String(body.body_html ?? body.email_body_html ?? body.body ?? "");
    const to = optStr(body.to) ?? optStr(body.authority_email);
    const authority = optStr(body.authority_name) ?? optStr(body.authority);

    if (!subject || !letterBody) {
      return new Response(
        JSON.stringify({ error: "subject and body_html are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }

    try {
      await ctx.runMutation(internal.issues.saveEscalationLetter, {
        issueId: resolved.id,
        subject,
        body: letterBody,
        to,
        authority,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Internal error";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
      );
    }
  }),
});

http.route({
  path: "/api/issues/escalation-letter",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

export default http;
