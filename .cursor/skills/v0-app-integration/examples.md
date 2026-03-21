# v0 App -> Shadcn Integration Examples

## Example 1: Paste v0 TSX
User input:
- “Here’s the UI v0.app generated React/TSX. Refactor it into modular components using Shadcn UI, Tailwind, and Lucide. Remove inline styles.”

Expected behavior:
- Split the main component into logical subcomponents (e.g., `Hero`, `FeatureGrid`, `PricingSection`).
- Replace inline SVG icons with `lucide-react` icons.
- Replace primitive UI (buttons/inputs/cards/dialog shells) with Shadcn equivalents.
- Convert `style={...}` to Tailwind classes (using arbitrary values only when needed).
- Output full updated files (with `## File plan` + full code blocks per file).

## Example 2: v0 dialog/forms
User input:
- “Convert this v0.app form + dialog into Shadcn `Dialog` and Shadcn `Input`/`Textarea` components, with typed props.”

Expected behavior:
- Map the dialog markup to `Dialog`/`DialogContent` patterns used in the repo.
- Ensure accessible labeling (`aria-label` / `<label htmlFor>`).
- Add prop types for the form component and any callbacks.
- Add `"use client"` only if the form uses hooks or client-only behavior.

