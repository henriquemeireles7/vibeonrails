# Web: CSS System

The `@vibeonrails/web` CSS system provides a lightweight, token-driven styling foundation built on CSS custom properties. It includes design tokens, layout utilities, component classes, motion/animation presets, and automatic dark mode support — no build step required.

---

## Installation

Import the CSS files in your application:

```typescript
// Import all styles
import "@vibeonrails/web/styles/tokens.css";
import "@vibeonrails/web/styles/layout.css";
import "@vibeonrails/web/styles/components.css";
import "@vibeonrails/web/styles/motion.css";
```

Or import them in your main CSS file:

```css
@import "@vibeonrails/web/styles/tokens.css";
@import "@vibeonrails/web/styles/layout.css";
@import "@vibeonrails/web/styles/components.css";
@import "@vibeonrails/web/styles/motion.css";
```

---

## Design Tokens

All visual values are defined as CSS custom properties on `:root`. This provides a single source of truth for colors, spacing, typography, shadows, radii, transitions, and z-indices.

### Colors

```css
/* Primary */
--color-primary: #2563eb;
--color-primary-hover: #1d4ed8;
--color-primary-light: #dbeafe;

/* Secondary */
--color-secondary: #64748b;
--color-secondary-hover: #475569;

/* Semantic */
--color-success: #16a34a;
--color-success-light: #dcfce7;
--color-warning: #d97706;
--color-warning-light: #fef3c7;
--color-error: #dc2626;
--color-error-light: #fee2e2;
--color-info: #0891b2;
--color-info-light: #cffafe;
```

### Neutrals

```css
--color-white: #ffffff;
--color-black: #0f172a;
--color-bg: #ffffff;
--color-bg-subtle: #f8fafc;
--color-bg-muted: #f1f5f9;
--color-border: #e2e8f0;
--color-border-strong: #cbd5e1;
--color-text: #0f172a;
--color-text-secondary: #475569;
--color-text-muted: #94a3b8;
--color-text-inverse: #ffffff;
--color-overlay: rgb(15 23 42 / 0.5);
```

### Spacing Scale

A consistent spacing scale based on `0.25rem` increments:

```css
--space-0: 0;
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
--space-16: 4rem; /* 64px */
--space-20: 5rem; /* 80px */
```

Usage:

```css
.card {
  padding: var(--space-4);
  margin-bottom: var(--space-6);
  gap: var(--space-2);
}
```

### Typography

```css
/* Font families */
--font-sans:
  system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,
  sans-serif;
--font-mono:
  ui-monospace, "SF Mono", "Fira Code", "Fira Mono", Menlo, monospace;

/* Font sizes */
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem; /* 36px */

/* Line heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

/* Font weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

Usage:

```css
.heading {
  font-family: var(--font-sans);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
}

.code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}
```

### Border Radius

```css
--radius-sm: 0.25rem; /* 4px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem; /* 8px */
--radius-xl: 0.75rem; /* 12px */
--radius-2xl: 1rem; /* 16px */
--radius-full: 9999px; /* Pill shape */
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl:
  0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

### Transitions

```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
```

### Z-Index Scale

```css
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-toast: 1070;
```

---

## Layout Utilities

The `layout.css` file provides utility classes for common layout patterns.

### Containers

```html
<div class="vr-container">Full-width container with max-width and padding</div>
<div class="vr-container-sm">Narrow container (640px)</div>
<div class="vr-container-lg">Wide container (1280px)</div>
```

### Flexbox

```html
<div class="vr-flex">Flex row</div>
<div class="vr-flex vr-flex-col">Flex column</div>
<div class="vr-flex vr-items-center">Vertically centered</div>
<div class="vr-flex vr-justify-between">Space between</div>
<div class="vr-flex vr-gap-4">Gap of var(--space-4)</div>
```

### Grid

```html
<div class="vr-grid vr-grid-cols-2">Two-column grid</div>
<div class="vr-grid vr-grid-cols-3">Three-column grid</div>
<div class="vr-grid vr-grid-cols-4">Four-column grid</div>
```

### Stack (Vertical Spacing)

```html
<div class="vr-stack">
  <p>Each child gets consistent vertical spacing</p>
  <p>Uses gap for clean separation</p>
</div>
```

### Spacing Utilities

```html
<div class="vr-p-4">Padding: var(--space-4)</div>
<div class="vr-px-4">Horizontal padding</div>
<div class="vr-py-4">Vertical padding</div>
<div class="vr-m-4">Margin: var(--space-4)</div>
<div class="vr-mt-8">Margin top: var(--space-8)</div>
```

---

## Component Classes

The `components.css` file provides pre-styled classes for common UI elements.

### Buttons

```html
<button class="vr-btn">Default button</button>
<button class="vr-btn vr-btn-primary">Primary button</button>
<button class="vr-btn vr-btn-secondary">Secondary button</button>
<button class="vr-btn vr-btn-danger">Danger button</button>
<button class="vr-btn vr-btn-ghost">Ghost button</button>
<button class="vr-btn vr-btn-sm">Small button</button>
<button class="vr-btn vr-btn-lg">Large button</button>
```

