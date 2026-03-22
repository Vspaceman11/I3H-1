import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  action,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const POINTS_BY_SEVERITY = { EASY: 5, MEDIUM: 10, HIGH: 20 } as const;

/**
 * When ingest sends issue_id = Convex document id of an existing row (n8n forwards webhook id),
 * merge into that row instead of inserting a duplicate. Keeps reporter user_id, coords, storageId,
 * and business issue_id (e.g. upload-…); ignores payload user_id for ownership/points.
 */
async function mergeIngestIntoIssueByConvexDocId(
  ctx: MutationCtx,
  targetId: Id<"issues">,
  args: {
    severity: "EASY" | "MEDIUM" | "HIGH";
    status: "open" | "in_review" | "approved" | "rejected" | "resolved";
    category?: string;
    ai_description?: string;
    user_description?: string;
    address?: string;
    image_url?: string;
    priority_score: number;
    authority_type?: string;
    safety_concern?: boolean;
    processed_at: string;
  },
) {
  const existing = await ctx.db.get(targetId);
  if (!existing) return null;

  const isVerified = args.status !== "rejected";
  const points = isVerified ? POINTS_BY_SEVERITY[args.severity] : 0;
  const pointsDelta = points - existing.points_awarded;

  await ctx.db.patch(targetId, {
    severity: args.severity,
    status: args.status,
    category: args.category ?? existing.category,
    ai_description: args.ai_description ?? existing.ai_description,
    user_description:
      args.user_description !== undefined
        ? args.user_description
        : existing.user_description,
    address: args.address ?? existing.address,
    image_url: args.image_url ?? existing.image_url,
    priority_score: args.priority_score,
    authority_type: args.authority_type ?? existing.authority_type,
    safety_concern:
      args.safety_concern !== undefined
        ? args.safety_concern
        : existing.safety_concern,
    processed_at: args.processed_at,
    points_awarded: points,
    analysisStatus: "done",
    analysisError: undefined,
  });

  if (pointsDelta !== 0) {
    const user = await ctx.db.get(existing.user_id);
    if (user) {
      await ctx.db.patch(existing.user_id, {
        total_points: Math.max(0, user.total_points + pointsDelta),
      });
    }
  }

  return { id: targetId, points_awarded: points };
}

export const create = mutation({
  args: {
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
    authority_type: v.optional(v.string()),
    safety_concern: v.optional(v.boolean()),
    created_at: v.string(),
    processed_at: v.string(),
  },
  handler: async (ctx, args) => {
    let existingByConvexId: Doc<"issues"> | null = null;
    try {
      const row = await ctx.db.get(args.issue_id as Id<"issues">);
      if (row) existingByConvexId = row;
    } catch {
      // args.issue_id is not a valid Convex id
    }

    if (existingByConvexId) {
      const merged = await mergeIngestIntoIssueByConvexDocId(ctx, existingByConvexId._id, {
        severity: args.severity,
        status: args.status,
        category: args.category,
        ai_description: args.ai_description,
        user_description: args.user_description,
        address: args.address,
        image_url: args.image_url,
        priority_score: args.priority_score,
        authority_type: args.authority_type,
        safety_concern: args.safety_concern,
        processed_at: args.processed_at,
      });
      if (merged) {
        return {
          id: merged.id,
          deduplicated: false,
          merged: true,
          points_awarded: merged.points_awarded,
        };
      }
    }

    const existing = await ctx.db
      .query("issues")
      .withIndex("by_issue_id", (q) => q.eq("issue_id", args.issue_id))
      .first();

    if (existing) {
      return { id: existing._id, deduplicated: true, points_awarded: 0 };
    }

    const isVerified = args.status !== "rejected";
    const points = isVerified ? POINTS_BY_SEVERITY[args.severity] : 0;

    const id = await ctx.db.insert("issues", {
      ...args,
      points_awarded: points,
    });

    if (points > 0) {
      const user = await ctx.db.get(args.user_id);
      if (user) {
        await ctx.db.patch(args.user_id, {
          total_points: user.total_points + points,
        });
      }
    }

    return { id, deduplicated: false, points_awarded: points };
  },
});

