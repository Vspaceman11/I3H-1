---
name: audio-ux
description: Guides ElevenLabs TTS integration for the Pigeon product: secure server-side synthesis, streaming playback in the browser, and voice cloning workflow for the Pigeon persona. Use when implementing voice feedback, accessibility read-aloud, streaming audio UI, ElevenLabs API routes, or Pigeon voice identity.
---

# Audio UX (ElevenLabs / Pigeon)

## Scope

Use for **ElevenLabs** text-to-speech: **streaming** to the client, **playback UX** (mobile-first, accessibility), and **voice identity** for the **Pigeon** persona (cloned or preset voice via `voice_id`).

Coordinate with **workflow-automator** when TTS is part of an n8n or email/PDF pipeline; keep **API keys** and billing on the server only.

## Security and placement

1. **`ELEVENLABS_API_KEY` never ships to the browser** — Read only in Node **Route Handlers** (`app/api/.../route.ts`), **Server Actions** (if streaming is supported for your pattern), or **Convex `action`** contexts. Mirror `.cursorrules`: `process.env` with explicit checks; fail closed if missing.
2. **`ELEVENLABS_PIGEON_VOICE_ID`** (or equivalent) — Store the Pigeon persona’s voice id in env; treat as config, not a secret, but still server-only to avoid tampering.
3. **Prefer a thin BFF** — Next.js route receives `{ text, locale? }`, calls ElevenLabs with stream enabled, returns `audio/mpeg` (or negotiated format) as a **streaming** `Response` so the client never sees the key.

## Streaming pattern (browser)

1. **Client** — `fetch('/api/tts/pigeon', { method: 'POST', body: JSON… })`; read `response.body` as a **ReadableStream**; append chunks to **MediaSource** `SourceBuffer` (`audio/mpeg`) or accumulate into a **Blob** and set `audio.src` via `URL.createObjectURL` for simpler cases (higher latency, easier code).
2. **Autoplay policy** — Start playback only after a **user gesture** (tap “Play” / “Listen”) unless the product explicitly handles muted autoplay; surface loading and errors in UI copy (wrapped in **next-intl** per project rules).
3. **Mobile / PWA** — Avoid holding huge buffers; prefer streaming + `MediaSource` for long text. Release object URLs and `MediaSource` on unmount.

## Pigeon persona (voice cloning)

1. **Clone outside the app** — Use ElevenLabs dashboard (IVC / professional clone) to create the voice; copy the **`voice_id`** into `ELEVENLABS_PIGEON_VOICE_ID`.
2. **Single source of truth** — One env-backed id for “Pigeon” across report readback, accessibility, and any shared TTS route; do not hardcode ids in client bundles.
3. **Consistency** — Pick stable model and voice settings (stability/similarity/style) per product spec; document chosen defaults in code comments next to the API call, not in user-facing strings.

## API call shape (server)

- Use ElevenLabs **streaming** endpoint for responsive UX; set headers so the client receives incremental bytes.
- **Validate input** with **Zod** on the server (max length, allowed locales, no raw HTML).
- **Rate-limit** sensitive routes if exposed publicly (same concern as any TTS proxy).

## Convex vs Next route

| Use case | Suggestion |
|----------|------------|
| User taps “Listen” in the app | Next.js **Route Handler** streaming `Response` is usually simplest for `fetch` + browser streams. |
| TTS as part of a longer server workflow | **Convex `action`** can call ElevenLabs; if the client needs audio, return a **short-lived URL** or **storage id** pattern the project defines—avoid giant base64 through Convex. |

## Observability

- If the stack traces LLM calls via LangSmith, add lightweight logging or tracing for **TTS requests** (duration, byte length, errors) without logging full user text if policy-sensitive.

## Checklist

```markdown
Audio UX task progress
- [ ] API key and voice id only on server (env + checks)
- [ ] Input validated (Zod); reasonable max text length
- [ ] Streaming or Blob path chosen for UX/latency tradeoff
- [ ] Playback gated for autoplay; loading/error states in UI
- [ ] i18n for all UI strings; Pigeon voice id from env
- [ ] Cleanup: revoke object URLs / close MediaSource on unmount
```
