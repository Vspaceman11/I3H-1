---
name: convex-master
description: Guides Convex schema design, auth configuration, file storage, scheduled/internal background work, and subscription-friendly data modeling. Use when editing convex/schema.ts or auth files, implementing uploads, crons, internal actions, or hardening real-time query boundaries.
---

# Convex Master

## Scope

Use this skill for **platform-level Convex**: `schema.ts`, auth setup, **file storage**, and **background execution** (scheduled and internal functions).

## Client reactivity & AI handoffs

- **`useQuery` / `useMutation` / `useAction`** on the client for live UI; keep args stable to limit subscription churn.
- **Optimistic UI**: update local expectations in the mutation path where product needs instant feedback; reconcile on Convex confirmation.
- **Action → mutation pattern**: actions call external APIs and heavy work; **persist results** via `ctx.runMutation` (internal or public) so the UI stays subscription-driven — never leave successful AI writes only in the action return value without DB backing when the UI must react.
- For **Gemini / strict JSON** prompts and validation in actions, use the **vision-engineer** skill.

## schema.ts

1. **Define tables with validators** — Every field uses `v.*`; avoid `v.any()` in production paths.
2. **Index every real query** — If a query filters or orders, add an index; document why each index exists.
3. **Keep documents bounded** — Large blobs belong in file storage with a `storageId` reference, not inlined base64 in documents.
4. **System fields** — Use `_creationTime` where it fits; add explicit `updatedAt` when ordering by “last change” matters.
5. **Relationships** — Prefer explicit foreign keys (`userId`, `issueId`) plus indexes; avoid hidden coupling across tables.

**Checklist**

```markdown
Schema task progress
- [ ] Table shapes match UI and mutation write paths
- [ ] Indexes cover filter + sort combinations
- [ ] No unbounded arrays on hot documents
- [ ] File metadata table or fields if using storage
- [ ] Strict validators; optional fields use v.optional(...) intentionally
```

## Auth (`auth.config.ts` / project `auth.ts`)

1. **Single source of truth** — Auth config lives with Convex; Next.js (or other clients) only forwards tokens Convex accepts.
2. **Identity in functions** — Use `ctx.auth.getUserIdentity()` in queries/mutations/actions that need it; never trust client-sent user ids without verification.
3. **Authorization in mutations** — Check ownership or roles before writes; queries should filter by authenticated user when data is private.
4. **Secrets** — Provider keys and JWT config via Convex dashboard / env; never embed secrets in client bundles.

## Real-time subscriptions

1. **Arguments must be serializable** — Subscription queries use plain args; keep them stable to avoid churn.
2. **Narrow projections** — Return only fields the UI needs; split “detail” vs “list” queries.
3. **Pagination** — Use `.paginate()` or cursors for large lists so initial subscription payload stays small.

## File storage

1. **Upload flow** — Mutation or action generates an upload URL; client `POST`s file; store returned `storageId` on a document (and optional metadata: name, mime, size).
2. **Serve files** — Use `ctx.storage.getUrl(storageId)` in queries/actions as needed; respect auth before exposing URLs.
3. **Lifecycle** — On delete/replace, call `ctx.storage.delete(storageId)` when the file is truly obsolete to avoid orphaned blobs.

## Background actions and jobs

1. **Mutations stay fast** — No network or heavy CPU in mutations; offload to **actions** or **internal** functions.
2. **Scheduled work** — Use Convex crons to trigger **internal** mutations/actions; keep handlers idempotent (safe if run twice).
3. **Internal-only entry points** — Use `internalQuery` / `internalMutation` / `internalAction` for cron and chaining; never expose privileged jobs as public functions.
4. **Retries** — External calls in actions should handle transient failures; persist a `status` + `lastError` for observability and manual retry.

**Checklist**

```markdown
Background task progress
- [ ] Public surface is minimal; heavy work is internal or scheduled
- [ ] Cron handler is idempotent
- [ ] Long external calls only in actions
- [ ] Failures recorded on documents for debugging
```

## Guardrails

- Do not perform unauthenticated reads of private storage URLs.
- Do not block mutations on third-party APIs — schedule or action instead.
- Do not add indexes “just in case”; add them for proven query patterns.

## Coordination with other skills

- **Vision prompts, image payload, provider fallback**: skill **vision-engineer**
- **n8n webhooks, HMAC, LangChain in workflows**: skill **workflow-automator**