export const getByIssueId = query({
  args: { issue_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("issues")
      .withIndex("by_issue_id", (q) => q.eq("issue_id", args.issue_id))
      .first();
  },
});

/**
 * POST /api/issues: if the body sends Convex document id as issue_id (e.g. n8n forwards it from
 * triggerN8nAnalysis), merge into that document instead of inserting a second row.
 */
export const resolveIssueForHttpPost = internalQuery({
  args: { identifier: v.string() },
  handler: async (ctx, { identifier }) => {
    const byCustomIssueId = await ctx.db
      .query("issues")
      .withIndex("by_issue_id", (q) => q.eq("issue_id", identifier))
      .first();
    if (byCustomIssueId) {
      return { kind: "by_issue_id" as const, id: byCustomIssueId._id };
    }

    try {
      const byConvexId = await ctx.db.get(identifier as Id<"issues">);
      if (byConvexId) {
        return { kind: "by_convex_id" as const, id: byConvexId._id };
      }
    } catch {
      // identifier is not a valid Convex id
    }
    return { kind: "none" as const, id: null };
  },
});

export const listByUser = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const issues = await ctx.db
      .query("issues")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();
    const withUrls = await Promise.all(
      issues.map(async (issue) => {
        let url: string | null = null;
        if (issue.storageId) {
          url = await ctx.storage.getUrl(issue.storageId);
        }
        return { ...issue, resolvedImageUrl: url ?? issue.image_url ?? null };
      }),
    );
    return withUrls;
  },
});

export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("open"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("resolved")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("issues")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

export const approve = mutation({
  args: { id: v.id("issues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.id);
    if (!issue) throw new Error("Issue not found");
    if (issue.status !== "open" && issue.status !== "in_review") {
      throw new Error(`Cannot approve issue with status "${issue.status}"`);
    }

    const points = POINTS_BY_SEVERITY[issue.severity];
    const pointsDelta = points - issue.points_awarded;

    await ctx.db.patch(args.id, {
      status: "approved",
      points_awarded: points,
    });

    if (pointsDelta > 0) {
      const user = await ctx.db.get(issue.user_id);
      if (user) {
        await ctx.db.patch(issue.user_id, {
          total_points: user.total_points + pointsDelta,
        });
      }
    }

    return { success: true };
  },
});

// ── Direct Upload: queries ───────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db.query("issues").order("desc").take(50);
    const withUrls = await Promise.all(
      issues.map(async (issue) => {
        let url: string | null = null;
        if (issue.storageId) {
          url = await ctx.storage.getUrl(issue.storageId);
        }
        return { ...issue, resolvedImageUrl: url ?? issue.image_url ?? null };
      }),
    );
    return withUrls;
  },
});

/** Haversine distance in meters (Earth mean radius). */
function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Issues within a great-circle radius of a point. Used by the map for the visible area
 * (center + radius covering the viewport). Scans issues table; add a geo index strategy if volume grows.
 */
export const listInRadius = query({
  args: {
    centerLat: v.number(),
    centerLng: v.number(),
    radiusMeters: v.number(),
  },
  handler: async (ctx, args) => {
    const maxRadius = 500_000;
    const radiusMeters = Math.min(Math.max(args.radiusMeters, 1), maxRadius);

    const all = await ctx.db.query("issues").collect();
    const withCoords = all.filter(
      (i): i is typeof i & { latitude: number; longitude: number } =>
        typeof i.latitude === "number" && typeof i.longitude === "number",
    );

    const inRange = withCoords
      .map((issue) => ({
        issue,
        d: distanceMeters(
          args.centerLat,
          args.centerLng,
          issue.latitude,
          issue.longitude,
        ),
      }))
      .filter(({ d }) => d <= radiusMeters)
      .sort((a, b) => a.d - b.d)
      .slice(0, 200)
      .map(({ issue }) => issue);

    const withUrls = await Promise.all(
      inRange.map(async (issue) => {
        let url: string | null = null;
        if (issue.storageId) {
          url = await ctx.storage.getUrl(issue.storageId);
        }
        return { ...issue, resolvedImageUrl: url ?? issue.image_url ?? null };
      }),
    );
    return withUrls;
  },
});

