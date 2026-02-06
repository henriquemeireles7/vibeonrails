# Web Components Skill

## Purpose

Place app-specific React components here. Use `@vibeonrails/web/components` for shared UI primitives (Button, Input, Card, Modal, etc.).

## Pattern

```typescript
// src/web/components/MyComponent.tsx
import React from "react";
import { Card, Button } from "@vibeonrails/web/components";

export function MyComponent() {
  return (
    <Card title="My Component">
      <Button>Click me</Button>
    </Card>
  );
}
```

## Generation

Use the CLI to scaffold new components:

```bash
npx vibe generate component MyComponent
```

This creates a component file and test file in the specified directory.
