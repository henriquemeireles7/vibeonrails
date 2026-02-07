import React from "react";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export interface SkeletonProps {
  /** Width of the skeleton element */
  width?: string | number;
  /** Height of the skeleton element */
  height?: string | number;
  /** Border radius of the skeleton */
  borderRadius?: string | number;
  /** Additional CSS class */
  className?: string;
  /** Whether the pulse animation is active (default: true) */
  animated?: boolean;
}

/** Keyframe animation name for the pulse effect */
const ANIMATION_NAME = "vor-skeleton-pulse";

/** Inline keyframes injected once into the document */
const keyframesStyle = `
@keyframes ${ANIMATION_NAME} {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}
`;

let keyframesInjected = false;

/**
 * Inject the skeleton keyframe animation into the document head.
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
 * Loading placeholder with a pulsing animation.
 *
 * Uses CSS keyframes for a smooth pulse effect.
 * Styled via inline styles and CSS custom properties from the design token system.
 */
export function Skeleton({
  width = "100%",
  height = "1rem",
  borderRadius = "var(--radius-md)",
  className,
  animated = true,
}: SkeletonProps) {
  if (animated) {
    injectKeyframes();
  }

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius:
          typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        backgroundColor: "var(--color-bg-muted)",
        animation: animated
          ? `${ANIMATION_NAME} 1.5s ease-in-out infinite`
          : "none",
      }}
    />
  );
}

Skeleton.displayName = "Skeleton";