export const get = query({
  args: { id: v.id("issues") },
  handler: async (ctx, { id }) => {
    const issue = await ctx.db.get(id);
    if (!issue) return null;
    let url: string | null = null;
    if (issue.storageId) {
      url = await ctx.storage.getUrl(issue.storageId);
    }
    return { ...issue, resolvedImageUrl: url ?? issue.image_url ?? null };
  },
});

// ── Direct Upload: mutations ─────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createFromUpload = mutation({
  args: {
    storageId: v.id("_storage"),
    user_id: v.id("users"),
    user_description: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const issueId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const id = await ctx.db.insert("issues", {
      issue_id: issueId,
      user_id: args.user_id,
      severity: "MEDIUM",
      status: "open",
      user_description: args.user_description,
      latitude: args.latitude,
      longitude: args.longitude,
      priority_score: 0,
      points_awarded: 0,
      created_at: now,
      processed_at: now,
      storageId: args.storageId,
      analysisStatus: "pending",
    });
    return id;
  },
});

// ── Direct Upload: internal mutations for n8n callback ───

export const updateAnalysis = internalMutation({
  args: {
    issueId: v.id("issues"),
    severity: v.optional(
      v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HIGH")),
    ),
    category: v.optional(v.string()),
    ai_description: v.optional(v.string()),
    priority_score: v.optional(v.number()),
    safety_concern: v.optional(v.boolean()),
    authority_type: v.optional(v.string()),
    address: v.optional(v.string()),
    image_url: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("in_review"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("resolved"),
      ),
    ),
    n8nExecutionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { issueId, ...fields } = args;
    const existing = await ctx.db.get(issueId);
    if (!existing) throw new Error(`Issue ${issueId} not found`);

    const effectiveStatus = fields.status ?? existing.status;
    const isVerified = effectiveStatus !== "rejected";

    const severityPoints = fields.severity
      ? POINTS_BY_SEVERITY[fields.severity]
      : POINTS_BY_SEVERITY[existing.severity];
    const points = isVerified ? severityPoints : 0;
    const pointsDelta = points - existing.points_awarded;

    await ctx.db.patch(issueId, {
      ...fields,
      priority_score: fields.priority_score ?? existing.priority_score,
      points_awarded: points,
      analysisStatus: "done",
      analysisError: undefined,
    });

    if (pointsDelta !== 0) {
      const user = await ctx.db.get(existing.user_id);
      if (user) {
        await ctx.db.patch(existing.user_id, {
          total_points: Math.max(0, user.total_points + pointsDelta),
        });
      }
    }

    const safetyConcernNow = fields.safety_concern === true;
    const wasAlreadyGenerating = existing.escalation_letter_status != null;
    if (safetyConcernNow && !wasAlreadyGenerating) {
      await ctx.scheduler.runAfter(0, internal.issues.triggerLetterGeneration, {
        issueId,
      });
    }
  },
});

export const markAnalysisError = internalMutation({
  args: {
    issueId: v.id("issues"),
    error: v.string(),
  },
  handler: async (ctx, { issueId, error }) => {
    await ctx.db.patch(issueId, {
      analysisStatus: "error",
      analysisError: error,
    });
  },
});

export const markAnalyzing = internalMutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    await ctx.db.patch(issueId, { analysisStatus: "analyzing" });
  },
});

// ── Direct Upload: action to call n8n ────────────────────

export const triggerN8nAnalysis = action({
  args: {
    issueId: v.id("issues"),
    storageId: v.id("_storage"),
    userId: v.string(),
    userDescription: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      await ctx.runMutation(internal.issues.markAnalysisError, {
        issueId: args.issueId,
        error: "Could not resolve storage URL for the uploaded file",
      });
      return;
    }

    await ctx.runMutation(internal.issues.markAnalyzing, {
      issueId: args.issueId,
    });

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      await ctx.runMutation(internal.issues.markAnalysisError, {
        issueId: args.issueId,
        error: "N8N_WEBHOOK_URL not configured",
      });
      return;
    }

    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    const convexSiteUrl = process.env.CONVEX_SITE_URL;

    const payload = {
      issue_id: args.issueId,
      image_url: imageUrl,
      user_id: args.userId,
      user_description: args.userDescription ?? "",
      latitude: args.latitude,
      longitude: args.longitude,
      callback_url: convexSiteUrl
        ? `${convexSiteUrl}/api/issues/analysis`
        : undefined,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (webhookSecret) {
      headers["Authorization"] = `Bearer ${webhookSecret}`;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        await ctx.runMutation(internal.issues.markAnalysisError, {
          issueId: args.issueId,
          error: `n8n returned ${response.status}: ${text.slice(0, 200)}`,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown fetch error";
      await ctx.runMutation(internal.issues.markAnalysisError, {
        issueId: args.issueId,
        error: message,
      });
    }
  },
});

// ── Escalation letter: mutations ─────────────────────────

export const markLetterGenerating = internalMutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    await ctx.db.patch(issueId, {
      escalation_letter_status: "generating",
      escalation_letter_error: undefined,
    });
  },
});

