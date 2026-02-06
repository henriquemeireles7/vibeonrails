import React, { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss?: () => void;
}

const variantStyles: Record<ToastVariant, { bg: string; color: string }> = {
  success: { bg: "var(--color-success-light)", color: "var(--color-success)" },
  error: { bg: "var(--color-error-light)", color: "var(--color-error)" },
  info: { bg: "var(--color-info-light)", color: "var(--color-info)" },
  warning: { bg: "var(--color-warning-light)", color: "var(--color-warning)" },
};

export function Toast({
  message,
  variant = "info",
  duration = 5000,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(true);
  const style = variantStyles[variant];

  const dismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="animate-slide-up"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-lg)",
        backgroundColor: style.bg,
        color: style.color,
        fontSize: "var(--text-sm)",
        fontWeight: "var(--font-medium)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <span>{message}</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          fontSize: "var(--text-lg)",
          lineHeight: 1,
          padding: 0,
        }}
      >
        &times;
      </button>
    </div>
  );
}

Toast.displayName = "Toast";
