import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  KeyboardShortcuts,
  useShortcutRegistry,
  type Shortcut,
} from "./keyboard-shortcuts.js";

describe("KeyboardShortcuts", () => {
  const defaultShortcuts: Shortcut[] = [
    {
      id: "search",
      keys: ["Meta", "k"],
      label: "Open search",
      handler: vi.fn(),
    },
    {
      id: "help",
      keys: ["Shift", "?"],
      label: "Show help",
      handler: vi.fn(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a command palette when opened", async () => {
    const user = userEvent.setup();
    render(
      <KeyboardShortcuts shortcuts={defaultShortcuts}>
        <div>App content</div>
      </KeyboardShortcuts>,
    );

    // Command palette should not be visible initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Trigger Cmd+K
    await user.keyboard("{Meta>}k{/Meta}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search commands..."),
    ).toBeInTheDocument();
  });

  it("closes command palette on Escape", async () => {
    const user = userEvent.setup();
    render(
      <KeyboardShortcuts shortcuts={defaultShortcuts}>
        <div>App content</div>
      </KeyboardShortcuts>,
    );

    // Open palette
    await user.keyboard("{Meta>}k{/Meta}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Close with Escape
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <KeyboardShortcuts shortcuts={defaultShortcuts}>
        <div>App content</div>
      </KeyboardShortcuts>,
    );

    expect(screen.getByText("App content")).toBeInTheDocument();
  });

  it("displays registered shortcuts in the palette", async () => {
    const user = userEvent.setup();
    render(
      <KeyboardShortcuts shortcuts={defaultShortcuts}>
        <div>App content</div>
      </KeyboardShortcuts>,
    );

    await user.keyboard("{Meta>}k{/Meta}");

    expect(screen.getByText("Open search")).toBeInTheDocument();
    expect(screen.getByText("Show help")).toBeInTheDocument();
  });

  it("filters shortcuts by search query", async () => {
    const user = userEvent.setup();
    render(
      <KeyboardShortcuts shortcuts={defaultShortcuts}>
        <div>App content</div>
      </KeyboardShortcuts>,
    );

    await user.keyboard("{Meta>}k{/Meta}");

    const searchInput = screen.getByPlaceholderText("Search commands...");
    await user.type(searchInput, "search");

    expect(screen.getByText("Open search")).toBeInTheDocument();
    expect(screen.queryByText("Show help")).not.toBeInTheDocument();
  });

  it("executes shortcut handler when selected", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { id: "test", keys: ["Meta", "t"], label: "Test action", handler },
    ];

    render(
      <KeyboardShortcuts shortcuts={shortcuts}>
        <div>App content</div>
      </KeyboardShortcuts>,
    );

    // Open palette and click the shortcut
    await user.keyboard("{Meta>}k{/Meta}");
    await user.click(screen.getByText("Test action"));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not trigger shortcuts when typing in an input", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { id: "test", keys: ["k"], label: "Test", handler },
    ];

    render(
      <KeyboardShortcuts shortcuts={shortcuts}>
        <input placeholder="Type here" />
      </KeyboardShortcuts>,
    );

    const input = screen.getByPlaceholderText("Type here");
    await user.click(input);
    await user.type(input, "k");

    expect(handler).not.toHaveBeenCalled();
  });

  it("applies custom className to the wrapper", () => {
    const { container } = render(
      <KeyboardShortcuts shortcuts={[]} className="custom-shortcuts">
        <div>Content</div>
      </KeyboardShortcuts>,
    );

    expect(container.firstElementChild?.className).toContain(
      "custom-shortcuts",
    );
  });
});

describe("useShortcutRegistry", () => {
  it("detects conflicting shortcuts", () => {
    const shortcuts: Shortcut[] = [
      {
        id: "first",
        keys: ["Meta", "k"],
        label: "First",
        handler: vi.fn(),
      },
      {
        id: "second",
        keys: ["Meta", "k"],
        label: "Second",
        handler: vi.fn(),
      },
    ];

    const { conflicts } = useShortcutRegistry(shortcuts);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      keys: ["Meta", "k"],
      ids: ["first", "second"],
    });
  });

  it("returns no conflicts for unique shortcuts", () => {
    const shortcuts: Shortcut[] = [
      {
        id: "first",
        keys: ["Meta", "k"],
        label: "First",
        handler: vi.fn(),
      },
      {
        id: "second",
        keys: ["Meta", "j"],
        label: "Second",
        handler: vi.fn(),
      },
    ];

    const { conflicts } = useShortcutRegistry(shortcuts);
    expect(conflicts).toHaveLength(0);
  });
});
