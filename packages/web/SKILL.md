# @vibeonrails/web — Frontend Package

## Purpose

The `@vibeonrails/web` package provides everything needed for the frontend: CSS design system, React components, hooks, and routing utilities.

## Imports

```typescript
// Components
import { Button, Input, Select, Modal, Toast } from "@vibeonrails/web/components";
import { FormField } from "@vibeonrails/web/components";
import { DataTable, Card, List } from "@vibeonrails/web/components";
import { PageLayout, Header, Sidebar } from "@vibeonrails/web/components";

// Hooks
import { createApiClient, useAuth, initAuthFromStorage } from "@vibeonrails/web/hooks";

// Routing
import { defineRoutes, flattenRoutes } from "@vibeonrails/web/routing";

// Or import everything
import { Button, useAuth, defineRoutes } from "@vibeonrails/web";
```

## CSS Styles

Import CSS files directly in your app entry:

```typescript
import "@vibeonrails/web/styles/tokens.css";    // Design tokens (colors, spacing, typography)
import "@vibeonrails/web/styles/layout.css";     // Layout utilities (.stack, .row, .gap-*)
import "@vibeonrails/web/styles/components.css";  // Component classes (.btn, .input, .card)
import "@vibeonrails/web/styles/motion.css";     // Animations (.animate-fade-in, .animate-spin)
```

## Package Structure

```
src/
├── styles/                     # CSS design system
│   ├── tokens.css              # CSS custom properties (colors, spacing, radius, shadows)
│   ├── layout.css              # Layout utilities (.stack, .row, gap/padding/width)
│   ├── components.css          # Component classes (.btn, .input, .card, .badge)
│   └── motion.css              # Animations and transitions
├── components/
│   ├── ui/                     # Base UI components
│   │   ├── Button.tsx          # Button (primary, secondary, ghost, danger + sizes + loading)
│   │   ├── Input.tsx           # Input (text, email, password + label + error)
│   │   ├── Select.tsx          # Select dropdown
│   │   ├── Modal.tsx           # Modal dialog (native <dialog>)
│   │   └── Toast.tsx           # Toast notification (success, error, info, warning)
│   ├── forms/
│   │   └── FormField.tsx       # Form field wrapper (label + input + error)
│   ├── data/
│   │   ├── DataTable.tsx       # Sortable table with pagination
│   │   ├── Card.tsx            # Card with title + description
│   │   └── List.tsx            # List with items + click handler
│   └── layout/
│       ├── PageLayout.tsx      # Full page layout (header + sidebar + content)
│       ├── Header.tsx          # App header (logo, nav, actions)
│       └── Sidebar.tsx         # Sidebar navigation
├── hooks/
│   ├── useApi.ts               # tRPC + React Query client factory
│   └── useAuth.ts              # Zustand auth store (login, logout, tokens)
└── routing/
    └── defineRoutes.ts         # Type-safe route definitions
```

## Component Patterns

### Button

```tsx
<Button variant="primary" size="md" loading={isSaving}>
  Save Changes
</Button>
```

Variants: `primary`, `secondary`, `ghost`, `danger`
Sizes: `sm`, `md`, `lg`

### Input with validation

```tsx
<Input
  label="Email"
  type="email"
  error={errors.email?.message}
  helpText="We'll never share your email"
/>
```

### Auth flow

```typescript
const { login, logout, isAuthenticated, user } = useAuth();

// Login
login({ id, email, name }, accessToken, refreshToken);

// Check auth
if (isAuthenticated) { /* show dashboard */ }

// Logout
logout();
```

### tRPC setup

```typescript
import type { AppRouter } from "./router.js";
const { trpc, queryClient, trpcClient } = createApiClient<AppRouter>("/api/trpc");
```

## Dark Mode

Dark mode is automatic via `prefers-color-scheme`, or manual via `data-theme="dark"` on `<html>`.

## Pitfalls

1. **Import CSS first** — Import token.css before other CSS files
2. **React is a peer dep** — Host app must install React 18+ or 19+
3. **tRPC version** — Must match `@trpc/server` version from `@vibeonrails/core`
4. **SSR** — `useAuth` uses localStorage, guard with `typeof window !== "undefined"`
