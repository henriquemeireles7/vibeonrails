# @vibeonrails/docs

## Purpose

Documentation framework for VibeonRails projects. Wraps Astro Starlight with conventions, custom components, and Remark plugins so users can scaffold a docs site with `vibe docs init` and start writing immediately.

## Structure

```
packages/docs/
  src/
    presets/          # Starlight config factory + theme + sidebar helpers
      starlight.ts    # createDocsConfig() — main config factory
      sidebar.ts      # Sidebar generation utilities
      theme.ts        # Default VibeonRails theme (CSS custom properties)
      index.ts        # Barrel export
    components/       # Custom MDX components for documentation
      ApiReference.tsx   # Function signature + params table
      CodeExample.tsx    # Tabbed code examples (TS/JS/bash)
      PackageInstall.tsx # pnpm/npm/yarn install command
      PropTable.tsx      # React component props table
      StatusBadge.tsx    # Feature status (stable/beta/experimental)
      index.ts           # Barrel export
    plugins/          # Remark/Rehype plugins
      skill-loader.ts # Include SKILL.md content in docs pages
      api-gen.ts      # Auto-generate API reference from TS types
      index.ts        # Barrel export
    generator/        # AI-powered documentation generator
      types.ts        # Shared types (PackageContext, ExportInfo, etc.)
      extractor.ts    # Walk packages, parse TS exports, read SKILL.md
      templates.ts    # Load and render Handlebars prompt templates
      validator.ts    # Validate generated MDX content
      generator.ts    # Anthropic Claude API integration
      index.ts        # Orchestrator + barrel export
      generator.test.ts # Tests (Claude API mocked)
    index.ts          # Main barrel export
  templates/
    docs-site/        # Template scaffolded by `vibe docs init`
    prompts/          # Handlebars prompt templates for AI generation
      guide-overview.hbs
      guide-detail.hbs
      reference.hbs
      tutorial.hbs
  SKILL.md
  package.json
```

## Usage

### For end users (in their project)

```typescript
// astro.config.mjs
import { createDocsConfig } from '@vibeonrails/docs/presets';

export default createDocsConfig({
  title: 'My Project Docs',
  description: 'Documentation for my project',
});
```

### Custom components in MDX

```mdx
import { PackageInstall, ApiReference, StatusBadge } from '@vibeonrails/docs/components';

<StatusBadge status="stable" />

<PackageInstall package="@vibeonrails/core" />

<ApiReference
  name="createServer"
  signature="createServer(options: ServerOptions): HonoApp"
  params={[
    { name: 'options', type: 'ServerOptions', required: true, description: 'Server configuration' },
  ]}
/>
```

### AI Documentation Generator

```bash
# Generate all docs from codebase
vibe docs generate

# Generate for a specific package
vibe docs generate --package core

# Generate only reference pages
vibe docs generate --type reference

# Preview without writing files
vibe docs generate --dry-run
```

Requires `ANTHROPIC_API_KEY` environment variable. Uses Claude to generate MDX pages from SKILL.md files, TypeScript exports, and JSDoc comments.

The generator follows a three-phase pipeline:
1. **Extract** — ts-morph parses TypeScript AST, reads SKILL.md files
2. **Generate** — Handlebars templates build prompts, Claude produces MDX
3. **Validate** — Checks frontmatter, import paths, and export references

Users can override prompt templates by placing `.hbs` files in `docs/templates/prompts/`.

## Conventions

- Config factory uses "convention over configuration" — sensible defaults, override when needed
- Theme follows VibeonRails brand (indigo accent, Inter font, JetBrains Mono for code)
- Sidebar auto-generates from file structure when not explicitly configured
- All components are React (JSX) for Astro island compatibility

## Pitfalls

- Astro Starlight requires `docsLoader()` in `src/content.config.ts` for Astro 5+
- MDX does not support HTML comments (`<!-- -->`), use `{/* */}` instead
- Peer dependencies (astro, @astrojs/starlight) must be installed by the consumer
- AI generator requires `ANTHROPIC_API_KEY` env var (not bundled, loaded at runtime)
- ts-morph is a heavy dependency (~50MB) — it is external in the bundle and loaded only when generating
