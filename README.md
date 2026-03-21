# Pigeon-eye — City reporter (Heilbronn)

Mobile-first app: map, photo, reporting. **Business logic and AI run in n8n**; **Convex** stores issues and exposes a secure HTTP ingest for the workflow.

## Stack

| Layer | Role |
|-------|------|
| Next.js | UI |
| n8n | Webhook → validate → vision → severity branches → DB write + email on HIGH |
| Convex | `issues` table, queries for the app, `POST /api/issues` for n8n ingest |

## Setup

```bash
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_CONVEX_URL and ISSUES_INGEST_SECRET (also in Convex Dashboard)

npx convex dev
npm run dev
```

## Environment

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Convex client (browser) |
| `ISSUES_INGEST_SECRET` | Convex Dashboard **and** n8n HTTP node headers | `X-Webhook-Secret` on `POST …/api/issues` |

n8n workflow should call your Convex Site URL, e.g. `https://<deployment>.convex.site/api/issues`, with the same secret the backend expects.

## Convex

- `convex/schema.ts` — `issues` aligned with n8n output (`EASY` / `MEDIUM` / `HIGH`, `issue_id`, etc.)
- `convex/http.ts` — `POST /api/issues` (protected by `X-Webhook-Secret`)
- `convex/issues.ts` — `list`, `getByIssueId`, internal `upsertFromN8n`

## Build

```bash
npm run build
npm run start
```
