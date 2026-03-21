# Pigeon-eye — agent & AI context

Human and tool-using agents should start here, then drill into scoped files.

| Resource | Purpose |
|----------|---------|
| [`.cursorrules`](./.cursorrules) | Always-on project rules: stack, Vercel, PWA, i18n, Convex, offline report sync. |
| [`.cursor/agents/`](./.cursor/agents/) | Subagent personas: architect, automator, visionary, voice, international. |
| [`.cursor/skills/`](./.cursor/skills/) | Deep skills: convex-master, vision-engineer, workflow-automator, audio-ux. |

## Role map (short)

- **Architect** — Next.js 15 layout, Convex schema boundaries, deploy, PWA, `middleware`, `loading.tsx`, error boundaries for Map/Camera.
- **Visionary** — Vision in Convex actions, Zod, Gemini + Featherless.
- **Automator** — n8n from actions, secrets/HMAC, LangSmith; escalation only when `severity > ESCALATION_SEVERITY_THRESHOLD` (default 7).
- **Voice** — ElevenLabs server-side, browser audio.
- **International** — `messages/de.json` + `messages/en.json`, no hardcoded UI strings.

When adding features, keep **user-visible strings** out of components except via next-intl keys.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
