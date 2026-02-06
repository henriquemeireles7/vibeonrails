import React from "react";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = [
      "btn",
      `btn-${variant}`,
      `btn-${size}`,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span className="animate-spin" aria-hidden="true">
            &#9696;
          </span>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
