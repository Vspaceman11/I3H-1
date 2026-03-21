---
name: workflow-automator
description: Designs n8n workflows and webhook contracts that Convex Actions call for email, PDF, and municipality-style escalation. Covers HMAC or shared-secret verification, payload shapes, and LangChain/LangSmith for RAG-heavy automations. Use when integrating n8n, building outbound webhooks from Convex, automating email or PDF generation, or wiring LangChain RAG into external workflows.
---

# Workflow Automator

## Scope

Use this skill for **n8n orchestration** triggered from **Convex Actions**: webhook design, node choice, retries, and when to add **LangChain** for non-trivial RAG or multi-step LLM flows.

For Convex schema, crons, and internal action boundaries, coordinate with **convex-master**.

## Convex → n8n pattern

1. **Only actions call outbound HTTP** — Public or internal `action` performs `fetch` to the n8n webhook URL; mutations stay fast and DB-only.
2. **Minimal payload** — Send ids, labels, and signed URLs or storage references; avoid huge base64 in JSON. Large files: Convex file storage + short-lived URL or n8n **HTTP Request** to a Convex-authorized fetch route if the project defines one.
3. **Idempotency** — Include a stable `eventId` or `dedupeKey` in the body so n8n (or downstream) can ignore duplicates on retries.
4. **Failure surface** — Catch non-2xx, log or persist `lastError` / `automationStatus` via an internal mutation from the action; do not swallow errors silently.

**Checklist**

```markdown
Convex → n8n task progress
- [ ] Webhook invoked from action, not mutation
- [ ] Payload bounded; no megabyte JSON blobs
- [ ] Dedupe or idempotency key defined
- [ ] Errors recorded for support/debugging
```

## Webhook security

1. **Shared secret** — Store webhook signing secret in Convex env (dashboard); send `Authorization: Bearer …` or `X-Webhook-Secret` consistently; validate in n8n **IF** node or **Crypto** before branching.
2. **HMAC option** — Prefer `X-Signature: sha256=<hmac(body)>` when tamper-evidence matters; n8n verifies with **Crypto** or **Function** node.
3. **No secrets in URLs** — Avoid auth tokens in query strings where logs leak them.

## n8n node guidance

| Goal | Typical nodes |
|------|----------------|
| Receive from Convex | **Webhook** (POST JSON) |
| Branch / guard | **IF**, **Switch**, **Filter** |
| Email | **Send Email** (SMTP) or provider nodes (e.g. Gmail) per project config |
| PDF | **HTML** / template → **Convert to File** or HTTP to a PDF microservice; keep templates versioned in n8n or repo docs |
| HTTP side effects | **HTTP Request** with explicit timeouts; retry via **Error Trigger** workflow or n8n retry settings |
| Queue human steps | **Wait**, **Manual Trigger** sub-workflows, or external task tools as required |

Default: one webhook workflow per domain (e.g. `escalation`, `report-pdf`) so failures and credentials stay isolated.

## LangChain and RAG

1. **When to use LangChain** — Multi-step retrieval, re-ranking, tool use, or structured pipelines that outgrow a single Gemini/HTTP call in Convex. Prefer **Convex Action** for the LLM step when latency and secrets are already there; use n8n to **orchestrate** (call Convex HTTP Action, or call a small LangChain service).
2. **Tracing** — If the project uses LangSmith, trace chain runs with stable run names and correlate `eventId` / `issueId` in metadata.
3. **Grounding** — Keep retrieval boundaries explicit (which index, which filters); return **strict JSON** to the next step (n8n **Set** / **Code**) for UI or email templates.

Do not duplicate RAG in both Convex and n8n without a clear split (e.g. retrieval in Convex, formatting in n8n).

## Observability

- Log webhook response status and truncated body in Convex on failure.
- In n8n, use **Execution** history and error workflows for dead-letter visibility.
- Align with project rule: LangChain/LangSmith for LLM-heavy paths.

## Guardrails

- Do not put API keys in client-side code or public query args.
- Do not block user-facing mutations on n8n availability; enqueue or fire-and-record.
- Do not send PII beyond what the workflow needs; document fields in the webhook contract.

## Coordination with other skills

- **Convex schema, storage, internal actions**: `convex-master`
- **Gemini vision / strict JSON**: `vision-engineer` or project orchestration skill if present
