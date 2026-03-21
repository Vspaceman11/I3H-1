---
name: v0-app-integration
description: Converts `v0.app` generated React/TSX UI code into modular, production-ready React components using Shadcn UI, Tailwind, and (when applicable) Lucide icons. Use when the user mentions `v0.app`, pastes v0-generated code, or asks to convert/refactor v0 UI.
---

# V0 App -> Shadcn Integration

## Goal
Refactor `v0.app` generated UI code into clean, maintainable React components aligned with a Next.js + TypeScript + Tailwind + Shadcn UI codebase.

## Core Rules
1. Preserve the intended UI/behavior from the v0 output (no visual “drift” unless explicitly requested).
2. Eliminate inline `style={...}` when a Tailwind equivalent exists.
3. Replace plain UI primitives with Shadcn UI components where semantically appropriate (buttons, cards, inputs, dialogs, tabs, etc.).
4. Replace inline SVG icons with Lucide icons (`lucide-react`) when there is a clear match.
5. Extract subcomponents and add typed props (`type` / `interface`) for modularity and readability.
6. Use `className` + a `cn` helper (if the repo already has one) for conditional/combined classes.
7. Next.js rule: add `"use client"` only to components that use React hooks, event handlers, or browser-only APIs.
8. Prefer composition: lift state up only when the v0 code implies it’s needed; otherwise keep components presentational.
9. Keep imports consistent with project conventions (path aliases, file structure, existing Shadcn import locations).

## Refactor Workflow (follow in order)
1. Identify the v0 “shape”
   - Determine the main exported component(s).
   - Identify logical UI sections (hero, header, cards grid, forms, pricing rows, etc.).
   - Identify any interactive elements (dialogs, tabs, dropdowns, forms).
2. Discover repo conventions (lightweight scan)
   - Find where Shadcn UI components live (commonly `components/ui/*` or `src/components/ui/*`).
   - Find the `cn` helper location (commonly `@/lib/utils`) or reuse the repo’s existing pattern.
   - Note the preferred import alias (commonly `@/`).
3. Tailwind conversion
   - Convert `style={...}` into Tailwind utility classes.
   - For complex CSS (gradients, uncommon values), use Tailwind arbitrary values (`bg-[...]`, `text-[...]`, etc.) when practical.
   - Keep class strings readable: avoid huge single-line blobs; split into subcomponents when needed.
4. Shadcn mapping
   - Replace elements with their Shadcn counterparts when they match semantics:
     - `<button>` -> `Button`
     - Card-like containers -> `Card` / `CardHeader` / `CardContent` (or the closest available equivalents)
     - Text inputs -> `Input` / `Textarea`
     - Badges -> `Badge`
     - Dialogs -> `Dialog`, `DialogContent`, etc. (use the Shadcn patterns the repo already uses)
     - Tabs -> `Tabs` + triggers/list/panels (when applicable)
   - Preserve the v0 visual intent by using Shadcn `variant` / `size` props.
5. Lucide icons
   - Replace inline SVG icons with `lucide-react` imports.
   - Preserve size and stroke/fill behavior consistent with your design system (typically use `size={...}` and rely on Tailwind classes).
6. Modularity + types
   - Extract subcomponents for repeated markup or meaningful UI sections.
   - Create typed props for subcomponents (keep props minimal and intention-revealing).
   - If you introduce configuration objects (e.g., feature arrays), type them.
7. Client/server boundaries
   - Add `"use client"` only where needed.
   - Keep presentational components server-compatible when they don’t use hooks/events.
8. Cleanup + verification
   - Remove unused imports.
   - Ensure no remaining inline `style={...}` for simple layout/spacing/color.
   - Ensure TypeScript types are correct and imports resolve.
   - If tooling exists in the repo, run the equivalent of `npm run lint` and `tsc --noEmit` (or `npm run typecheck`).

## Handling Ambiguity
- If v0 code is missing semantic intent (e.g., it uses generic divs), infer the most likely Shadcn component based on structure and accessibility roles.
- If a style cannot be cleanly converted to Tailwind/Shadcn without changing appearance, keep the minimum necessary custom styling using Tailwind arbitrary values rather than raw inline `style`.

## Agent Output Format
### When the user asks for full component files
1. Provide a `## File plan` section listing each file path you will output.
2. For each file, provide:
   - `### <path>`
   - a fenced code block containing the full file contents (not partial snippets).

### When the user asks for plan-only
Provide:
1. A brief `## Refactor Plan` describing the component splits and mappings (Tailwind/Shadcn/Lucide).
2. A `## Proposed File Structure` list.

### When the user asks for patch-like snippets
Provide:
1. `## Refactor Plan`
2. For each file: a short “what to change” note plus focused code snippets (only the changed/added parts).

## Examples
User input:
- “Here’s the UI v0.app generated code. Convert it into Shadcn components with Tailwind and modular React components.”

Expected skill behavior:
- Identify sections, extract subcomponents, replace primitives with Shadcn, convert inline styles to Tailwind classes, and swap inline SVG icons for Lucide icons.

