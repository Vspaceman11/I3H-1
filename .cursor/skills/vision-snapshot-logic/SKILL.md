---
name: vision-snapshot-logic
description: Captures frames from an HTML5 `video` element via Canvas, resizes to 720p, encodes as JPEG (quality 0.7), extracts Base64, and sends it to Convex with minimal latency. Use when implementing a "vision snapshot" (Canvas snapshot / getUserMedia / video frame) and passing the frame to the Convex backend.
---

# Vision Snapshot Logic

## Goal
Implement a fast pipeline "video -> Canvas -> JPEG(0.7) -> Base64 -> Convex" without blocking the UI and without capturing unnecessary frames.

## Frame Quality Requirements
- Maintain a target height of `720` (720p). Pick width proportionally to the source video.
- Encode JPEG with `quality: 0.7`.
- Send Base64 to Convex (typically a string without the `data:image/...;base64,` prefix).

## Low-Latency (Latency) Requirements
- Avoid calling `canvas.toDataURL()` synchronously for every frame (it blocks the main thread). Prefer `canvas.toBlob()` (async).
- Reuse resize and Canvas objects (one `canvas` / `2d context` per component).
- Throttle sending frames (e.g., once every 3-5 seconds, or only after the previous request finishes).
- Limit parallel Convex sends to a single "in-flight" request.

## Implementation Steps (Frontend)
1. Get/show the `video` element (e.g., via `getUserMedia`) and wait for `loadedmetadata` so `video.videoWidth` / `video.videoHeight` are correct.
2. Prepare Canvas:
   - One `canvas` stored in `useRef`.
   - One `2d` context stored in `useRef`.
3. Implement `captureSnapshot(videoEl)`:
   - Compute target sizes for 720p.
   - Set `canvas.width` / `canvas.height`.
   - `drawImage(videoEl, 0, 0, targetW, targetH)`.
   - `canvas.toBlob(cb, "image/jpeg", 0.7)` and convert the Blob to Base64 via `FileReader`.
   - Return the Base64 string (without the data-url prefix).
4. Implement the "snapshot loop":
   - Trigger captures no more often than once every 3-5 seconds (or on a user event).
   - If `isSending` is set, do not send a new frame.
   - Send only Base64 and optional metadata: `width/height`, `timestamp`.

## Integration Steps (Convex Backend)
1. Create a `mutation` (or `action` if needed) that accepts:
   - `imageBase64: string` (and optionally `width`, `height`, `timestamp`).
2. Inside the function:
   - Store the string or decode it to bytes/buffer if needed.
   - Tie into the "Snapshot Loop":
     - Convex Action triggers a vision request
     - Gemini 3.1 receives the frame
     - The model returns strictly structured JSON for the UI

## Error Handling Behavior
- If `video.videoWidth` / `video.videoHeight` are not ready, do not send (wait for `loadedmetadata`).
- If `toBlob` returns `null`, throw/log and do not send an empty string.
- Never block the UI: all heavy steps must be async.

## Example Outcome (What the agent should do)
- Add/update a hook/utility for capturing the frame.
- Add/update the Convex mutation that accepts Base64.
- Connect frame sending to the "snapshot loop".

