import React, { useState } from 'react';

export interface CodeTab {
  /** Tab label (e.g. "TypeScript", "JavaScript"). */
  label: string;
  /** Language hint for syntax highlighting. */
  language: string;
  /** Code content. */
  code: string;
}

export interface CodeExampleProps {
  /** Tabs of code to display. */
  tabs: CodeTab[];
  /** Title above the code block. */
  title?: string;
}

/**
 * Renders a tabbed code example block.
 *
 * ```mdx
 * <CodeExample
 *   title="Creating a server"
 *   tabs={[
 *     { label: 'TypeScript', language: 'typescript', code: 'const app = createServer({...})' },
 *     { label: 'JavaScript', language: 'javascript', code: 'const app = createServer({...})' },
 *   ]}
 * />
 * ```
 */
export function CodeExample({ tabs, title }: CodeExampleProps): React.ReactElement {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeTab = tabs[activeIdx];

  if (!activeTab) {
    return <div>No code tabs provided.</div>;
  }

  return (
    <div style={{ margin: '1em 0' }}>
      {title && (
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35em', color: 'var(--sl-color-gray-2, #c0c2c7)' }}>
          {title}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.25em', marginBottom: '0.5em' }}>
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            onClick={() => setActiveIdx(idx)}
            style={{
              padding: '0.25em 0.75em',
              fontSize: '0.8rem',
              fontWeight: activeIdx === idx ? 700 : 400,
              border: '1px solid var(--sl-color-gray-4, #888)',
              borderRadius: '4px',
              background: activeIdx === idx ? 'var(--sl-color-accent, #6366f1)' : 'transparent',
              color: activeIdx === idx ? 'var(--sl-color-white, #fff)' : 'inherit',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <pre
        style={{
          padding: '0.75em 1em',
          borderRadius: '6px',
          backgroundColor: 'var(--sl-color-gray-6, #24272f)',
          color: 'var(--sl-color-gray-1, #eceef2)',
          fontSize: '0.85rem',
          overflow: 'auto',
        }}
      >
        <code>{activeTab.code}</code>
      </pre>
    </div>
  );
}
