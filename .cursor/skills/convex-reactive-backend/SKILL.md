---
name: convex-reactive-backend
description: Designs Convex reactive backends for AI-driven features using real-time subscriptions, optimistic UI, and Action→Mutation data flows. Use when implementing Convex Actions/Mutations for AI results or wiring reactive Query subscriptions (optionally with optimistic updates).
---

# Convex Reactive Backend

## Goal
Build Convex backends that feel “live”: AI results stream through Actions into Mutations, and the UI updates via real-time subscriptions to Queries. Include optimistic UI updates when appropriate, while keeping Convex as the source of truth.

## Core Reactive Pattern (AI Job)
Prefer an “AI job” document in the DB so the client can subscribe to status/progress/results.

Recommended shape (example fields):
- `userId` (auth)
- `requestId` (client-generated id for idempotency + optimistic reconciliation)
- `status` (`queued | running | completed | error`)
- `input` (what the Action used)
- `output` (structured JSON from Gemini)
- `error` (sanitized error info)
- `createdAt`, `updatedAt`

## Implementation Steps

1. Data model + indexes (schema)
   - Create a table (e.g. `ai_jobs`) that can be queried by `userId` and ordered by time.
   - Add the minimum indexes needed for the subscriptions you plan to implement (for example: by `userId` then `updatedAt`).

2. Mutations (DB writes only)
   - `startJob`: insert the job row (status `queued` or `running`) and set `requestId`.
   - `completeJob`: update the job row with `status=completed` and `output`.
   - `failJob`: update the job row with `status=error` and a sanitized `error`.
   - Idempotency rule: mutations should be safe if Actions retry. Use `requestId`/job lookups before overwriting, or only allow state transitions that make sense (e.g., `running -> completed`).

3. Action (orchestration only)
   - Validate inputs and require auth.
   - Compute/accept `requestId`; check whether a job already exists for `(userId, requestId)`. If it does, return the existing job id (idempotent).
   - Call Mutations via `ctx.runMutation(...)`:
     - `startJob` before invoking Gemini
     - `completeJob` after receiving strictly structured JSON
     - `failJob` on errors (including JSON parse/validation errors)

4. Queries + real-time subscriptions (reactivity)
   - Write a Query that returns the job(s) a user should see (e.g. `listJobsByUser` and/or `getJobById`).
   - The frontend subscribes to the Query (via Convex React hooks such as `useQuery`) so the UI updates automatically when Mutations change the DB.
   - Keep the subscription query cheap: filter by `userId`, avoid unbounded scans, and paginate if needed.

5. Optimistic updates (UX without breaking truth)
   - Use optimistic UI to show immediate feedback after the user triggers “generate”.
   - Canonical source remains Convex: once the Action writes the job row, the subscription response reconciles the UI.
   - Reconciliation strategy:
     - Use the client-generated `requestId` as the key.
     - Optimistically render a placeholder row/state for that `requestId`.
     - When the subscribed job appears/updates, replace the placeholder with the server job (or update the status/output).
   - If your Convex React SDK version supports it, you may optionally use `optimisticUpdate` in the relevant hook; otherwise implement optimistic state in a local reducer keyed by `requestId`.

6. Action→Mutation data flow rules (important)
   - Actions should not directly become the “state engine” for the UI; they orchestrate and then Mutations persist the canonical results.
   - Pass `requestId` (and/or `jobId`) end-to-end so Queries can produce a consistent subscribed view.
   - The UI should treat Action return values as hints; the subscription is the authoritative stream.

## Pitfalls to Avoid
- Writing DB state directly in Actions (prefer Mutations for all writes).
- Relying only on the Action’s returned result instead of subscribed Queries.
- Not handling retries/idempotency (duplicate jobs, overwriting completed output).
- UI reconciliation that can’t match optimistic placeholders to server rows (missing `requestId` key).
- Subscription queries that scan large collections without proper indexes.

## Agent Output Format (what to produce)
When using this skill, produce:
1. A short “Plan” describing the AI Job + reactive subscription approach.
2. File-by-file suggestions for Mutations, Actions, Queries, and the client hook wiring.
3. A reconciliation note explaining how optimistic UI is keyed to Convex state.
4. A quick checklist of pitfalls addressed.

