/**
 * One-Sentence Landing Page Generator
 *
 * User writes `description: "AI-powered project management for remote teams"`
 * in vibe.config.ts. `vibe sites build` generates a complete landing page:
 * hero, features grid, pricing, CTA.
 *
 * AI reads branding heuristic + product heuristic from content/ directory.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LandingPageConfig {
  /** One-sentence product description */
  description: string;
  /** Brand/product name */
  brandName: string;
  /** Path to project root (for reading heuristics) */
  projectRoot?: string;
  /** Custom features (overrides auto-generation) */
  features?: Feature[];
  /** Custom pricing tiers */
  pricing?: PricingTier[];
  /** Custom CTA text */
  ctaText?: string;
  /** Custom CTA URL */
  ctaUrl?: string;
}

export interface Feature {
  title: string;
  description: string;
  icon?: string;
}

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
  ctaText?: string;
}

export interface BrandingHeuristic {
  tone: string;
  vocabulary: string[];
  writingStyle: string;
  colorScheme?: string;
}

export interface ProductHeuristic {
  usp: string;
  methodology: string;
  ahaMoment: string;
  targetAudience: string;
}

export interface LandingPageSection {
  id: string;
  html: string;
}

export interface LandingPageOutput {
  html: string;
  sections: LandingPageSection[];
  meta: {
    title: string;
    description: string;
    brandName: string;
  };
}

// ---------------------------------------------------------------------------
// Heuristic Parsers
// ---------------------------------------------------------------------------

/** Parse branding heuristic from markdown frontmatter. */
export function parseBrandingHeuristic(content: string): BrandingHeuristic {
  const lines = content.split("\n");
  const heuristic: BrandingHeuristic = {
    tone: "professional",
    vocabulary: [],
    writingStyle: "concise",
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("tone:")) {
      heuristic.tone = line.slice(5).trim();
    } else if (lower.startsWith("vocabulary:")) {
      heuristic.vocabulary = line
        .slice(11)
        .trim()
        .split(",")
        .map((w) => w.trim());
    } else if (lower.startsWith("writing-style:") || lower.startsWith("writing_style:")) {
      heuristic.writingStyle = line.slice(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("color-scheme:") || lower.startsWith("color_scheme:")) {
      heuristic.colorScheme = line.slice(line.indexOf(":") + 1).trim();
    }
  }

  return heuristic;
}

/** Parse product heuristic from markdown. */
export function parseProductHeuristic(content: string): ProductHeuristic {
  const heuristic: ProductHeuristic = {
    usp: "",
    methodology: "",
    ahaMoment: "",
    targetAudience: "",
  };

  const lines = content.split("\n");
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("usp:")) {
      heuristic.usp = line.slice(4).trim();
    } else if (lower.startsWith("methodology:")) {
      heuristic.methodology = line.slice(12).trim();
    } else if (lower.startsWith("aha-moment:") || lower.startsWith("aha_moment:")) {
      heuristic.ahaMoment = line.slice(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("target-audience:") || lower.startsWith("target_audience:")) {
      heuristic.targetAudience = line.slice(line.indexOf(":") + 1).trim();
    }
  }

  return heuristic;
}

/** Load branding heuristic from project content directory. */
function loadBrandingHeuristic(
  projectRoot: string,
): BrandingHeuristic | null {
  const brandingPath = join(
    projectRoot,
    "content/marketing/heuristics/branding.md",
  );
  if (!existsSync(brandingPath)) return null;
  return parseBrandingHeuristic(readFileSync(brandingPath, "utf-8"));
}

