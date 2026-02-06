import React, { useState } from 'react';

export type PackageManager = 'pnpm' | 'npm' | 'yarn';

export interface PackageInstallProps {
  /** Package name(s) to install. Separate multiple with spaces. */
  pkg: string;
  /** Whether this is a dev dependency. */
  dev?: boolean;
}

function getCommand(pm: PackageManager, pkg: string, dev: boolean): string {
  const devFlag = dev ? ' -D' : '';
  switch (pm) {
    case 'pnpm':
      return `pnpm add${devFlag} ${pkg}`;
    case 'npm':
      return `npm install${dev ? ' --save-dev' : ''} ${pkg}`;
    case 'yarn':
      return `yarn add${dev ? ' --dev' : ''} ${pkg}`;
  }
}

/**
 * Renders a tabbed package install command for pnpm/npm/yarn.
 *
 * ```mdx
 * <PackageInstall pkg="@vibeonrails/core" />
 * <PackageInstall pkg="vitest" dev />
 * ```
 */
export function PackageInstall({ pkg, dev = false }: PackageInstallProps): React.ReactElement {
  const [active, setActive] = useState<PackageManager>('pnpm');
  const managers: PackageManager[] = ['pnpm', 'npm', 'yarn'];

  return (
    <div style={{ margin: '1em 0' }}>
      <div style={{ display: 'flex', gap: '0.25em', marginBottom: '0.5em' }}>
        {managers.map((pm) => (
          <button
            key={pm}
            onClick={() => setActive(pm)}
            style={{
              padding: '0.25em 0.75em',
              fontSize: '0.8rem',
              fontWeight: active === pm ? 700 : 400,
              border: '1px solid var(--sl-color-gray-4, #888)',
              borderRadius: '4px',
              background: active === pm ? 'var(--sl-color-accent, #6366f1)' : 'transparent',
              color: active === pm ? 'var(--sl-color-white, #fff)' : 'inherit',
              cursor: 'pointer',
            }}
          >
            {pm}
          </button>
        ))}
      </div>
      <pre
        style={{
          padding: '0.75em 1em',
          borderRadius: '6px',
          backgroundColor: 'var(--sl-color-gray-6, #24272f)',
          color: 'var(--sl-color-gray-1, #eceef2)',
          fontSize: '0.875rem',
          overflow: 'auto',
        }}
      >
        <code>{getCommand(active, pkg, dev)}</code>
      </pre>
    </div>
  );
}
