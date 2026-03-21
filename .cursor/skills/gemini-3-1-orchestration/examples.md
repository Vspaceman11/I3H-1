# Examples

## Example 1: Multimodal extraction (image -> structured JSON)

### JSON schema (UI-safe)
```ts
type Output = {
  requestId: string;
  version: 1;
  status: "ok";
  fields: Array<{
    name: string;            // e.g. "invoice_number"
    value: string;          // extracted value
    confidence: number;     // 0..1
  }>;
  reasoning_summary?: string; // optional: short, JSON-only
};
```

### Parts layout (text + image)
Text should be one part; the image should be another part (base64 JPEG):
```ts
const parts = [
  { text: "Extract the fields from the image. Return JSON only." },
  { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
];
```

### Prompt constraint (JSON-only)
System:
```text
You are a JSON-only extraction engine.
Return ONLY valid JSON that matches the provided schema.
No markdown. No additional keys. No prose.
```

User:
```text
Task: Extract invoice fields from the provided image.

Schema (JSON):
{ "requestId": "string", "version": 1, "status": "ok",
  "fields": [{ "name": "string", "value": "string", "confidence": "number" }],
  "reasoning_summary"?: "string" }

Return: the JSON object only
```

### Expected output (example)
```json
{
  "requestId": "req_123",
  "version": 1,
  "status": "ok",
  "fields": [
    { "name": "invoice_number", "value": "INV-1042", "confidence": 0.92 },
    { "name": "total", "value": "$1,280.00", "confidence": 0.86 }
  ],
  "reasoning_summary": "Detected typical invoice layout and read labeled fields."
}
```

## Example 2: Validation + retry loop (parse/validate errors only)

### Orchestration logic (high-level)
1. Call Gemini in JSON mode.
2. Parse response into JSON.
3. Validate with schema.
4. If validation fails:
   - reprompt with the schema + validator errors
   - ask for a corrected JSON object
   - cap retries to protect latency

### Retry prompt payload (validation errors -> schema fix)
```text
Your previous response did not match the JSON schema.
Validator errors:
<paste exact errors>

Return a corrected JSON object that matches the schema exactly.
Rules:
- JSON only
- no markdown
- no extra keys
```

## Example 3: Snapshot Loop wiring (Canvas -> Gemini -> JSON)

When implementing the “Snapshot Loop”:
- Frontend captures frames with `vision-snapshot-logic` (throttle to once every ~3-5s)
- Convex Action calls Gemini 3.1 Flash-Lite with JSON mode
- Convex stores validated JSON as the UI source of truth

The Gemini output contract should include `requestId` so the UI can reconcile optimistic placeholders with the subscribed Convex job row.

