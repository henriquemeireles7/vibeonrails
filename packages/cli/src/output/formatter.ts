/**
 * CLI Output Formatter
 *
 * Respects VIBE_OUTPUT env var: human (colors/spinners), json (structured), ci (plain).
 * Consistent envelope: { command, success, data, warnings, next_steps }.
 */

// ---------------------------------------------------------------------------
// Output Mode
// ---------------------------------------------------------------------------

export type OutputMode = 'human' | 'json' | 'ci';

export function getOutputMode(): OutputMode {
  const mode = process.env.VIBE_OUTPUT;
  if (mode === 'json') return 'json';
  if (mode === 'ci') return 'ci';
  return 'human';
}

// ---------------------------------------------------------------------------
// Output Envelope
// ---------------------------------------------------------------------------

export interface OutputEnvelope<T = unknown> {
  command: string;
  success: boolean;
  data: T;
  warnings: string[];
  next_steps: string[];
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

export interface OutputFormatter {
  /** Output a success result */
  success<T>(options: {
    command: string;
    data: T;
    message?: string;
    warnings?: string[];
    nextSteps?: string[];
  }): void;

  /** Output an error result */
  error(options: {
    command: string;
    message: string;
    detail?: string;
    fix?: string;
    code?: string;
  }): void;

  /** Output a table (for list commands) */
  table(headers: string[], rows: string[][]): void;

  /** Output a progress message */
  info(message: string): void;

  /** Output a warning */
  warn(message: string): void;
}

/**
 * Create an output formatter that respects VIBE_OUTPUT.
 */
export function createFormatter(): OutputFormatter {
  const mode = getOutputMode();

  return {
    success<T>({
      command,
      data,
      message,
      warnings = [],
      nextSteps = [],
    }: {
      command: string;
      data: T;
      message?: string;
      warnings?: string[];
      nextSteps?: string[];
    }): void {
      if (mode === 'json') {
        const envelope: OutputEnvelope<T> = {
          command,
          success: true,
          data,
          warnings,
          next_steps: nextSteps,
        };
        console.log(JSON.stringify(envelope, null, 2));
        return;
      }

      if (mode === 'ci') {
        if (message) console.log(message);
        if (typeof data === 'object' && data !== null) {
          console.log(JSON.stringify(data));
        }
        for (const w of warnings) {
          console.log(`WARNING: ${w}`);
        }
        return;
      }

      // Human mode
      if (message) {
        console.log(`\n  ${message}\n`);
      }

      for (const w of warnings) {
        console.log(`  Warning: ${w}`);
      }

      if (nextSteps.length > 0) {
        console.log('\n  Next steps:');
        for (const step of nextSteps) {
          console.log(`    ${step}`);
        }
        console.log();
      }
    },

    error({
      command,
      message,
      detail,
      fix,
      code,
    }: {
      command: string;
      message: string;
      detail?: string;
      fix?: string;
      code?: string;
    }): void {
      if (mode === 'json') {
        const envelope: OutputEnvelope = {
          command,
          success: false,
          data: { code, message, detail, fix },
          warnings: [],
          next_steps: fix ? [fix] : [],
        };
        console.log(JSON.stringify(envelope, null, 2));
        return;
      }

      if (mode === 'ci') {
        console.error(`ERROR${code ? ` [${code}]` : ''}: ${message}`);
        if (fix) console.error(`FIX: ${fix}`);
        return;
      }

      // Human mode
      console.error(`\n  Error${code ? ` [${code}]` : ''}: ${message}`);
      if (detail) console.error(`  ${detail}`);
      if (fix) console.error(`\n  Fix: ${fix}`);
      console.error();
    },

    table(headers: string[], rows: string[][]): void {
      if (mode === 'json') {
        const data = rows.map((row) => {
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h] = row[i] ?? '';
          });
          return obj;
        });
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      // Calculate column widths
      const widths = headers.map((h, i) => {
        const maxRow = Math.max(...rows.map((r) => (r[i] ?? '').length));
        return Math.max(h.length, maxRow);
      });

      // Print header
      const headerLine = headers
        .map((h, i) => h.padEnd(widths[i]!))
        .join('  ');
      console.log(`  ${headerLine}`);
      console.log(`  ${widths.map((w) => '-'.repeat(w)).join('  ')}`);

      // Print rows
      for (const row of rows) {
        const line = row
          .map((cell, i) => (cell ?? '').padEnd(widths[i]!))
          .join('  ');
        console.log(`  ${line}`);
      }
    },

    info(message: string): void {
      if (mode === 'json') return; // Suppress info in JSON mode
      if (mode === 'ci') {
        console.log(message);
        return;
      }
      console.log(`  ${message}`);
    },

    warn(message: string): void {
      if (mode === 'json') return; // Warnings go in the envelope
      if (mode === 'ci') {
        console.log(`WARNING: ${message}`);
        return;
      }
      console.log(`  Warning: ${message}`);
    },
  };
}
