import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkipLink } from "./skip-link.js";

describe("SkipLink", () => {
  it("renders a link with 'Skip to main content' text by default", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
  });

  it("renders custom label text", () => {
    render(<SkipLink label="Skip to navigation" />);
    expect(screen.getByText("Skip to navigation")).toBeInTheDocument();
  });

  it("links to #main-content by default", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("links to custom target", () => {
    render(<SkipLink target="#sidebar" />);
    const link = screen.getByText("Skip to main content");
    expect(link).toHaveAttribute("href", "#sidebar");
  });

  it("has the skip-link CSS class", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link.className).toContain("skip-link");
  });

  it("applies custom className", () => {
    render(<SkipLink className="custom-class" />);
    const link = screen.getByText("Skip to main content");
    expect(link.className).toContain("custom-class");
    expect(link.className).toContain("skip-link");
  });

  it("moves focus to target element on click", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          Main content
        </main>
      </>,
    );

    const link = screen.getByText("Skip to main content");
    await user.click(link);

    const main = document.getElementById("main-content");
    expect(main).toBe(document.activeElement);
  });

  it("moves focus to target on Enter key", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          Main content
        </main>
      </>,
    );

    const link = screen.getByText("Skip to main content");
    link.focus();
    await user.keyboard("{Enter}");

    const main = document.getElementById("main-content");
    expect(main).toBe(document.activeElement);
  });

  it("is the first focusable element when tabbing", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink />
        <button>Other button</button>
      </>,
    );

    await user.tab();
    const link = screen.getByText("Skip to main content");
    expect(link).toHaveFocus();
  });
});