export const saveEscalationLetter = internalMutation({
  args: {
    issueId: v.id("issues"),
    subject: v.string(),
    body: v.string(),
    to: v.optional(v.string()),
    authority: v.optional(v.string()),
  },
  handler: async (ctx, { issueId, subject, body, to, authority }) => {
    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error(`Issue ${issueId} not found`);

    await ctx.db.patch(issueId, {
      escalation_letter_subject: subject,
      escalation_letter_body: body,
      escalation_letter_to: to,
      escalation_letter_authority: authority,
      escalation_letter_status: "draft",
      escalation_letter_error: undefined,
    });
  },
});

export const markLetterError = internalMutation({
  args: {
    issueId: v.id("issues"),
    error: v.string(),
  },
  handler: async (ctx, { issueId, error }) => {
    await ctx.db.patch(issueId, {
      escalation_letter_status: "error",
      escalation_letter_error: error,
    });
  },
});

export const approveEscalationLetter = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error("Issue not found");
    if (issue.escalation_letter_status !== "draft") {
      throw new Error(`Cannot approve letter with status "${issue.escalation_letter_status}"`);
    }

    await ctx.db.patch(issueId, {
      escalation_letter_status: "approved",
    });
  },
});

export const rejectEscalationLetter = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error("Issue not found");
    if (issue.escalation_letter_status !== "draft") {
      throw new Error(`Cannot reject letter with status "${issue.escalation_letter_status}"`);
    }

    await ctx.db.patch(issueId, {
      escalation_letter_status: "rejected",
    });
  },
});

export const markLetterSent = internalMutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    await ctx.db.patch(issueId, {
      escalation_letter_status: "sent",
    });
  },
});

export const markLetterSending = internalMutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    await ctx.db.patch(issueId, {
      escalation_letter_status: "sending",
    });
  },
});

// ── Escalation letter: actions ───────────────────────────

const AUTHORITY_MAP: Record<string, { name: string; dept: string; email: string }> = {
  roads_department: {
    name: "Stadtverwaltung Heilbronn",
    dept: "Tiefbauamt",
    email: "tiefbauamt@heilbronn.de",
  },
  utilities_electric: {
    name: "Stadtverwaltung Heilbronn",
    dept: "Stadtwerke — Elektrizität",
    email: "stadtwerke@heilbronn.de",
  },
  utilities_water: {
    name: "Stadtverwaltung Heilbronn",
    dept: "Stadtwerke — Wasser",
    email: "stadtwerke@heilbronn.de",
  },
  utilities_gas: {
    name: "Stadtverwaltung Heilbronn",
    dept: "Stadtwerke — Gas",
    email: "stadtwerke@heilbronn.de",
  },
  sanitation: {
    name: "Stadtverwaltung Heilbronn",
    dept: "Abfallwirtschaft",
    email: "abfallwirtschaft@heilbronn.de",
  },
  parks_department: {
    name: "Stadtverwaltung Heilbronn",
    dept: "Grünflächenamt",
    email: "gruenflaechenamt@heilbronn.de",
  },
  police: {
    name: "Polizeipräsidium Heilbronn",
    dept: "Polizei",
    email: "polizei@heilbronn.de",
  },
  emergency_services: {
    name: "Stadtverwaltung Heilbronn",
    dept: "Ordnungsamt",
    email: "ordnungsamt@heilbronn.de",
  },
  environmental: {
    name: "Stadtverwaltung Heilbronn",
    dept: "Umwelt- und Naturschutz",
    email: "umwelt@heilbronn.de",
  },
  general: {
    name: "Stadtverwaltung Heilbronn",
    dept: "Bürgeramt — Allgemeine Anfragen",
    email: "buergeramt@heilbronn.de",
  },
};

