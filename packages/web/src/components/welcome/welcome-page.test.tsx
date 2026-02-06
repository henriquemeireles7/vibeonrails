import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WelcomePage, getDefaultQuickLinks } from "./welcome-page.js";
import type { InstalledModule } from "./welcome-page.js";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WelcomePage", () => {
  it("renders project name", () => {
    render(<WelcomePage projectName="My SaaS" />);
    expect(screen.getByText("My SaaS")).toBeInTheDocument();
  });

  it("renders version when provided", () => {
    render(<WelcomePage projectName="App" version="1.2.0" />);
    expect(screen.getByText(/v1\.2\.0/)).toBeInTheDocument();
  });

  it("renders Vibe on Rails branding", () => {
    render(<WelcomePage projectName="App" />);
    expect(screen.getByText(/Powered by Vibe on Rails/)).toBeInTheDocument();
  });

  it("renders quick links section", () => {
    render(<WelcomePage projectName="App" />);
    expect(screen.getByLabelText("Quick links")).toBeInTheDocument();
  });

  it("renders default quick links", () => {
    render(<WelcomePage projectName="App" />);
    expect(screen.getByText("API Health")).toBeInTheDocument();
    expect(screen.getByText("API Explorer")).toBeInTheDocument();
    expect(screen.getByText("Documentation")).toBeInTheDocument();
  });

  it("renders custom quick links", () => {
    const links = [
      { label: "Custom Link", url: "https://custom.dev", description: "Custom" },
    ];
    render(<WelcomePage projectName="App" quickLinks={links} />);
    expect(screen.getByText("Custom Link")).toBeInTheDocument();
  });

  it("renders installed modules", () => {
    const modules: InstalledModule[] = [
      { name: "@vibeonrails/core", description: "Core framework" },
      { name: "@vibeonrails/payments", description: "Stripe payments" },
    ];
    render(<WelcomePage projectName="App" modules={modules} />);
    expect(screen.getByLabelText("Installed modules")).toBeInTheDocument();
    expect(screen.getByText("@vibeonrails/core")).toBeInTheDocument();
    expect(screen.getByText("@vibeonrails/payments")).toBeInTheDocument();
    expect(screen.getByText("Installed Modules (2)")).toBeInTheDocument();
  });

  it("does not render modules section when empty", () => {
    render(<WelcomePage projectName="App" modules={[]} />);
    expect(screen.queryByLabelText("Installed modules")).not.toBeInTheDocument();
  });

  it("shows healthy API status", () => {
    render(<WelcomePage projectName="App" apiHealthy={true} />);
    expect(screen.getByRole("status")).toHaveTextContent("API Healthy");
  });

  it("shows unhealthy API status", () => {
    render(<WelcomePage projectName="App" apiHealthy={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("API Unhealthy");
  });

  it("hides API status when not provided", () => {
    render(<WelcomePage projectName="App" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders getting started link in footer", () => {
    render(<WelcomePage projectName="App" />);
    expect(screen.getByText("Getting Started Guide")).toBeInTheDocument();
    expect(screen.getByText("Getting Started Guide")).toHaveAttribute(
      "href",
      "https://vibeonrails.dev/docs/getting-started",
    );
  });

  it("has accessible main landmark", () => {
    render(<WelcomePage projectName="App" />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// getDefaultQuickLinks
// ---------------------------------------------------------------------------

describe("getDefaultQuickLinks", () => {
  it("generates links with default base URL", () => {
    const links = getDefaultQuickLinks();
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links[0]!.url).toContain("localhost:3000");
  });

  it("respects custom base URL", () => {
    const links = getDefaultQuickLinks("http://localhost:4000");
    expect(links[0]!.url).toContain("localhost:4000");
  });

  it("includes health, API explorer, and docs links", () => {
    const links = getDefaultQuickLinks();
    const labels = links.map((l) => l.label);
    expect(labels).toContain("API Health");
    expect(labels).toContain("API Explorer");
    expect(labels).toContain("Documentation");
  });
});
