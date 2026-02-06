/**
 * Default VibeonRails documentation theme.
 *
 * Defines CSS custom properties that can be overridden by consumers.
 * Uses indigo accent, Inter font family, and JetBrains Mono for code.
 */

/** CSS string for the default VibeonRails docs theme. */
export const defaultThemeCSS = `
/* VibeonRails Documentation Theme */
:root {
  --sl-color-accent-low: #1a1a2e;
  --sl-color-accent: #6366f1;
  --sl-color-accent-high: #a5b4fc;
  --sl-color-white: #ffffff;
  --sl-color-gray-1: #eceef2;
  --sl-color-gray-2: #c0c2c7;
  --sl-color-gray-3: #888b96;
  --sl-color-gray-4: #545861;
  --sl-color-gray-5: #353841;
  --sl-color-gray-6: #24272f;
  --sl-color-black: #17181c;
  --sl-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --sl-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

:root[data-theme='dark'] {
  --sl-color-accent-low: #1e1b4b;
  --sl-color-accent: #818cf8;
  --sl-color-accent-high: #c7d2fe;
}

.sl-badge {
  font-size: 0.75rem;
  font-weight: 600;
}
`.trim();

export interface ThemeOptions {
  /** Primary accent color (CSS value). Overrides --sl-color-accent. */
  accentColor?: string;
  /** Font family for body text. */
  fontFamily?: string;
  /** Font family for code blocks. */
  fontMono?: string;
  /** Additional custom CSS to append. */
  customCSS?: string;
}

/**
 * Generate a theme CSS string with optional overrides.
 *
 * @param options - Theme customization options
 * @returns CSS string ready to be written to a file or injected
 */
export function generateThemeCSS(options: ThemeOptions = {}): string {
  let css = defaultThemeCSS;

  if (options.accentColor) {
    css = css.replace(
      '--sl-color-accent: #6366f1;',
      `--sl-color-accent: ${options.accentColor};`,
    );
  }

  if (options.fontFamily) {
    css = css.replace(
      /--sl-font: .+;/,
      `--sl-font: ${options.fontFamily};`,
    );
  }

  if (options.fontMono) {
    css = css.replace(
      /--sl-font-mono: .+;/,
      `--sl-font-mono: ${options.fontMono};`,
    );
  }

  if (options.customCSS) {
    css += `\n\n${options.customCSS}`;
  }

  return css;
}
