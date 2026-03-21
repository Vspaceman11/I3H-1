# Pigeon-eye — Community City Reporter

Mobile-first PWA for reporting urban issues in Heilbronn. Built for the Heilbronn Hackathon.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), Tailwind CSS v4, Shadcn UI |
| Backend | Convex (real-time DB, file storage, actions) |
| AI Vision | Google Gemini 2.0 Flash-Lite |
| Voice | ElevenLabs TTS |
| Automation | n8n (municipality escalation webhooks) |
| i18n | next-intl (German / English) |
| Deploy | Vercel |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your API keys in .env.local

# Initialize Convex (creates deployment + generates types)
npx convex dev

# Start development server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (set in Convex dashboard) |
| `ELEVENLABS_API_KEY` | No | ElevenLabs TTS key |
| `N8N_WEBHOOK_URL` | No | n8n webhook endpoint (set in Convex dashboard) |
| `N8N_WEBHOOK_SECRET` | No | Shared secret for webhook auth (set in Convex dashboard) |

## Project Structure

```
app/
  [locale]/          # i18n routing (de/en)
    map/             # Leaflet map with issue markers
    report/          # Camera capture + AI analysis + submit
    leaderboard/     # User ranking by points
    profile/         # User profile + stats
components/
  ui/                # Shadcn-style primitives (Button, Card, etc.)
  map/               # IssueMap, MapErrorBoundary
  report/            # CameraCapture, ReportForm
  layout/            # BottomNav
convex/
  schema.ts          # issues + users tables
  issues.ts          # CRUD queries/mutations
  users.ts           # User queries/mutations
  ai.ts              # Gemini vision action
  n8n.ts             # Municipality escalation action
hooks/
  use-pigeon-voice.ts # ElevenLabs TTS hook
messages/
  de.json            # German translations
  en.json            # English translations
```

## Auth

Using Convex Auth (or Clerk — pick one per deployment). Currently defaults to anonymous reporting. Configure auth in `convex/` and middleware as needed.

## Key Flows

### Report Flow
1. User opens camera → captures photo
2. Photo uploaded to Convex storage
3. Gemini action analyzes image → returns `{ category, severity, description }`
4. User reviews AI suggestion, edits description, submits
5. Issue created in DB with geolocation
6. If `severity > 8` → n8n webhook fires → municipality email
7. Voice feedback: "Dankeschön, Bürger!"

### Build & Deploy

```bash
npm run build    # Vercel-optimized production build
npm run start    # Local production server
```

Push to connected Vercel branch for automatic deployment.
