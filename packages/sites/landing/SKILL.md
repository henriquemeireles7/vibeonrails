# Site Landing

> One-sentence landing page generator. User writes a description in vibe.config.ts, `vibe sites build` generates a complete landing page.

## What This Package Does

Generates a complete landing page from a product description:
- Hero section with headline and CTA
- Features grid
- Pricing table
- Call-to-action section

## How It Works

1. User provides `description` in `vibe.config.ts`
2. Generator reads branding heuristic (content/marketing/heuristics/branding.md)
3. Generator reads product heuristic (content/marketing/heuristics/products/*.md)
4. AI generates section content based on heuristics + description
5. Output is HTML string or structured sections

## Usage

```typescript
import { generateLandingPage } from "@vibeonrails/site-landing";

const page = generateLandingPage({
  description: "AI-powered project management for remote teams",
  brandName: "TeamFlow",
});

console.log(page.html);
```

## Files

- `ai-generator.ts` — Core generation logic
- `ai-generator.test.ts` — Tests
- `index.ts` — Barrel exports
