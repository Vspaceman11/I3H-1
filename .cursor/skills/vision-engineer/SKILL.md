---
name: vision-engineer
description: Designs Google Gemini 3.1 multimodal prompts, image preprocessing for low-latency vision classification, and strict JSON outputs; documents Featherless AI fallback with Llama-3-Vision. Use when tuning VLM calls, snapshot/canvas vision loops, image payloads, or swapping between Gemini and open-weight vision models.
---

# Vision Engineer

## Scope

Multimodal **classification and structured extraction** with **latency-first** defaults. Heavy reasoning or dense OCR belongs behind explicit product requirements, not the default path.

## Model routing

| Role | Model | When |
|------|--------|------|
| Primary | Gemini 3.1 Flash-Lite (project default for vision) | Default for snapshot loops, real-time or near-real-time frames |
| Backup | Featherless AI + **Llama-3-Vision** (or project’s open-weight vision slot) | Gemini outage, policy/cost constraints, or A/B against proprietary APIs |

**Rules**

- Keep the **model id in one place** (env or shared constant); update aliases when providers rename stable models.
- Run vision in **Convex Actions** (or other server/edge routes), not in client bundles; read `GEMINI_API_KEY` and Featherless credentials via `process.env` with guards.
- Trace calls with **LangSmith/LangChain** when the project already instruments LLM usage.

## Image optimization (latency)

Goal: smallest payload that still preserves the **signals** the prompt asks for (labels, hazards, text blocks).

1. **Resize** — Cap longest edge (typical range **512–1024px** for classification; raise only if fine detail is required). Never send full camera resolution by default.
2. **Format** — Prefer **JPEG** at moderate quality or **WebP** for smaller bytes at similar perceptual quality; avoid uncompressed PNG for photo-like frames.
3. **Color** — **RGB**; strip unnecessary alpha unless transparency matters.
4. **Metadata** — Strip EXIF before encode when privacy or size matters.
5. **Batching** — One frame per request unless the task truly needs multiple views; parallel requests only when the pipeline allows.

**Checklist**

```markdown
Vision payload
- [ ] Longest edge capped; aspect ratio preserved
- [ ] Chosen codec minimizes bytes vs. task needs
- [ ] No secrets or PII in filenames/metadata
- [ ] Base64/data URL size acceptable for timeout budget
```

## Prompt design (Gemini multimodal)

1. **Task-first** — Lead with the decision the model must make (e.g. “classify this street scene for municipal reporting”).
2. **Output contract** — Require **single JSON object** matching a fixed schema; forbid markdown fences and prose outside JSON when the consumer is code.
3. **Labels** — Closed-set categories when possible; define an explicit `"unknown"` / `"not_visible"` escape hatch.
4. **Ambiguity** — Instruct how to behave on blur, occlusion, night shots, and partial views (short bullets, not essays).
5. **Few-shot** — Use **0–1** tiny examples for latency; add more only if metrics show a clear win.

## Validation

- Define the response shape with **Zod** (or equivalent) on the server; reject and optionally retry once with a “repair to valid JSON” instruction if the pipeline allows.
- Do not use `any` in Convex actions for parsed model output.

## Featherless / Llama-3-Vision fallback

- Mirror the **same JSON schema** and image preprocessing so UI and storage do not branch per provider.
- Abstract a single `classifyFrame({ imageBytes, mimeType, locale })` (or similar) that swaps implementation based on config.
- Confirm the Featherless endpoint expects **multipart**, base64, or URL references per their docs; align `mimeType` and dimensions with their limits.

## Snapshot loop pattern (project default)

Canvas or camera frame every **3–5s** → Action → vision model → **strict JSON** → Convex mutation / UI. Tune interval against cost, battery, and motion blur.

## Anti-patterns

- Sending **4K** frames for coarse tagging.
- Long unstructured prompts when a **schema + 5 bullet constraints** suffices.
- Parsing model output without **schema validation**.
- Hardcoding API keys or model strings in client code.
