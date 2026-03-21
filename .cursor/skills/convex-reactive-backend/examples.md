## Example: `ai_jobs` + Action→Mutation→Subscription + optimistic reconciliation

### Schema (`convex/schema.ts`)
```typescript
// Example: keep the fields minimal and JSON-compatible.
// (Use your project’s schema conventions.)
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ai_jobs: defineTable({
    userId: v.string(),
    requestId: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("error"),
    ),
    input: v.any(),  // or a structured object
    output: v.optional(v.any()),
    error: v.optional(v.any()), // sanitized error info
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId_updatedAt", ["userId", "updatedAt"]),
});
```

### Mutations (`convex/mutations.ts`)
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const startJob = mutation({
  args: { requestId: v.string(), input: v.any() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    const now = Date.now();

    // Idempotency: if a job exists for (userId, requestId), don’t duplicate.
    const existing = await ctx.db
      .query("ai_jobs")
      .withIndex("by_userId_updatedAt", q => q.eq("userId", userId))
      .filter(q => q.eq(q.field("requestId"), args.requestId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("ai_jobs", {
      userId,
      requestId: args.requestId,
      status: "running",
      input: args.input,
      output: undefined,
      error: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const completeJob = mutation({
  args: { jobId: v.id("ai_jobs"), output: v.any() },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.patch(args.jobId, {
      status: "completed",
      output: args.output,
      updatedAt: now,
    });
  },
});

export const failJob = mutation({
  args: { jobId: v.id("ai_jobs"), error: v.any() },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.patch(args.jobId, {
      status: "error",
      error: args.error,
      updatedAt: now,
    });
  },
});
```

### Action (`convex/actions.ts`)
```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

export const runAiJob = action({
  args: { requestId: v.string(), prompt: v.string() },
  handler: async (ctx, args) => {
    // 1) Auth + idempotent job creation
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const jobId = await ctx.runMutation("startJob", {
      requestId: args.requestId,
      input: { prompt: args.prompt },
    });

    try {
      // 2) Call Gemini (or any LLM) and require strict structured JSON.
      const aiOutput = await callGeminiReturningJson({
        prompt: args.prompt,
      });

      // 3) Persist canonical results via mutation.
      await ctx.runMutation("completeJob", {
        jobId,
        output: aiOutput,
      });

      // Action return value can be minimal; subscriptions are canonical.
      return { jobId };
    } catch (e) {
      await ctx.runMutation("failJob", {
        jobId,
        error: { message: "AI generation failed" },
      });
      throw e;
    }
  },
});
```

### Query (`convex/queries.ts`)
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const listMyJobs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    return await ctx.db
      .query("ai_jobs")
      .withIndex("by_userId_updatedAt", q => q.eq("userId", userId))
      .order("desc")
      .take(20);
  },
});
```

### Frontend (optimistic placeholder keyed by `requestId`)
```typescript
import { useAction, useQuery } from "convex/react";
import { useMemo, useState } from "react";

function AiGenerateButton() {
  const listJobs = useQuery("listMyJobs");
  const runAiJob = useAction("runAiJob");

  const [optimisticJobs, setOptimisticJobs] = useState<Record<string, any>>({});

  const combinedJobs = useMemo(() => {
    // Merge: optimistic placeholders first, then subscribed DB jobs override.
    const byRequestId: Record<string, any> = { ...optimisticJobs };
    for (const job of listJobs ?? []) {
      byRequestId[job.requestId] = job;
    }
    return Object.values(byRequestId).sort(
      (a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
    );
  }, [listJobs, optimisticJobs]);

  async function onGenerate() {
    const requestId = crypto.randomUUID();
    setOptimisticJobs(prev => ({
      ...prev,
      [requestId]: {
        requestId,
        status: "running",
        updatedAt: Date.now(),
        // other placeholder fields...
      },
    }));

    await runAiJob({ requestId, prompt: "..." });
    // No need to manually update output; `useQuery` subscription will reconcile.
  }

  // Render `combinedJobs`...
}
```

