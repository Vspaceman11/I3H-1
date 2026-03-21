---
name: gemini-3-1-orchestration
description: Orchestrates Gemini 3.1 requests using the Google Generative AI SDK, including multimodal (image) prompting and strictly structured JSON outputs. Use when orchestrating multi-step AI agents/pipelines, when writing Gemini 3.1 SDK calls, when you need “Thinking Mode” optimization for Flash-Lite models, or when implementing a multimodal snapshot loop that must return JSON for the UI.
---

# Gemini 3.1 Orchestration

## Goal
Make Gemini 3.1 calls predictable, low-latency, and UI-safe by enforcing (1) strict JSON output and (2) a clean multimodal input contract, while optimizing for `gemini-3.1-flash-lite-preview` and (if available) “Thinking Mode”.

## Core Orchestration Rules
1. **Define the output schema first** (the model must output JSON that can be validated).
2. **Force JSON-only generation** via SDK settings (prefer `responseMimeType: "application/json"` or the SDK’s equivalent) and prompt constraints.
3. **Keep prompts short for Flash-Lite**: fewer words, fewer examples, smaller context window, and tighter instructions.
4. **Use multimodal parts explicitly**: pass the text instruction and the image payload as separate “parts”.
5. **Retry on validation failure** (not on “wrong answer”): parse JSON, validate with your schema (e.g., Zod), then reprompt with the schema + exact error messages.
6. **Return JSON that the UI can render immediately**: include `requestId` (or a stable key), status, and a versioned payload.

## Flash-Lite + “Thinking Mode” Config Reference
Use these as a starting point (exact parameter names may differ by SDK version):
- `model`: `gemini-3.1-flash-lite-preview`
- `temperature`: `0` to keep output deterministic for JSON
- `maxOutputTokens`: sized for your schema (smaller usually improves latency)
- `responseMimeType`: `application/json` (or SDK’s equivalent JSON mode)
- `thinking`: enable only if supported by your SDK/model; otherwise compensate with a compact prompt and request a *short* `reasoning_summary` field inside JSON (no free-form text)

### Prompting for Thinking Mode
If “Thinking Mode” is available, instruct the model to:
- perform internal reasoning without emitting prose
- only output a `reasoning_summary` (optional) inside JSON

## Implementation Steps (SDK + Orchestration)
1. **Choose/define the JSON schema**
   - Create a TypeScript type (and ideally a runtime validator like Zod).
   - Design for UI: stable keys, minimal nesting, and predictable value types.
2. **Build the system + user instructions**
   - Put the schema description near the end of the instruction (near where the model decides formatting).
   - Add hard constraints: “Return only valid JSON. No markdown. No trailing commas.”
3. **Prepare multimodal inputs (if any)**
   - Use `inlineData`-style image parts:
     - `mimeType`: match your encoded type (e.g. `image/jpeg`)
     - `data`: base64 payload (no `data:image/...;base64,` prefix if your pipeline already strips it)
4. **Call Gemini**
   - Use the Flash-Lite model.
   - Enable JSON mode in SDK config (preferred) and repeat the constraint in the prompt.
5. **Parse + validate**
   - Parse returned text as JSON (or use SDK-returned JSON if it provides one).
   - Validate against the schema.
6. **Retry loop (validation errors only)**
   - If parsing/validation fails:
     - send back the schema and the exact validator errors
     - ask for a corrected JSON object
     - cap retries (e.g., 2 attempts) to protect latency/quotas
7. **Persist the JSON output**
   - Store the validated JSON payload (and `requestId`) as the UI source of truth.

## Multimodal Prompt Template (Strict JSON)
Use this pattern inside your SDK call:

System message (recommended):
```
You are a JSON-only extraction engine.
Return ONLY valid JSON that matches the provided schema.
No markdown. No additional keys. No prose.
```

User message:
```
Task: <one sentence>

Schema (JSON):
<paste or describe schema shape>

Input:
<text instruction or question>
<and image parts are provided separately by the SDK>

Return:
<the JSON object only>
```

## Snapshot Loop Integration (Optional)
If you are implementing the “Snapshot Loop” (Canvas frame every 3-5s -> Convex Action -> Gemini -> JSON):
- Generate the image frame in the frontend using `vision-snapshot-logic`
- Orchestrate the Gemini call inside the Convex action
- Persist validated JSON output using `convex-reactive-backend`

## Agent Output Format (what this skill should produce)
When the user asks for Gemini 3.1 orchestration, produce:
1. A short “Request Plan” (inputs, schema, and retry strategy).
2. A “Gemini Request Spec” describing:
   - chosen model/config knobs (Flash-Lite + JSON mode + Thinking Mode intent)
   - the multimodal parts layout (text + image parts)
   - the strict JSON output contract (keys + types)
3. A “Validation + Retry” note explaining how parse/validate errors are handled.
4. Brief integration pointers to relevant Convex skills if a snapshot loop is involved.

