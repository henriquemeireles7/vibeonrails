import React from 'react';

/** A single parameter/option for an API function. */
export interface ApiParam {
  /** Parameter name. */
  name: string;
  /** TypeScript type annotation. */
  type: string;
  /** Whether the parameter is required. */
  required?: boolean;
  /** Default value if optional. */
  defaultValue?: string;
  /** Human-readable description. */
  description: string;
}

export interface ApiReferenceProps {
  /** Function/method name. */
  name: string;
  /** Full TypeScript signature string. */
  signature: string;
  /** Description of what the function does. */
  description?: string;
  /** Parameters table. */
  params?: ApiParam[];
  /** Return type description. */
  returns?: string;
  /** Optional since version string. */
  since?: string;
}

/**
 * Renders an API function reference with signature and parameter table.
 *
 * ```mdx
 * <ApiReference
 *   name="createServer"
 *   signature="createServer(options: ServerOptions): HonoApp"
 *   params={[
 *     { name: 'options', type: 'ServerOptions', required: true, description: 'Server config' },
 *   ]}
 *   returns="A configured Hono application instance."
 * />
 * ```
 */
export function ApiReference({
  name,
  signature,
  description,
  params,
  returns,
  since,
}: ApiReferenceProps): React.ReactElement {
  return (
    <div style={{ margin: '1.5em 0', borderLeft: '3px solid var(--sl-color-accent, #6366f1)', paddingLeft: '1em' }}>
      <h3 style={{ marginTop: 0, fontFamily: 'var(--sl-font-mono, monospace)' }}>
        {name}
        {since && (
          <span style={{ fontSize: '0.7em', fontWeight: 400, marginLeft: '0.5em', color: 'var(--sl-color-gray-3, #888)' }}>
            v{since}+
          </span>
        )}
      </h3>

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
        <code>{signature}</code>
      </pre>

      {description && <p>{description}</p>}

      {params && params.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginTop: '0.5em' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--sl-color-gray-5, #353841)' }}>
              <th style={{ textAlign: 'left', padding: '0.5em' }}>Parameter</th>
              <th style={{ textAlign: 'left', padding: '0.5em' }}>Type</th>
              <th style={{ textAlign: 'center', padding: '0.5em' }}>Required</th>
              <th style={{ textAlign: 'left', padding: '0.5em' }}>Default</th>
              <th style={{ textAlign: 'left', padding: '0.5em' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.name} style={{ borderBottom: '1px solid var(--sl-color-gray-5, #353841)' }}>
                <td style={{ padding: '0.5em', fontFamily: 'var(--sl-font-mono, monospace)' }}>{p.name}</td>
                <td style={{ padding: '0.5em', fontFamily: 'var(--sl-font-mono, monospace)' }}>{p.type}</td>
                <td style={{ padding: '0.5em', textAlign: 'center' }}>{p.required ? 'Yes' : 'No'}</td>
                <td style={{ padding: '0.5em', fontFamily: 'var(--sl-font-mono, monospace)' }}>{p.defaultValue ?? '-'}</td>
                <td style={{ padding: '0.5em' }}>{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {returns && (
        <p>
          <strong>Returns:</strong> {returns}
        </p>
      )}
    </div>
  );
}