### Inputs

```html
<input class="vr-input" type="text" placeholder="Enter text..." />
<input class="vr-input vr-input-error" type="text" />
<select class="vr-select">
  <option>Option 1</option>
</select>
<textarea class="vr-textarea" rows="4"></textarea>
```

### Cards

```html
<div class="vr-card">
  <div class="vr-card-header">
    <h3 class="vr-card-title">Card Title</h3>
  </div>
  <div class="vr-card-body">
    <p>Card content goes here.</p>
  </div>
  <div class="vr-card-footer">
    <button class="vr-btn vr-btn-primary">Action</button>
  </div>
</div>
```

### Badges

```html
<span class="vr-badge">Default</span>
<span class="vr-badge vr-badge-success">Active</span>
<span class="vr-badge vr-badge-warning">Pending</span>
<span class="vr-badge vr-badge-error">Failed</span>
```

### Tables

```html
<table class="vr-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td>john@example.com</td>
      <td><span class="vr-badge">Admin</span></td>
    </tr>
  </tbody>
</table>
```

---

## Motion & Animations

The `motion.css` file provides animation utilities and presets.

### Fade In

```html
<div class="vr-animate-fade-in">Fades in on mount</div>
```

### Slide In

```html
<div class="vr-animate-slide-up">Slides up</div>
<div class="vr-animate-slide-down">Slides down</div>
<div class="vr-animate-slide-left">Slides from left</div>
<div class="vr-animate-slide-right">Slides from right</div>
```

### Scale

```html
<div class="vr-animate-scale-in">Scales in from 95%</div>
```

### Spin

```html
<div class="vr-animate-spin">Continuous rotation (loading spinner)</div>
```

### Transition Utilities

```css
.vr-transition {
  transition-property: all;
  transition-duration: var(--duration-normal);
  transition-timing-function: var(--ease-default);
}

.vr-transition-fast {
  transition-duration: var(--duration-fast);
}

.vr-transition-slow {
  transition-duration: var(--duration-slow);
}
```

### Reduced Motion

All animations respect the user's motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are disabled */
  /* Transitions use instant duration */
}
```

---

## Dark Mode

The CSS system supports dark mode in two ways:

### Automatic (System Preference)

Dark mode activates automatically when the user's OS is set to dark mode:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a;
    --color-bg-subtle: #1e293b;
    --color-text: #f1f5f9;
    /* ... all tokens are remapped */
  }
}
```

### Manual Toggle

Use the `data-theme` attribute for a manual dark mode toggle:

```html
<html data-theme="dark">
  <!-- Dark mode is active -->
</html>
```

Toggle with JavaScript:

```typescript
function toggleDarkMode() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  html.setAttribute("data-theme", current === "dark" ? "light" : "dark");
}
```

Persist the user's preference:

```typescript
// Save preference
localStorage.setItem("theme", "dark");

// Load on page start
const theme = localStorage.getItem("theme") ?? "light";
document.documentElement.setAttribute("data-theme", theme);
```

### Dark Mode Token Changes

| Token                    | Light     | Dark      |
| ------------------------ | --------- | --------- |
| `--color-bg`             | `#ffffff` | `#0f172a` |
| `--color-bg-subtle`      | `#f8fafc` | `#1e293b` |
| `--color-bg-muted`       | `#f1f5f9` | `#334155` |
| `--color-border`         | `#e2e8f0` | `#334155` |
| `--color-text`           | `#0f172a` | `#f1f5f9` |
| `--color-text-secondary` | `#475569` | `#94a3b8` |
| `--color-text-muted`     | `#94a3b8` | `#64748b` |

Since all components use these tokens, dark mode works everywhere automatically — no per-component dark mode styles needed.

---

## Customization

### Override Tokens

Override any token in your own CSS:

```css
:root {
  /* Custom brand colors */
  --color-primary: #7c3aed;
  --color-primary-hover: #6d28d9;
  --color-primary-light: #ede9fe;

  /* Custom font */
  --font-sans: "Inter", system-ui, sans-serif;

  /* Custom spacing */
  --space-4: 1.125rem;
}
```

### Scoped Overrides

Override tokens for specific sections:

```css
.marketing-section {
  --color-primary: #059669;
  --color-primary-hover: #047857;
}
```

All components within `.marketing-section` will use the green primary color.

---

## File Reference

| File             | Size | Contents                                                   |
| ---------------- | ---- | ---------------------------------------------------------- |
| `tokens.css`     | ~3KB | Design tokens (colors, spacing, typography, shadows, etc.) |
| `layout.css`     | ~2KB | Layout utilities (flex, grid, container, spacing)          |
| `components.css` | ~4KB | Component classes (buttons, inputs, cards, tables, badges) |
| `motion.css`     | ~2KB | Animations and transition utilities                        |
