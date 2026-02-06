# @aor/cli — CLI for Agent on Rails

## What This Package Does

The CLI that makes Agent on Rails usable. It scaffolds new projects, generates
modules/components from templates, and wraps common dev tasks (dev server, db
operations, build, deploy).

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `aor create <name>` | `create-aor <name>` | Scaffold a new project from the app template |
| `aor generate module <name>` | `aor g m <name>` | Generate a module (types, service, controller, test) |
| `aor dev` | | Start development server with hot reload |
| `aor db migrate` | | Run database migrations |
| `aor db seed` | | Run database seeds |
| `aor db studio` | | Open Drizzle Studio |
| `aor db reset` | | Drop + migrate + seed |
| `aor build` | | Production build |
| `aor deploy [target]` | | Deploy to cloud (coming soon) |

## Architecture

```
packages/cli/
├── bin/                    # Entry points (#!/usr/bin/env node)
│   ├── aor.js
│   └── create-aor.js
├── src/
│   ├── index.ts            # Commander program setup
│   ├── commands/            # CLI command definitions
│   │   ├── create.ts        # aor create
│   │   ├── generate.ts      # aor generate module|component
│   │   ├── dev.ts           # aor dev
│   │   ├── db.ts            # aor db migrate|seed|reset|studio
│   │   ├── build.ts         # aor build
│   │   └── deploy.ts        # aor deploy
│   ├── generators/          # Code generators
│   │   ├── module.generator.ts
│   │   └── app.generator.ts
│   └── utils/               # Template + FS helpers
│       ├── template.ts      # Handlebars helpers (pascalCase, camelCase, etc.)
│       └── fs.ts            # ensureDir, copyDir, replaceInFile
├── templates/
│   ├── app/                 # Full starter project template
│   └── module/              # Module template (Handlebars .hbs files)
└── SKILL.md                 # This file
```

## How Generators Work

1. **Module generator** reads `.hbs` templates from `templates/module/`
2. Handlebars helpers (`{{pascalCase name}}`, `{{camelCase name}}`, etc.) transform the module name
3. Output files: `types.ts`, `<name>.service.ts`, `<name>.controller.ts`, `<name>.service.test.ts`, `index.ts`

## Key Dependencies

- **commander** — CLI framework
- **handlebars** — Template engine for code generation
- **chalk** — Terminal colors
- **ora** — Spinner for async operations

## Adding a New Command

1. Create `src/commands/my-command.ts` with `export function myCommand(): Command`
2. Import and register in `src/commands/index.ts`
3. Add to `src/index.ts` via `program.addCommand(myCommand())`

## Adding a New Generator Template

1. Create `.hbs` files in `templates/<type>/`
2. Use `{{pascalCase name}}`, `{{camelCase name}}`, `{{kebabCase name}}`, `{{snakeCase name}}`
3. Create a generator in `src/generators/` that reads and renders the templates
4. Wire to a command in `src/commands/generate.ts`

## Testing

Tests are colocated next to source files:
- `src/utils/template.test.ts` — Case conversion + Handlebars rendering
- `src/utils/fs.test.ts` — File system helpers
- `src/generators/module.generator.test.ts` — Module generation end-to-end
- `src/generators/app.generator.test.ts` — App scaffolding end-to-end

Run tests: `pnpm run test`
