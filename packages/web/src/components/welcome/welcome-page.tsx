/**
 * Dev Welcome Page
 *
 * `vibe dev` serves this page at / before the user adds their own routes.
 * Shows: project name, installed modules, quick links (sites, API explorer,
 * Drizzle Studio, health endpoint). First thing the user sees works.
 */

import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstalledModule {
  name: string;
  description?: string;
  docsUrl?: string;
}

export interface QuickLink {
  label: string;
  url: string;
  description?: string;
}

export interface WelcomePageProps {
  /** Project name (from package.json or vibe.config.ts) */
  projectName: string;
  /** VoR version string */
  version?: string;
  /** List of installed VoR modules */
  modules?: InstalledModule[];
  /** Quick links for developer navigation */
  quickLinks?: QuickLink[];
  /** Whether the API health check is passing */
  apiHealthy?: boolean;
  /** Base URL for links */
  baseUrl?: string;
}

// ---------------------------------------------------------------------------
// Default Quick Links
// ---------------------------------------------------------------------------

export function getDefaultQuickLinks(baseUrl = "http://localhost:3000"): QuickLink[] {
  return [
    {
      label: "API Health",
      url: `${baseUrl}/health`,
      description: "Check API server health status",
    },
    {
      label: "API Explorer",
      url: `${baseUrl}/api/trpc`,
      description: "Browse tRPC API endpoints",
    },
    {
      label: "Drizzle Studio",
      url: `${baseUrl}:4983`,
      description: "Visual database browser",
    },
    {
      label: "Documentation",
      url: "https://vibeonrails.dev/docs",
      description: "Framework documentation",
    },
  ];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ModuleCard({ module }: { module: InstalledModule }) {
  return (
    <div
      style={{
        padding: "var(--space-4, 1rem)",
        borderRadius: "var(--radius-md, 0.375rem)",
        border: "1px solid var(--color-border, #e5e7eb)",
        backgroundColor: "var(--color-surface, #f9fafb)",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "var(--color-text, #111827)",
        }}
      >
        {module.name}
      </h3>
      {module.description && (
        <p
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.75rem",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          {module.description}
        </p>
      )}
    </div>
  );
}

function QuickLinkCard({ link }: { link: QuickLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        padding: "var(--space-4, 1rem)",
        borderRadius: "var(--radius-md, 0.375rem)",
        border: "1px solid var(--color-border, #e5e7eb)",
        backgroundColor: "var(--color-surface, #f9fafb)",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      aria-label={`${link.label}: ${link.description ?? link.url}`}
    >
      <h3
        style={{
          margin: 0,
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "var(--color-primary, #2563eb)",
        }}
      >
        {link.label}
      </h3>
      {link.description && (
        <p
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.75rem",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          {link.description}
        </p>
      )}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function WelcomePage({
  projectName,
  version,
  modules = [],
  quickLinks,
  apiHealthy,
  baseUrl = "http://localhost:3000",
}: WelcomePageProps) {
  const links = quickLinks ?? getDefaultQuickLinks(baseUrl);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-8, 2rem)",
        fontFamily:
          "var(--font-sans, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)",
        backgroundColor: "var(--color-bg, #ffffff)",
        color: "var(--color-text, #111827)",
      }}
      role="main"
    >
      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: "var(--space-8, 2rem)" }}>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            margin: 0,
            color: "var(--color-text, #111827)",
          }}
        >
          {projectName}
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--color-text-secondary, #6b7280)",
            margin: "0.5rem 0 0",
          }}
        >
          Powered by Vibe on Rails{version ? ` v${version}` : ""}
        </p>
        {apiHealthy !== undefined && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "0.75rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 500,
              backgroundColor: apiHealthy ? "#dcfce7" : "#fef2f2",
              color: apiHealthy ? "#166534" : "#991b1b",
            }}
            role="status"
            aria-label={`API status: ${apiHealthy ? "healthy" : "unhealthy"}`}
          >
            <span
              style={{
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "50%",
                backgroundColor: apiHealthy ? "#22c55e" : "#ef4444",
              }}
              aria-hidden="true"
            />
            API {apiHealthy ? "Healthy" : "Unhealthy"}
          </div>
        )}
      </header>

      {/* Quick Links */}
      <section
        style={{ width: "100%", maxWidth: "40rem", marginBottom: "var(--space-8, 2rem)" }}
        aria-label="Quick links"
      >
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "var(--space-3, 0.75rem)",
          }}
        >
          Quick Links
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "var(--space-3, 0.75rem)",
          }}
        >
          {links.map((link) => (
            <QuickLinkCard key={link.url} link={link} />
          ))}
        </div>
      </section>

      {/* Installed Modules */}
      {modules.length > 0 && (
        <section
          style={{ width: "100%", maxWidth: "40rem" }}
          aria-label="Installed modules"
        >
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              marginBottom: "var(--space-3, 0.75rem)",
            }}
          >
            Installed Modules ({modules.length})
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "var(--space-3, 0.75rem)",
            }}
          >
            {modules.map((mod) => (
              <ModuleCard key={mod.name} module={mod} />
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: "var(--space-12, 3rem)",
          fontSize: "0.75rem",
          color: "var(--color-text-secondary, #6b7280)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0 }}>
          This page is shown when no routes are defined. Add routes to replace
          it.
        </p>
        <p style={{ margin: "0.25rem 0 0" }}>
          <a
            href="https://vibeonrails.dev/docs/getting-started"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--color-primary, #2563eb)",
              textDecoration: "none",
            }}
          >
            Getting Started Guide
          </a>
        </p>
      </footer>
    </div>
  );
}

WelcomePage.displayName = "WelcomePage";
