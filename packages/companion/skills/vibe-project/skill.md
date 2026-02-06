---
name: vibe-project
description: Run any Vibe on Rails CLI command from OpenClaw
version: 1.0.0
min_openclaw_version: "0.5.0"
skill_format_version: "1.0"
author: vibeonrails
tags:
  - cli
  - project-management
  - development
---

# Vibe on Rails Project Skill

You can run any `vibe` CLI command to manage a Vibe on Rails project.

## Available Commands

### Project Management

- `npx vibe dev` — Start the development server
- `npx vibe build` — Build for production
- `npx vibe generate module <name>` — Generate an API module
- `npx vibe generate component <name>` — Generate a React component

### Database

- `npx vibe db migrate` — Run pending migrations
- `npx vibe db seed` — Run seed scripts
- `npx vibe db reset` — Drop, recreate, migrate, seed
- `npx vibe db studio` — Open Drizzle Studio

### Module Management

- `npx vibe modules list` — List all available modules
- `npx vibe add <module>` — Smart-install a module
- `npx vibe remove <module>` — Clean-remove a module

### Content

- `npx vibe content reindex` — Rebuild content index

## Safety Rules

1. **Never run destructive commands without confirmation**: `db reset`, `remove` require explicit user approval.
2. **Always run in the project root directory**: Commands expect to find `package.json` and `vibe.config.ts`.
3. **Check command success**: Verify exit code 0 before reporting success.
4. **Capture output**: Always capture and parse command output for the user.

## Output Formatting

When reporting command results:

- Show success/failure status clearly
- Include relevant output lines (not the full log)
- For errors, include the error message and suggested fix
- For `vibe dev`, report the server URL
- For `vibe build`, report build time and output size

## Examples

User: "Start the dev server"
Action: Run `npx vibe dev` and report the server URL.

User: "Create a new orders module"
Action: Run `npx vibe generate module orders` and report created files.

User: "Reset the database"
Action: Confirm with user first, then run `npx vibe db reset`.
