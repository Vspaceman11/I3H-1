# Examples

## Frontend: `captureSnapshot` (TS/React)

```typescript
// Inside a component/hook
const canvasRef = useRef<HTMLCanvasElement | null>(null);
const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
const [isSending, setIsSending] = useState(false);

async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      // data:image/jpeg;base64,AAAA...
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.readAsDataURL(blob);
  });
}

async function captureSnapshot(videoEl: HTMLVideoElement): Promise<string> {
  if (!videoEl.videoWidth || !videoEl.videoHeight) {
    throw new Error("Video metadata not ready");
  }

  const targetH = 720;
  const scale = targetH / videoEl.videoHeight;
  const targetW = Math.max(1, Math.round(videoEl.videoWidth * scale));

  if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
  const canvas = canvasRef.current;
  canvas.width = targetW;
  canvas.height = targetH;

  if (!ctxRef.current) ctxRef.current = canvas.getContext("2d", { willReadFrequently: false });
  const ctx = ctxRef.current;
  if (!ctx) throw new Error("2d context unavailable");

  ctx.drawImage(videoEl, 0, 0, targetW, targetH);

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.7);
  });
  if (!blob) throw new Error("toBlob returned null");

  return await blobToBase64(blob);
}
```

## Frontend: snapshot loop with throttling (every 3-5 seconds)

```typescript
const lastSentRef = useRef(0);

async function maybeSendSnapshot(videoEl: HTMLVideoElement, sendConvex: (args: any) => Promise<void>) {
  const now = Date.now();
  if (now - lastSentRef.current < 3000) return;
  if (isSending) return;

  setIsSending(true);
  lastSentRef.current = now;
  try {
    const imageBase64 = await captureSnapshot(videoEl);
    await sendConvex({ imageBase64, timestamp: now });
  } finally {
    setIsSending(false);
  }
}
```

## Convex: mutation accepts Base64

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const sendVisionSnapshot = mutation({
  args: { imageBase64: v.string(), timestamp: v.number() },
  handler: async (ctx, args) => {
    // Option 1: store the string in the DB (if the size is acceptable)
    // await ctx.db.insert("vision_snapshots", { imageBase64: args.imageBase64, timestamp: args.timestamp });

    // Option 2: decode when needed (example)
    // const bytes = Buffer.from(args.imageBase64, "base64");
  },
});
```

