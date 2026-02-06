import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FocusGuard } from "./focus-guard.js";

describe("FocusGuard", () => {
  it("renders children", () => {
    render(
      <FocusGuard active>
        <button>Inside button</button>
      </FocusGuard>,
    );
    expect(
      screen.getByRole("button", { name: "Inside button" }),
    ).toBeInTheDocument();
  });

  it("traps focus within the guard when active", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Outside before</button>
        <FocusGuard active>
          <button>First</button>
          <button>Second</button>
          <button>Third</button>
        </FocusGuard>
        <button>Outside after</button>
      </>,
    );

    // Focus the first button inside the guard
    screen.getByRole("button", { name: "First" }).focus();

    // Tab through all buttons inside guard
    await user.tab();
    expect(screen.getByRole("button", { name: "Second" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Third" })).toHaveFocus();

    // Tab again should cycle back to First (trapped)
    await user.tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("traps focus with shift+tab (reverse cycling)", async () => {
    const user = userEvent.setup();
    render(
      <FocusGuard active>
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      </FocusGuard>,
    );

    // Focus the first button
    screen.getByRole("button", { name: "First" }).focus();

    // Shift+Tab should cycle to last element
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Third" })).toHaveFocus();
  });

  it("calls onEscape when Escape is pressed", async () => {
    const user = userEvent.setup();
    const handleEscape = vi.fn();
    render(
      <FocusGuard active onEscape={handleEscape}>
        <button>Inside</button>
      </FocusGuard>,
    );

    screen.getByRole("button", { name: "Inside" }).focus();
    await user.keyboard("{Escape}");

    expect(handleEscape).toHaveBeenCalledTimes(1);
  });

  it("does not call onEscape when not active", async () => {
    const user = userEvent.setup();
    const handleEscape = vi.fn();
    render(
      <FocusGuard active={false} onEscape={handleEscape}>
        <button>Inside</button>
      </FocusGuard>,
    );

    screen.getByRole("button", { name: "Inside" }).focus();
    await user.keyboard("{Escape}");

    expect(handleEscape).not.toHaveBeenCalled();
  });

  it("does not trap focus when inactive", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusGuard active={false}>
          <button>Inside</button>
        </FocusGuard>
        <button>Outside</button>
      </>,
    );

    screen.getByRole("button", { name: "Inside" }).focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Outside" })).toHaveFocus();
  });

  it("returns focus to previously focused element on deactivation", () => {
    const outerButton = document.createElement("button");
    outerButton.textContent = "Outer";
    document.body.appendChild(outerButton);
    outerButton.focus();

    const { rerender } = render(
      <FocusGuard active returnFocusOnDeactivate>
        <button>Inside</button>
      </FocusGuard>,
    );

    // Deactivate the guard
    rerender(
      <FocusGuard active={false} returnFocusOnDeactivate>
        <button>Inside</button>
      </FocusGuard>,
    );

    expect(outerButton).toHaveFocus();
    document.body.removeChild(outerButton);
  });

  it("auto-focuses the first focusable element on activation", () => {
    render(
      <FocusGuard active autoFocus>
        <button>First</button>
        <button>Second</button>
      </FocusGuard>,
    );

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("applies custom className", () => {
    const { container } = render(
      <FocusGuard active className="custom-guard">
        <button>Inside</button>
      </FocusGuard>,
    );
    const guard = container.firstElementChild;
    expect(guard?.className).toContain("custom-guard");
    expect(guard?.className).toContain("focus-guard");
  });
});
