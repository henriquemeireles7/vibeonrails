# AI Workflow Configuration

This project is configured with a comprehensive AI development workflow supporting both interactive and autonomous development modes.

## ✅ Configuration Complete

The following has been set up:

### Core Files
- ✅ `AGENTS.md` - Operational brief for autonomous mode (Claude reads this first)
- ✅ `loop.sh` - Autonomous loop script (executable)
- ✅ `.cursorrules` - Cursor IDE rules
- ✅ Updated `.gitignore` - Excludes sessions/ and generated files

### Directories
- ✅ `ai-workflow/` - Full workflow system (agents, rules, skills, templates)
- ✅ `prompts/` - Prompt templates (PROMPT_plan.md, PROMPT_build.md, PROMPT_plan_work.md)
- ✅ `specs/` - Feature specifications (EXAMPLE_SPEC.md included)
- ✅ `sessions/` - Session logs (gitignored)

## Usage

### Interactive Mode (Current)
You're using this now! Work with Cursor's AI assistant with human oversight.

**Workflow:**
1. Use agents when needed (planner, code-reviewer, security-reviewer, etc.)
2. Follow TDD: write tests first, then implement
3. Run `pnpm run validate` before committing
4. Make conventional commits: `feat:`, `fix:`, `docs:`, etc.

### Autonomous Mode (Future)
For headless execution of planned work:

```bash
# 1. Write a spec
vim specs/my-feature.md

# 2. Generate implementation plan
./loop.sh plan

# 3. Review the plan
cat IMPLEMENTATION_PLAN.md

# 4. Execute the plan
./loop.sh build

# 5. Review results
git log --oneline
```

**Loop Modes:**
- `./loop.sh plan` - Generate structured plan from specs
- `./loop.sh build` - Execute existing implementation plan
- `./loop.sh plan-work` - Iterative prototyping mode

## Project-Specific Configuration

### AGENTS.md
Contains project context for AI agents:
- Tech stack: TypeScript, Hono, tRPC, Drizzle, etc.
- Commands: pnpm run dev, test, build, validate
- Architecture rules: SKILL.md pattern, barrel exports, tRPC procedures
- Testing rules: TDD, colocated tests, Vitest

### Available Resources
- `ai-workflow/agents/` - Subagent definitions (architect, code-reviewer, security-reviewer, etc.)
- `ai-workflow/rules/` - Coding guidelines (coding-style, testing, security, git-workflow, etc.)
- `ai-workflow/skills/` - Knowledge modules (tdd-workflow, security-review, frontend-patterns, etc.)
- `ai-workflow/templates/` - Document templates (ADR, HANDOFF, PROJECT-TASKS, etc.)

## Next Steps

1. **Customize agents** - Edit `ai-workflow/agents/*.md` to add project-specific patterns
2. **Add skills** - Create `ai-workflow/skills/your-domain/SKILL.md` for domain knowledge
3. **Write specs** - Add feature specs to `specs/` for autonomous mode
4. **Test loop** - Try `./loop.sh plan` with a spec to verify setup

## Troubleshooting

**AI doesn't see agents:**
- Verify `.cursor/rules/` or `.cursorrules` exists
- Check file paths in your AI tool settings

**Context window too small:**
- Keep AGENTS.md under 80 lines
- Disable unused MCPs/plugins
- Use smaller models for simple tasks

**Loop doesn't run:**
- Check `chmod +x loop.sh`
- Verify `claude` CLI is installed: `npm install -g @anthropic-ai/claude-code`
- Review session logs in `sessions/`

## Documentation

Full setup guide: `ai-workflow/SETUP.md`
