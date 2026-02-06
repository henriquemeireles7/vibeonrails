import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  generateLandingPage,
  generateHeroSection,
  generateFeaturesSection,
  generatePricingSection,
  generateCtaSection,
  parseBrandingHeuristic,
  parseProductHeuristic,
} from "./ai-generator.js";
import type { LandingPageConfig } from "./ai-generator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(
    tmpdir(),
    `vibe-landing-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

const baseConfig: LandingPageConfig = {
  description: "AI-powered project management for remote teams",
  brandName: "TeamFlow",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Landing Page Generator", () => {
  // -----------------------------------------------------------------------
  // Heuristic Parsers
  // -----------------------------------------------------------------------

  describe("parseBrandingHeuristic", () => {
    it("parses tone from markdown", () => {
      const result = parseBrandingHeuristic("tone: friendly and casual");
      expect(result.tone).toBe("friendly and casual");
    });

    it("parses vocabulary", () => {
      const result = parseBrandingHeuristic("vocabulary: ship, build, grow");
      expect(result.vocabulary).toEqual(["ship", "build", "grow"]);
    });

    it("parses writing style", () => {
      const result = parseBrandingHeuristic("writing-style: punchy and direct");
      expect(result.writingStyle).toBe("punchy and direct");
    });

    it("parses color scheme", () => {
      const result = parseBrandingHeuristic("color-scheme: purple gradient");
      expect(result.colorScheme).toBe("purple gradient");
    });

    it("returns defaults for empty content", () => {
      const result = parseBrandingHeuristic("");
      expect(result.tone).toBe("professional");
      expect(result.vocabulary).toEqual([]);
      expect(result.writingStyle).toBe("concise");
    });
  });

  describe("parseProductHeuristic", () => {
    it("parses USP", () => {
      const result = parseProductHeuristic("usp: AI-first project management");
      expect(result.usp).toBe("AI-first project management");
    });

    it("parses methodology", () => {
      const result = parseProductHeuristic("methodology: Agile + AI");
      expect(result.methodology).toBe("Agile + AI");
    });

    it("parses aha moment", () => {
      const result = parseProductHeuristic(
        "aha-moment: When the AI auto-assigns tasks",
      );
      expect(result.ahaMoment).toBe("When the AI auto-assigns tasks");
    });

    it("parses target audience", () => {
      const result = parseProductHeuristic(
        "target-audience: Remote engineering teams",
      );
      expect(result.targetAudience).toBe("Remote engineering teams");
    });
  });

  // -----------------------------------------------------------------------
  // Section Generators
  // -----------------------------------------------------------------------

  describe("generateHeroSection", () => {
    it("includes brand name", () => {
      const html = generateHeroSection(baseConfig);
      expect(html).toContain("TeamFlow");
    });

    it("includes description", () => {
      const html = generateHeroSection(baseConfig);
      expect(html).toContain("AI-powered project management");
    });

    it("includes CTA button", () => {
      const html = generateHeroSection(baseConfig);
      expect(html).toContain("Get Started");
      expect(html).toContain("href=");
    });

    it("uses custom CTA text", () => {
      const html = generateHeroSection({ ...baseConfig, ctaText: "Try Free" });
      expect(html).toContain("Try Free");
    });

    it("is a section element with hero id", () => {
      const html = generateHeroSection(baseConfig);
      expect(html).toContain('id="hero"');
      expect(html).toContain("<section");
    });
  });

  describe("generateFeaturesSection", () => {
    it("generates features grid", () => {
      const html = generateFeaturesSection(baseConfig);
      expect(html).toContain("Features");
      expect(html).toContain('id="features"');
    });

    it("auto-generates relevant features from description", () => {
      const html = generateFeaturesSection(baseConfig);
      // Should detect "AI" and "team" from the description
      expect(html).toContain("AI-Powered");
      expect(html).toContain("Team Collaboration");
    });

    it("uses custom features when provided", () => {
      const html = generateFeaturesSection({
        ...baseConfig,
        features: [
          { title: "Custom Feature", description: "Custom description" },
        ],
      });
      expect(html).toContain("Custom Feature");
      expect(html).toContain("Custom description");
    });

    it("always includes universal features", () => {
      const html = generateFeaturesSection(baseConfig);
      expect(html).toContain("Fast &amp; Reliable");
      expect(html).toContain("Secure by Default");
    });
  });

  describe("generatePricingSection", () => {
    it("generates pricing tiers", () => {
      const html = generatePricingSection(baseConfig);
      expect(html).toContain('id="pricing"');
      expect(html).toContain("Starter");
      expect(html).toContain("Pro");
      expect(html).toContain("Enterprise");
    });

    it("uses custom pricing when provided", () => {
      const html = generatePricingSection({
        ...baseConfig,
        pricing: [
          {
            name: "Solo",
            price: "$9",
            period: "per month",
            features: ["1 project"],
          },
        ],
      });
      expect(html).toContain("Solo");
      expect(html).toContain("$9");
    });

    it("highlights the recommended tier", () => {
      const html = generatePricingSection(baseConfig);
      // Pro tier should be highlighted by default
      expect(html).toContain("#764ba2"); // highlight color
    });
  });

  describe("generateCtaSection", () => {
    it("includes brand name", () => {
      const html = generateCtaSection(baseConfig);
      expect(html).toContain("TeamFlow");
    });

    it("includes CTA link", () => {
      const html = generateCtaSection(baseConfig);
      expect(html).toContain("Get Started Today");
      expect(html).toContain("<a href=");
    });

    it("is a section element with cta id", () => {
      const html = generateCtaSection(baseConfig);
      expect(html).toContain('id="cta"');
    });
  });

  // -----------------------------------------------------------------------
  // Full Landing Page
  // -----------------------------------------------------------------------

  describe("generateLandingPage", () => {
    it("generates complete HTML document", () => {
      const page = generateLandingPage(baseConfig);
      expect(page.html).toContain("<!DOCTYPE html>");
      expect(page.html).toContain("<html");
      expect(page.html).toContain("</html>");
    });

    it("includes all four sections", () => {
      const page = generateLandingPage(baseConfig);
      expect(page.sections).toHaveLength(4);
      expect(page.sections.map((s) => s.id)).toEqual([
        "hero",
        "features",
        "pricing",
        "cta",
      ]);
    });

    it("includes meta information", () => {
      const page = generateLandingPage(baseConfig);
      expect(page.meta.brandName).toBe("TeamFlow");
      expect(page.meta.description).toContain("AI-powered");
      expect(page.meta.title).toContain("TeamFlow");
    });

    it("includes SEO meta tags", () => {
      const page = generateLandingPage(baseConfig);
      expect(page.html).toContain("<title>");
      expect(page.html).toContain('name="description"');
      expect(page.html).toContain('name="viewport"');
    });

    it("hero section appears in full HTML", () => {
      const page = generateLandingPage(baseConfig);
      expect(page.html).toContain('id="hero"');
    });

    it("features section appears in full HTML", () => {
      const page = generateLandingPage(baseConfig);
      expect(page.html).toContain('id="features"');
    });

    it("pricing section appears in full HTML", () => {
      const page = generateLandingPage(baseConfig);
      expect(page.html).toContain('id="pricing"');
    });

    it("CTA section appears in full HTML", () => {
      const page = generateLandingPage(baseConfig);
      expect(page.html).toContain('id="cta"');
    });
  });

  // -----------------------------------------------------------------------
  // Heuristic Consumption (with project root)
  // -----------------------------------------------------------------------

  describe("heuristic consumption", () => {
    let projectRoot: string;

    beforeEach(() => {
      projectRoot = makeTmpDir();
    });

    afterEach(() => {
      rmSync(projectRoot, { recursive: true, force: true });
    });

    it("loads branding heuristic from project", () => {
      const brandingDir = join(
        projectRoot,
        "content/marketing/heuristics",
      );
      mkdirSync(brandingDir, { recursive: true });
      writeFileSync(
        join(brandingDir, "branding.md"),
        "tone: bold and confident\nvocabulary: ship, launch, scale",
      );

      // Should not throw — heuristic is loaded internally
      const page = generateLandingPage({ ...baseConfig, projectRoot });
      expect(page.html).toContain("TeamFlow");
    });

    it("works without heuristic files", () => {
      const page = generateLandingPage({ ...baseConfig, projectRoot });
      expect(page.html).toContain("TeamFlow");
      expect(page.sections).toHaveLength(4);
    });
  });

  // -----------------------------------------------------------------------
  // HTML Output
  // -----------------------------------------------------------------------

  describe("HTML output", () => {
    it("escapes special characters in brand name", () => {
      const page = generateLandingPage({
        description: "test",
        brandName: "Brand <script>alert('xss')</script>",
      });
      expect(page.html).not.toContain("<script>");
      expect(page.html).toContain("&lt;script&gt;");
    });

    it("includes responsive viewport meta", () => {
      const page = generateLandingPage(baseConfig);
      expect(page.html).toContain("width=device-width");
    });

    it("includes base styles", () => {
      const page = generateLandingPage(baseConfig);
      expect(page.html).toContain("<style>");
      expect(page.html).toContain("box-sizing");
      expect(page.html).toContain("font-family");
    });
  });
});
