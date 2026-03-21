---
name: sync-dotcursor-skills-to-cursor
description: Copies skill directories from the repository `.cursor/skills/` into `~/.cursor/skills/` exactly as they exist—no new skills, no edits to skill bodies. Use when the user asks to add project .cursor skills to Cursor Skills, sync skills to personal Skills, or mirror `.cursor/skills` after clone.
---

# Sync `.cursor/skills` to Cursor Skills

## Instructions

1. **Source**: `<workspace root>/.cursor/skills/` — only subdirectories that contain a `SKILL.md` at `.../<skill-name>/SKILL.md`.

2. **Destination**: `~/.cursor/skills/<skill-name>/` (same folder name as in the repo).

3. **Copy**: For each qualifying skill directory, copy the **entire directory** (including `SKILL.md`, `reference.md`, `examples.md`, `scripts/`, etc.) from source to destination. Prefer replacing/merging so Cursor sees the same files as the repo.

4. **Do not add anything new**:
   - Do not create skill folders that are not already under `.cursor/skills/`.
   - Do not add sections, examples, or scripts that are not already present in the source files.
   - Do not rewrite or expand `SKILL.md` content beyond what exists in the repository.

5. **Skip** if `.cursor/skills` is missing or has no `*/SKILL.md` — report that; do not invent placeholder skills.

6. **Never** write skills into `~/.cursor/skills-cursor/` (reserved for Cursor).

## Verification

- After copy, each synced skill should have `~/.cursor/skills/<skill-name>/SKILL.md` byte-for-byte the same as the repo copy (or identical tree if the user already had local changes—default to matching repo when syncing).
