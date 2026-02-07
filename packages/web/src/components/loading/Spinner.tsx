import React from "react";

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  /** Size preset (default: 'md') */
  size?: SpinnerSize;
  /** Additional CSS class */
  className?: string;
  /** Accessible label (default: 'Loading') */
  label?: string;
}

const SIZE_MAP: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 40,
};

/** Keyframe animation name for the spin effect */
const ANIMATION_NAME = "vor-spinner-rotate";

const keyframesStyle = `
@keyframes ${ANIMATION_NAME} {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

let keyframesInjected = false;

/**
 * Inject the spinner keyframe animation into the document head.
 * Only runs once per page lifecycle.
 */
function injectKeyframes(): void {
  if (keyframesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = keyframesStyle;
  document.head.appendChild(style);
  keyframesInjected = true;
}

/**
 * Accessible loading spinner using an animated SVG circle.
 *
 * Includes role="status" and aria-label for screen readers.
 */
export function Spinner({
  size = "md",
  className,
  label = "Loading",
}: SpinnerProps) {
  injectKeyframes();

  const px = SIZE_MAP[size];

  return (
    <svg
      role="status"
      aria-label={label}
      className={className}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        animation: `${ANIMATION_NAME} 0.75s linear infinite`,
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="var(--color-border-strong)"
        strokeWidth="3"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

Spinner.displayName = "Spinner";
