# Planning System

## Purpose

The `.plan/` directory is your project's single source of truth for AI agents and human developers. It provides context, decisions, and roadmap so any contributor (human or AI) can quickly understand where the project is.

## Files

| File | Purpose |
|------|---------|
| `PROJECT.md` | High-level project overview — what this app does |
| `CONTEXT.md` | Technical context — stack, constraints, key decisions |
| `ROADMAP.md` | Feature roadmap — what's planned, what's done |
| `CURRENT.md` | Current sprint / active work |
| `DECISIONS.md` | Decision log — why we chose X over Y |

## How to Use

1. **Starting a new feature**: Read `CURRENT.md` to see what's active, then update it with your task
2. **Making an architectural decision**: Log it in `DECISIONS.md` with reasoning
3. **Onboarding an AI agent**: Point it to `PROJECT.md` → `CONTEXT.md` → `CURRENT.md`
4. **Sprint planning**: Update `ROADMAP.md` with priorities, then set `CURRENT.md`

## Convention

- Keep files concise — they're meant to be read quickly
- Use bullet points over paragraphs
- Update after completing each milestone
- Date your entries in `DECISIONS.md`
