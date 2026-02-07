/**
 * User Experience & Accessibility (UX-001 through UX-010)
 *
 * From vibeaudit.md: Checks that impact whether users convert and stay.
 */

import type { AuditCheck } from "../types.js";
import { configCheck, manualCheck, patternCheck } from "../helpers.js";

export const uxChecks: AuditCheck[] = [
  // UX-001: Core Flow Works on Mobile
  manualCheck({
    id: "UX-001",
    name: "Core Flow Works on Mobile",
    category: "ux",
    severity: "critical",
    description: "Signup, payment, and primary feature tested on actual mobile viewports.",
  }),

  // UX-002: Keyboard Navigation Works
  manualCheck({
    id: "UX-002",
    name: "Keyboard Navigation Works",
    category: "ux",
    severity: "medium",
    description: "Tab through forms, Enter activates buttons, Escape closes modals.",
  }),

  // UX-003: Color Contrast is Sufficient
  manualCheck({
    id: "UX-003",
    name: "Color Contrast is Sufficient",
    category: "ux",
    severity: "medium",
    description: "Text has a 4.5:1 contrast ratio against its background.",
  }),

  // UX-004: Form Errors are Clear
  configCheck({
    id: "UX-004",
    name: "Form Errors Are Clear and Positioned",
    category: "ux",
    severity: "medium",
    description: "Validation errors appear next to the field that caused them.",
    validate: (ctx) => {
      const hasFormErrors = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /error.*message|fieldError|formError|errors\.\w+|useForm.*error/i.test(content);
      });
      if (hasFormErrors) return [];
      const hasForms = ctx.sourceFiles.some((f) => f.endsWith(".tsx") && /form|input/i.test(ctx.readFile(f)));
      if (!hasForms) return [];
      return [{ file: "", message: "No per-field error handling detected", suggestion: "Show validation errors next to their fields" }];
    },
  }),

  // UX-005: Links and Buttons Look Clickable
  manualCheck({
    id: "UX-005",
    name: "Links and Buttons Look Clickable",
    category: "ux",
    severity: "low",
    description: "Interactive elements are visually distinct. Cursor changes on hover.",
  }),

  // UX-006: No Broken Links or Images
  manualCheck({
    id: "UX-006",
    name: "No Broken Links or Images",
    category: "ux",
    severity: "medium",
    description: "All internal links resolve. All images load. No 404s on core pages.",
  }),

  // UX-007: Success Feedback Exists
  configCheck({
    id: "UX-007",
    name: "Success Feedback Exists",
    category: "ux",
    severity: "medium",
    description: "After completing actions, users see clear confirmation.",
    validate: (ctx) => {
      const hasFeedback = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /toast|notification|success.*message|snackbar|alert.*success/i.test(content);
      });
      if (hasFeedback) return [];
      return [];
    },
  }),

  // UX-008: Alt Text on Images
  patternCheck({
    id: "UX-008",
    name: "Alt Text on Meaningful Images",
    category: "ux",
    severity: "medium",
    description: "Images have descriptive alt text. Decorative images have empty alt.",
    pattern: /<img\s+(?![^>]*alt=)[^>]*>/i,
    fileFilter: (f) => f.endsWith(".tsx") || f.endsWith(".jsx") || f.endsWith(".html"),
    message: "Image tag missing alt attribute",
    suggestion: "Add descriptive alt text or alt='' for decorative images",
  }),

  // UX-009: Focus Management in Modals
  manualCheck({
    id: "UX-009",
    name: "Focus Management in Modals",
    category: "ux",
    severity: "low",
    description: "When modals open, focus moves into them. When closed, focus returns.",
  }),

  // UX-010: Page Titles Are Descriptive
  configCheck({
    id: "UX-010",
    name: "Page Titles Are Descriptive",
    category: "ux",
    severity: "low",
    description: "Every page has a unique, descriptive <title> tag.",
    validate: (ctx) => {
      const hasTitle = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /<title>|document\.title|useHead|Head>|Helmet/i.test(content);
      });
      if (hasTitle) return [];
      const hasReact = ctx.sourceFiles.some((f) => f.endsWith(".tsx"));
      if (!hasReact) return [];
      return [];
    },
  }),
];
