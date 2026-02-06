import React, { useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// FocusGuard — Focus trapping for modals and dialogs
// Traps tab focus within the guard. Escape key to close.
// ---------------------------------------------------------------------------

export interface FocusGuardProps {
  /** Whether focus trapping is active */
  active: boolean;
  /** Content to trap focus within */
  children: React.ReactNode;
  /** Called when Escape key is pressed */
  onEscape?: () => void;
  /** Auto-focus the first focusable element on activation */
  autoFocus?: boolean;
  /** Return focus to the previously focused element on deactivation */
  returnFocusOnDeactivate?: boolean;
  /** Additional CSS class names */
  className?: string;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
}

export function FocusGuard({
  active,
  children,
  onEscape,
  autoFocus = false,
  returnFocusOnDeactivate = false,
  className,
}: FocusGuardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element when activating
  useEffect(() => {
    if (active) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      if (autoFocus && containerRef.current) {
        const focusable = getFocusableElements(containerRef.current);
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }

    return () => {
      if (!active && returnFocusOnDeactivate && previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, autoFocus]);

  // Return focus on deactivation
  useEffect(() => {
    if (!active && returnFocusOnDeactivate && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [active, returnFocusOnDeactivate]);

  // Handle keydown for tab trapping and escape
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!active) return;

      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key === "Tab" && containerRef.current) {
        const focusable = getFocusableElements(containerRef.current);
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (event.shiftKey) {
          // Shift+Tab: if on first element, go to last
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last element, go to first
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [active, onEscape],
  );

  const classes = ["focus-guard", className].filter(Boolean).join(" ");

  return (
    <div
      ref={containerRef}
      className={classes}
      onKeyDown={handleKeyDown}
      role={active ? "dialog" : undefined}
      aria-modal={active || undefined}
    >
      {children}
    </div>
  );
}

FocusGuard.displayName = "FocusGuard";
