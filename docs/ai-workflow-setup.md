# AI Workflow Setup Documentation

## Overview

This project is configured with a comprehensive AI development workflow that supports both interactive and autonomous development modes. The workflow is based on best practices for AI-assisted development and provides clear conventions for AI agents to understand and work with the codebase.

## Configuration Summary

### Files Added

1. **AGENTS.md** - Operational brief read by AI agents
   - Project description and tech stack
   - Commands for development workflow
   - Architecture and testing rules
   - Current project status

2. **.cursorrules** - Cursor IDE rules
   - Coding conventions
   - Testing patterns
   - Security guidelines
   - Git workflow rules

3. **loop.sh** - Autonomous execution script
   - Plan mode: Generate implementation plans from specs
   - Build mode: Execute tasks from implementation plans
   - Plan-work mode: Iterative prototyping

4. **AI-WORKFLOW-README.md** - Quick reference guide
   - Configuration checklist
   - Usage instructions
   - Troubleshooting tips

### Directories Added

- **ai-workflow/** - Full workflow system
  - `agents/` - Subagent definitions (architect, code-reviewer, security-reviewer, etc.)
  - `rules/` - Coding guidelines (coding-style, testing, security, git-workflow)
  - `skills/` - Knowledge modules (tdd-workflow, security-review, prisma, etc.)
  - `templates/` - Document templates (ADR, HANDOFF, PROJECT-TASKS)

- **prompts/** - Prompt templates for autonomous mode
  - `PROMPT_plan.md` - Planning prompt
  - `PROMPT_build.md` - Build prompt
  - `PROMPT_plan_work.md` - Iterative work prompt

- **specs/** - Feature specifications
  - `EXAMPLE_SPEC.md` - Template for writing specs

- **sessions/** - Session logs (gitignored)

### Files Modified

- **.gitignore** - Added exclusions for:
  - `sessions/` - Session logs
  - `sessions/*.log` - Log files
  - `sessions/*.md` - Session markdown files
  - `IMPLEMENTATION_PLAN.md` - Generated plan file

## Development Modes

### Interactive Mode (Current)

Standard AI-assisted development with human oversight:

1. **Planning** - Use `planner` agent for features affecting multiple files
2. **TDD** - Write tests first, then implementation (use `tdd-guide` agent)
3. **Code Review** - Use `code-reviewer` agent after changes
4. **Security Review** - Use `security-reviewer` for auth/API/input handling
5. **Commit** - Follow conventional commits (`feat:`, `fix:`, `docs:`, etc.)

### Autonomous Mode (Future)

Headless execution for planned work:

```bash
# Write specification
vim specs/user-auth.md

# Generate plan from specs
./loop.sh plan

# Review plan
cat IMPLEMENTATION_PLAN.md

# Execute plan
./loop.sh build

# Review results
git log --oneline
```

## Key Conventions

### SKILL.md Pattern

Every major module/package should have a SKILL.md that explains:
- What the module does
- How to use it
- Common patterns
- Examples

This helps AI agents understand the codebase structure.

### Barrel Exports

All packages export via barrel pattern:
```typescript
import { createServer } from '@vibeonrails/core/api';
import { createDatabase } from '@vibeonrails/core/database';
import { logger } from '@vibeonrails/infra/logging';
```

### Colocated Tests

Tests live next to implementation:
```
src/
├── auth/
│   ├── jwt.ts
│   ├── jwt.test.ts
│   └── index.ts
```

### Conventional Commits

All commits follow conventional format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `chore:` - Build/tooling changes

## Available Agents

Located in `ai-workflow/agents/`:

- **architect.md** - System design and architecture decisions
- **code-reviewer.md** - Code quality and best practices
- **security-reviewer.md** - Security vulnerability detection
- **e2e-runner.md** - End-to-end testing
- **build-error-resolver.md** - Build and type error fixes
- **refactor-cleaner.md** - Dead code cleanup
- **planner.md** - Feature planning
- **tdd-guide.md** - Test-driven development

## Workflow Integration

### Pre-commit Workflow

The `validate` script runs before every commit:
```bash
pnpm run validate
# Runs: typecheck + lint + test + build + git add .
```

### AI Agent Workflow

1. **Read AGENTS.md** - Get project context
2. **Check rules/** - Understand conventions
3. **Read SKILL.md** - Learn module patterns
4. **Make changes** - Follow TDD
5. **Run validate** - Ensure quality
6. **Commit** - Use conventional format

## Next Steps

1. **Customize Agents**
   - Edit `ai-workflow/agents/*.md` for project-specific patterns
   - Add domain knowledge to agents

2. **Create Skills**
   - Add `ai-workflow/skills/your-domain/SKILL.md`
   - Document project-specific patterns

3. **Write Specs**
   - Add feature specs to `specs/`
   - Use for autonomous mode planning

4. **Test Autonomous Mode**
   - Write a spec
   - Run `./loop.sh plan`
   - Review generated plan
   - Execute with `./loop.sh build`

## Resources

- **Setup Guide**: `ai-workflow/SETUP.md` - Comprehensive setup instructions
- **Vision Document**: `vision.md` - Project philosophy and goals
- **Implementation**: `implementation.md` - Technical implementation details
- **Tasks**: `tasks.md` - Current task list

## Troubleshooting

### AI Agents Don't See Rules
- Verify `.cursorrules` exists at project root
- Check `.cursor/rules/` directory
- Restart Cursor IDE

### Context Window Issues
- Keep AGENTS.md under 80 lines
- Disable unused MCPs/plugins
- Use smaller models for simple tasks

### Loop Script Fails
- Verify `chmod +x loop.sh`
- Check `claude` CLI: `npm install -g @anthropic-ai/claude-code`
- Review logs in `sessions/`

### Embedded Git Repository Warning
- Already resolved by removing `ai-workflow/.git`
- ai-workflow is now tracked as part of main repo

## Validation

All checks passed:
- ✅ TypeScript compilation
- ✅ ESLint checks
- ✅ Tests (63 total, all passing)
- ✅ Build successful
- ✅ Git staging completed

## Configuration Status

- ✅ AGENTS.md configured with project details
- ✅ .cursorrules copied and active
- ✅ loop.sh executable and ready
- ✅ .gitignore updated for sessions/
- ✅ Prompts and specs directories created
- ✅ Documentation complete
- ✅ Validation script tested and working

The AI workflow is fully configured and ready for use!
