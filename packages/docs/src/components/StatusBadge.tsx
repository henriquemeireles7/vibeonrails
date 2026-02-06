import React from 'react';

export type BadgeStatus = 'stable' | 'beta' | 'experimental' | 'deprecated';

export interface StatusBadgeProps {
  /** Feature status. */
  status: BadgeStatus;
}

const BADGE_STYLES: Record<BadgeStatus, { bg: string; text: string; label: string }> = {
  stable: { bg: '#16a34a', text: '#ffffff', label: 'Stable' },
  beta: { bg: '#eab308', text: '#000000', label: 'Beta' },
  experimental: { bg: '#f97316', text: '#000000', label: 'Experimental' },
  deprecated: { bg: '#ef4444', text: '#ffffff', label: 'Deprecated' },
};

/**
 * Renders a colored status badge indicating feature maturity.
 *
 * ```mdx
 * <StatusBadge status="stable" />
 * ```
 */
export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const style = BADGE_STYLES[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.15em 0.5em',
        fontSize: '0.75rem',
        fontWeight: 600,
        borderRadius: '9999px',
        backgroundColor: style.bg,
        color: style.text,
        lineHeight: 1.5,
      }}
    >
      {style.label}
    </span>
  );
}
