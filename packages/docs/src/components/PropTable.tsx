import React from 'react';

/** A single prop definition for a React component. */
export interface PropDef {
  /** Prop name. */
  name: string;
  /** TypeScript type annotation. */
  type: string;
  /** Whether the prop is required. */
  required?: boolean;
  /** Default value. */
  defaultValue?: string;
  /** Human-readable description. */
  description: string;
}

export interface PropTableProps {
  /** Component name for the heading. */
  component: string;
  /** List of prop definitions. */
  props: PropDef[];
}

/**
 * Renders a table of React component props.
 *
 * ```mdx
 * <PropTable
 *   component="Button"
 *   props={[
 *     { name: 'variant', type: "'primary' | 'secondary'", required: true, description: 'Visual variant' },
 *     { name: 'size', type: "'sm' | 'md' | 'lg'", defaultValue: "'md'", description: 'Button size' },
 *   ]}
 * />
 * ```
 */
export function PropTable({ component, props }: PropTableProps): React.ReactElement {
  return (
    <div style={{ margin: '1em 0' }}>
      <h4 style={{ fontFamily: 'var(--sl-font-mono, monospace)', marginBottom: '0.5em' }}>
        {'<'}{component}{' />'} Props
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--sl-color-gray-5, #353841)' }}>
            <th style={{ textAlign: 'left', padding: '0.5em' }}>Prop</th>
            <th style={{ textAlign: 'left', padding: '0.5em' }}>Type</th>
            <th style={{ textAlign: 'center', padding: '0.5em' }}>Required</th>
            <th style={{ textAlign: 'left', padding: '0.5em' }}>Default</th>
            <th style={{ textAlign: 'left', padding: '0.5em' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.name} style={{ borderBottom: '1px solid var(--sl-color-gray-5, #353841)' }}>
              <td style={{ padding: '0.5em', fontFamily: 'var(--sl-font-mono, monospace)', fontWeight: 600 }}>{p.name}</td>
              <td style={{ padding: '0.5em', fontFamily: 'var(--sl-font-mono, monospace)', fontSize: '0.8rem' }}>{p.type}</td>
              <td style={{ padding: '0.5em', textAlign: 'center' }}>{p.required ? 'Yes' : '-'}</td>
              <td style={{ padding: '0.5em', fontFamily: 'var(--sl-font-mono, monospace)', fontSize: '0.8rem' }}>{p.defaultValue ?? '-'}</td>
              <td style={{ padding: '0.5em' }}>{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
