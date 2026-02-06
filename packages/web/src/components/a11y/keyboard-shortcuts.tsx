import React, { useCallback, useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// KeyboardShortcuts — Cmd+K command palette with shortcut registration
// ---------------------------------------------------------------------------

export interface Shortcut {
  /** Unique identifier */
  id: string;
  /** Key combination (e.g., ["Meta", "k"] for Cmd+K) */
  keys: string[];
  /** Display label */
  label: string;
  /** Handler function */
  handler: () => void;
  /** Optional group for organizing in the palette */
  group?: string;
}

export interface ShortcutConflict {
  keys: string[];
  ids: string[];
}

export interface KeyboardShortcutsProps {
  /** Registered shortcuts */
  shortcuts: Shortcut[];
  /** Content to wrap */
  children: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// useShortcutRegistry — Conflict detection for shortcuts (pure function)
// ---------------------------------------------------------------------------

export function useShortcutRegistry(shortcuts: Shortcut[]): {
  conflicts: ShortcutConflict[];
  shortcutMap: Map<string, Shortcut>;
} {
  const shortcutMap = new Map<string, Shortcut>();
  for (const shortcut of shortcuts) {
    const key = shortcut.keys.join("+");
    shortcutMap.set(key, shortcut);
  }

  const keyGroups = new Map<string, string[]>();
  for (const shortcut of shortcuts) {
    const key = shortcut.keys.join("+");
    const existing = keyGroups.get(key) ?? [];
    existing.push(shortcut.id);
    keyGroups.set(key, existing);
  }

  const conflicts: ShortcutConflict[] = [];
  for (const [key, ids] of keyGroups) {
    if (ids.length > 1) {
      conflicts.push({ keys: key.split("+"), ids });
    }
  }

  return { conflicts, shortcutMap };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INPUT_ELEMENTS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  if (INPUT_ELEMENTS.has(active.tagName)) return true;
  if ((active as HTMLElement).isContentEditable) return true;
  return false;
}

function matchesShortcut(event: KeyboardEvent, keys: string[]): boolean {
  const modifiers = new Set(
    keys.filter((k) => ["Meta", "Ctrl", "Alt", "Shift"].includes(k)),
  );
  const nonModifiers = keys.filter(
    (k) => !["Meta", "Ctrl", "Alt", "Shift"].includes(k),
  );

  if (modifiers.has("Meta") !== event.metaKey) return false;
  if (modifiers.has("Ctrl") !== event.ctrlKey) return false;
  if (modifiers.has("Alt") !== event.altKey) return false;
  if (modifiers.has("Shift") !== event.shiftKey) return false;

  if (nonModifiers.length !== 1) return false;
  return event.key.toLowerCase() === nonModifiers[0].toLowerCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KeyboardShortcuts({
  shortcuts,
  children,
  className,
}: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredShortcuts = useMemo(() => {
    if (!query) return shortcuts;
    const lower = query.toLowerCase();
    return shortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(lower) ||
        s.id.toLowerCase().includes(lower) ||
        (s.group && s.group.toLowerCase().includes(lower)),
    );
  }, [shortcuts, query]);

  // Global keyboard listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd+K / Ctrl+K to toggle palette
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
        return;
      }

      // Escape to close palette
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setQuery("");
        return;
      }

      // Don't trigger shortcuts when typing in inputs
      if (isInputFocused()) return;

      // Check all registered shortcuts
      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut.keys)) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, isOpen]);

  const handleSelect = useCallback((shortcut: Shortcut) => {
    setIsOpen(false);
    setQuery("");
    shortcut.handler();
  }, []);

  const classes = ["keyboard-shortcuts", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {children}

      {isOpen && (
        <div
          className="keyboard-shortcuts-overlay"
          onClick={() => {
            setIsOpen(false);
            setQuery("");
          }}
          role="presentation"
        >
          <div
            className="keyboard-shortcuts-palette"
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              className="keyboard-shortcuts-search"
              placeholder="Search commands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            <ul className="keyboard-shortcuts-list" role="listbox">
              {filteredShortcuts.map((shortcut) => (
                <li
                  key={shortcut.id}
                  className="keyboard-shortcuts-item"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(shortcut)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSelect(shortcut);
                  }}
                  tabIndex={0}
                >
                  <span className="keyboard-shortcuts-label">
                    {shortcut.label}
                  </span>
                  <kbd className="keyboard-shortcuts-keys">
                    {shortcut.keys.join(" + ")}
                  </kbd>
                </li>
              ))}

              {filteredShortcuts.length === 0 && (
                <li className="keyboard-shortcuts-empty">
                  No matching commands
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

KeyboardShortcuts.displayName = "KeyboardShortcuts";