function buildDemoLetter(issue: {
  _id: string;
  category?: string;
  severity: string;
  ai_description?: string;
  user_description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  authority_type?: string;
}) {
  const authKey = issue.authority_type ?? "general";
  const auth = AUTHORITY_MAP[authKey] ?? AUTHORITY_MAP.general;

  const addr = issue.address ?? "Heilbronn (Standort unbekannt)";
  const desc = issue.ai_description || issue.user_description || "Sicherheitsrelevantes Problem";
  const cat = issue.category ?? "Allgemein";
  const mapsLink =
    issue.latitude && issue.longitude
      ? `https://maps.google.com/?q=${issue.latitude},${issue.longitude}`
      : null;

  const subject = `Dringende Meldung: Sicherheitsrisiko — ${cat} (${addr})`;

  const body = [
    `<p>Sehr geehrte Damen und Herren,</p>`,
    `<p>über die Bürgermelde-Plattform <strong>Pigeon-eye</strong> wurde eine Meldung mit `,
    `<strong>Sicherheitsrisiko</strong> eingereicht, die Ihr Zuständigkeitsbereich betrifft.</p>`,
    `<p><strong>Details zur Meldung:</strong></p>`,
    `<ul>`,
    `<li><strong>Kategorie:</strong> ${cat}</li>`,
    `<li><strong>Schweregrad:</strong> ${issue.severity}</li>`,
    `<li><strong>Beschreibung:</strong> ${desc}</li>`,
    `<li><strong>Ort:</strong> ${addr}</li>`,
    mapsLink ? `<li><strong>Karte:</strong> <a href="${mapsLink}">${mapsLink}</a></li>` : "",
    `<li><strong>Meldungs-ID:</strong> ${issue._id}</li>`,
    `</ul>`,
    `<p>Wir bitten Sie, die Situation zeitnah zu prüfen und geeignete Maßnahmen einzuleiten. `,
    `Bei Rückfragen stehen wir Ihnen gerne über die Plattform zur Verfügung.</p>`,
    `<p>Mit freundlichen Grüßen,<br/><strong>Pigeon-eye — Bürgermeldestelle Heilbronn</strong></p>`,
  ].join("\n");

  return { subject, body, to: auth.email, authority: `${auth.name} — ${auth.dept}` };
}

export const triggerLetterGeneration = internalAction({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    const issue = await ctx.runQuery(internal.issues.getInternal, { issueId });
    if (!issue) return;

    await ctx.runMutation(internal.issues.markLetterGenerating, { issueId });

    // Simulate AI generation delay for demo realism
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const letter = buildDemoLetter({
      _id: String(issueId),
      category: issue.category ?? undefined,
      severity: issue.severity,
      ai_description: issue.ai_description ?? undefined,
      user_description: issue.user_description ?? undefined,
      address: issue.address ?? undefined,
      latitude: issue.latitude ?? undefined,
      longitude: issue.longitude ?? undefined,
      authority_type: issue.authority_type ?? undefined,
    });

    await ctx.runMutation(internal.issues.saveEscalationLetter, {
      issueId,
      subject: letter.subject,
      body: letter.body,
      to: letter.to,
      authority: letter.authority,
    });
  },
});

/** Demo stub: marks the letter as "sent" without calling any external service. */
export const sendApprovedLetter = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error("Issue not found");
    if (
      issue.escalation_letter_status !== "approved" &&
      issue.escalation_letter_status !== "draft"
    ) {
      throw new Error("Letter must be in draft or approved state");
    }

    await ctx.db.patch(issueId, {
      escalation_letter_status: "sent",
    });
  },
});

export const getInternal = internalQuery({
  args: { issueId: v.id("issues") },
  handler: async (ctx, { issueId }) => {
    return await ctx.db.get(issueId);
  },
});
