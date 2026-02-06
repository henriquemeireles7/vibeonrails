import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LiveRegion } from "./live-region.js";

describe("LiveRegion", () => {
  it("renders with aria-live polite by default", () => {
    render(<LiveRegion>Update available</LiveRegion>);
    const region = screen.getByText("Update available");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders with aria-live assertive when mode is assertive", () => {
    render(<LiveRegion mode="assertive">Error occurred</LiveRegion>);
    const region = screen.getByText("Error occurred");
    expect(region).toHaveAttribute("aria-live", "assertive");
  });

  it("renders with aria-live off when mode is off", () => {
    render(<LiveRegion mode="off">Silent</LiveRegion>);
    const region = screen.getByText("Silent");
    expect(region).toHaveAttribute("aria-live", "off");
  });

  it("has role=status by default for polite mode", () => {
    render(<LiveRegion>Status update</LiveRegion>);
    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
  });

  it("has role=alert for assertive mode", () => {
    render(<LiveRegion mode="assertive">Alert!</LiveRegion>);
    const region = screen.getByRole("alert");
    expect(region).toBeInTheDocument();
  });

  it("sets aria-atomic to true by default", () => {
    render(<LiveRegion>Full update</LiveRegion>);
    const region = screen.getByText("Full update");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("allows disabling aria-atomic", () => {
    render(<LiveRegion atomic={false}>Partial update</LiveRegion>);
    const region = screen.getByText("Partial update");
    expect(region).toHaveAttribute("aria-atomic", "false");
  });

  it("updates content dynamically", () => {
    const { rerender } = render(<LiveRegion>First message</LiveRegion>);
    expect(screen.getByText("First message")).toBeInTheDocument();

    rerender(<LiveRegion>Second message</LiveRegion>);
    expect(screen.getByText("Second message")).toBeInTheDocument();
  });

  it("renders as visually hidden when visuallyHidden is true", () => {
    render(<LiveRegion visuallyHidden>Hidden update</LiveRegion>);
    const region = screen.getByText("Hidden update");
    expect(region.className).toContain("sr-only");
  });

  it("applies custom className", () => {
    render(<LiveRegion className="custom">Content</LiveRegion>);
    const region = screen.getByText("Content");
    expect(region.className).toContain("custom");
    expect(region.className).toContain("live-region");
  });

  it("clears message after clearAfterMs", async () => {
    vi.useFakeTimers();
    render(<LiveRegion clearAfterMs={1000}>Temporary</LiveRegion>);
    expect(screen.getByText("Temporary")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("");
    vi.useRealTimers();
  });
});