/** Load the first product heuristic found. */
function loadProductHeuristic(
  projectRoot: string,
): ProductHeuristic | null {
  const productsDir = join(
    projectRoot,
    "content/marketing/heuristics/products",
  );
  if (!existsSync(productsDir)) return null;

  try {
    const files = readdirSync(productsDir).filter((f: string) =>
      f.endsWith(".md"),
    );
    if (files.length === 0) return null;
    const content = readFileSync(join(productsDir, files[0]!), "utf-8");
    return parseProductHeuristic(content);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Section Generators
// ---------------------------------------------------------------------------

/** Escape HTML special characters. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Generate the hero section. */
export function generateHeroSection(config: LandingPageConfig): string {
  const headline = config.brandName;
  const subheadline = config.description;
  const cta = config.ctaText ?? "Get Started";
  const ctaUrl = config.ctaUrl ?? "#pricing";

  return `<section id="hero" style="text-align:center;padding:4rem 2rem;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;">
  <h1 style="font-size:3rem;margin:0 0 1rem;">${escapeHtml(headline)}</h1>
  <p style="font-size:1.25rem;margin:0 0 2rem;opacity:0.9;">${escapeHtml(subheadline)}</p>
  <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:0.75rem 2rem;background:#fff;color:#764ba2;border-radius:0.5rem;text-decoration:none;font-weight:600;">${escapeHtml(cta)}</a>
</section>`;
}

/** Generate the features grid section. */
export function generateFeaturesSection(
  config: LandingPageConfig,
): string {
  const features = config.features ?? generateDefaultFeatures(config.description);

  const featureCards = features
    .map(
      (f) => `  <div style="padding:1.5rem;border:1px solid #e5e7eb;border-radius:0.5rem;text-align:center;">
    ${f.icon ? `<div style="font-size:2rem;margin-bottom:0.5rem;">${escapeHtml(f.icon)}</div>` : ""}
    <h3 style="margin:0 0 0.5rem;">${escapeHtml(f.title)}</h3>
    <p style="margin:0;color:#6b7280;font-size:0.875rem;">${escapeHtml(f.description)}</p>
  </div>`,
    )
    .join("\n");

  return `<section id="features" style="padding:4rem 2rem;max-width:64rem;margin:0 auto;">
  <h2 style="text-align:center;margin:0 0 2rem;">Features</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1.5rem;">
${featureCards}
  </div>
</section>`;
}

/** Generate default features from the description. */
function generateDefaultFeatures(description: string): Feature[] {
  const descLower = description.toLowerCase();
  const features: Feature[] = [];

  // Generate context-aware features
  if (descLower.includes("ai") || descLower.includes("smart") || descLower.includes("intelligent")) {
    features.push({
      title: "AI-Powered",
      description: "Intelligent automation that learns and adapts to your workflow.",
    });
  }
  if (descLower.includes("team") || descLower.includes("collaboration") || descLower.includes("remote")) {
    features.push({
      title: "Team Collaboration",
      description: "Real-time collaboration tools for distributed teams.",
    });
  }
  if (descLower.includes("analytics") || descLower.includes("dashboard") || descLower.includes("report")) {
    features.push({
      title: "Analytics Dashboard",
      description: "Comprehensive insights and reporting at your fingertips.",
    });
  }

  // Always include some universal features
  features.push({
    title: "Fast & Reliable",
    description: "Built for performance with 99.9% uptime guaranteed.",
  });
  features.push({
    title: "Secure by Default",
    description: "Enterprise-grade security with end-to-end encryption.",
  });
  features.push({
    title: "Easy Integration",
    description: "Connect with your existing tools in minutes.",
  });

  return features.slice(0, 6);
}

/** Generate the pricing section. */
export function generatePricingSection(
  config: LandingPageConfig,
): string {
  const tiers = config.pricing ?? getDefaultPricing();

  const tierCards = tiers
    .map(
      (t) => {
        const border = t.highlighted
          ? "border:2px solid #764ba2;"
          : "border:1px solid #e5e7eb;";
        const featuresHtml = t.features
          .map((f) => `      <li style="padding:0.25rem 0;">${escapeHtml(f)}</li>`)
          .join("\n");

        return `  <div style="padding:2rem;${border}border-radius:0.5rem;text-align:center;">
    <h3 style="margin:0 0 0.5rem;">${escapeHtml(t.name)}</h3>
    <div style="font-size:2rem;font-weight:700;margin:0 0 0.25rem;">${escapeHtml(t.price)}</div>
    ${t.period ? `<div style="color:#6b7280;font-size:0.875rem;margin-bottom:1rem;">${escapeHtml(t.period)}</div>` : ""}
    <ul style="list-style:none;padding:0;margin:0 0 1.5rem;text-align:left;">
${featuresHtml}
    </ul>
    <a href="#" style="display:inline-block;padding:0.5rem 1.5rem;background:${t.highlighted ? "#764ba2" : "#f3f4f6"};color:${t.highlighted ? "#fff" : "#374151"};border-radius:0.375rem;text-decoration:none;font-weight:500;">${escapeHtml(t.ctaText ?? "Choose Plan")}</a>
  </div>`;
      },
    )
    .join("\n");

  return `<section id="pricing" style="padding:4rem 2rem;background:#f9fafb;">
  <h2 style="text-align:center;margin:0 0 2rem;">Pricing</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem;max-width:64rem;margin:0 auto;">
${tierCards}
  </div>
</section>`;
}

function getDefaultPricing(): PricingTier[] {
  return [
    {
      name: "Starter",
      price: "Free",
      features: ["Up to 3 projects", "Basic features", "Community support"],
      ctaText: "Start Free",
    },
    {
      name: "Pro",
      price: "$29",
      period: "per month",
      features: [
        "Unlimited projects",
        "Advanced features",
        "Priority support",
        "API access",
      ],
      highlighted: true,
      ctaText: "Start Trial",
    },
    {
      name: "Enterprise",
      price: "Custom",
      features: [
        "Everything in Pro",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee",
      ],
      ctaText: "Contact Sales",
    },
  ];
}

/** Generate the CTA section. */
export function generateCtaSection(config: LandingPageConfig): string {
  const cta = config.ctaText ?? "Get Started Today";
  const ctaUrl = config.ctaUrl ?? "#";

  return `<section id="cta" style="text-align:center;padding:4rem 2rem;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;">
  <h2 style="font-size:2rem;margin:0 0 1rem;">Ready to get started?</h2>
  <p style="margin:0 0 2rem;opacity:0.9;">Join thousands of teams already using ${escapeHtml(config.brandName)}.</p>
  <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:0.75rem 2rem;background:#fff;color:#764ba2;border-radius:0.5rem;text-decoration:none;font-weight:600;">${escapeHtml(cta)}</a>
</section>`;
}

// ---------------------------------------------------------------------------
// Main Generator
// ---------------------------------------------------------------------------

/** Generate a complete landing page from a configuration. */
export function generateLandingPage(
  config: LandingPageConfig,
): LandingPageOutput {
  // Load heuristics if project root is provided (reserved for AI-enhanced generation)
  if (config.projectRoot) {
    loadBrandingHeuristic(config.projectRoot);
    loadProductHeuristic(config.projectRoot);
  }

  // Generate sections
  const hero = generateHeroSection(config);
  const features = generateFeaturesSection(config);
  const pricing = generatePricingSection(config);
  const cta = generateCtaSection(config);

  const sections: LandingPageSection[] = [
    { id: "hero", html: hero },
    { id: "features", html: features },
    { id: "pricing", html: pricing },
    { id: "cta", html: cta },
  ];

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.brandName)} — ${escapeHtml(config.description)}</title>
  <meta name="description" content="${escapeHtml(config.description)}">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #111827; }
    a { transition: opacity 0.15s; }
    a:hover { opacity: 0.85; }
  </style>
</head>
<body>
${sections.map((s) => s.html).join("\n\n")}
</body>
</html>`;

  return {
    html: fullHtml,
    sections,
    meta: {
      title: `${config.brandName} — ${config.description}`,
      description: config.description,
      brandName: config.brandName,
    },
  };
}
