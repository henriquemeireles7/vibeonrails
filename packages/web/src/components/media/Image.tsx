import React from "react";

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

export interface ImageProps {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Intrinsic width to prevent CLS */
  width?: number | string;
  /** Intrinsic height to prevent CLS */
  height?: number | string;
  /** Loading strategy (default: 'lazy' for below-fold images) */
  loading?: "lazy" | "eager";
  /** Responsive sizes attribute */
  sizes?: string;
  /** Responsive srcSet attribute */
  srcSet?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Optimized image component with lazy loading and CLS prevention.
 *
 * Always includes width and height to prevent Cumulative Layout Shift (CLS).
 * Defaults to loading="lazy" for below-fold images.
 */
export function Image({
  src,
  alt,
  width,
  height,
  loading = "lazy",
  sizes,
  srcSet,
  className,
}: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      sizes={sizes}
      srcSet={srcSet}
      className={className}
      style={{
        maxWidth: "100%",
        height: "auto",
      }}
    />
  );
}

Image.displayName = "Image";
