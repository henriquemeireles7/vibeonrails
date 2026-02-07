import React, { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// CookieConsent
// ---------------------------------------------------------------------------

/** localStorage key for persisting cookie consent preference */
const STORAGE_KEY = "vor_cookie_consent";

export interface CookieConsentProps {
  /** URL to the privacy policy page */
  privacyPolicyUrl?: string;
  /** Callback when user accepts cookies */
  onAccept?: () => void;
  /** Callback when user declines cookies */
  onDecline?: () => void;
}

/**
 * Cookie consent banner displayed at the bottom of the screen.
 *
 * Stores the user preference in localStorage. Once a preference is stored
 * the banner is hidden on subsequent visits.
 */
export function CookieConsent({
  privacyPolicyUrl,
  onAccept,
  onDecline,
}: CookieConsentProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      setVisible(true);
    }
  }, []);

  const handleAccept = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "accepted");
    }
    setVisible(false);
    onAccept?.();
  }, [onAccept]);

  const handleDecline = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "declined");
    }
    setVisible(false);
    onDecline?.();
  }, [onDecline]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: "var(--z-toast)",
        backgroundColor: "var(--color-bg-subtle)",
        borderTop: "1px solid var(--color-border)",
        padding: "var(--space-4) var(--space-6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "var(--space-4)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        color: "var(--color-text-secondary)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <p style={{ margin: 0, flex: "1 1 auto" }}>
        We use cookies to improve your experience.{" "}
        {privacyPolicyUrl && (
          <a
            href={privacyPolicyUrl}
            style={{
              color: "var(--color-primary)",
              textDecoration: "underline",
            }}
          >
            Privacy Policy
          </a>
        )}
      </p>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          type="button"
          onClick={handleDecline}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
          }}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={handleAccept}
          style={{
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-text-inverse)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}

CookieConsent.displayName = "CookieConsent";
