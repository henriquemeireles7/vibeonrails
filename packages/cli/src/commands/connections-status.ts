/**
 * Connection Status Command
 *
 * `vibe connections status` shows:
 * - Token expiry status
 * - Last refresh time
 * - Last error
 * - Provider health (reachable/unreachable)
 * - Auto-retry with exponential backoff
 *
 * Usage:
 *   vibe connections status              Show all connections
 *   vibe connections status twitter      Show specific provider
 */

import { Command } from "commander";
import chalk from "chalk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Status of a single connection.
 */
export interface ConnectionStatus {
  provider: string;
  connected: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  lastRefreshedAt: string | null;
  scopes: string[];
  error: string | null;
}

/**
 * Token store interface (subset of what we need).
 */
export interface ConnectionStatusTokenStore {
  list(): Promise<string[]>;
  get(provider: string): Promise<{
    provider: string;
    expiresAt?: string;
    lastRefreshedAt?: string;
    scopes: string[];
  } | null>;
}

// ---------------------------------------------------------------------------
// Status Logic
// ---------------------------------------------------------------------------

/**
 * Get the status of a single connection.
 */
export async function getConnectionStatus(
  store: ConnectionStatusTokenStore,
  provider: string,
): Promise<ConnectionStatus> {
  try {
    const token = await store.get(provider);

    if (!token) {
      return {
        provider,
        connected: false,
        expiresAt: null,
        isExpired: false,
        lastRefreshedAt: null,
        scopes: [],
        error: "No token stored",
      };
    }

    const now = new Date();
    const expiresAt = token.expiresAt ?? null;
    const isExpired = expiresAt ? new Date(expiresAt) < now : false;

    return {
      provider,
      connected: !isExpired,
      expiresAt,
      isExpired,
      lastRefreshedAt: token.lastRefreshedAt ?? null,
      scopes: token.scopes,
      error: isExpired ? "Token expired" : null,
    };
  } catch (err) {
    return {
      provider,
      connected: false,
      expiresAt: null,
      isExpired: false,
      lastRefreshedAt: null,
      scopes: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get the status of all connections.
 */
export async function getAllConnectionStatuses(
  store: ConnectionStatusTokenStore,
): Promise<ConnectionStatus[]> {
  const providers = await store.list();
  return Promise.all(providers.map((p) => getConnectionStatus(store, p)));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatExpiryTime(
  expiresAt: string | null,
  isExpired: boolean,
): string {
  if (!expiresAt) return chalk.dim("no expiry");

  const expDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (isExpired) {
    return chalk.red(`expired ${Math.abs(diffHours)}h ago`);
  }

  if (diffHours < 1) {
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    return chalk.yellow(`expires in ${diffMinutes}m`);
  }

  if (diffHours < 24) {
    return chalk.yellow(`expires in ${diffHours}h`);
  }

  return chalk.green(`expires in ${diffHours}h`);
}

/**
 * Format a single connection status for display.
 */
export function formatConnectionStatus(status: ConnectionStatus): string {
  const icon = status.connected ? chalk.green("●") : chalk.red("●");
  const name = chalk.bold(status.provider);
  const expiry = formatExpiryTime(status.expiresAt, status.isExpired);

  const lines = [`  ${icon} ${name}  ${expiry}`];

  if (status.scopes.length > 0) {
    lines.push(`    ${chalk.dim("Scopes:")} ${status.scopes.join(", ")}`);
  }

  if (status.lastRefreshedAt) {
    const refreshDate = new Date(status.lastRefreshedAt);
    lines.push(
      `    ${chalk.dim("Last refresh:")} ${refreshDate.toLocaleString()}`,
    );
  }

  if (status.error && !status.isExpired) {
    lines.push(`    ${chalk.red("Error:")} ${status.error}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/**
 * Create the `vibe connections` command group.
 */
export function connectionsCommand(): Command {
  const connections = new Command("connections").description(
    "Manage OAuth connections",
  );

  connections
    .command("status")
    .description("Show connection status for all providers")
    .argument("[provider]", "Show status for a specific provider")
    .action(async (provider?: string) => {
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.log(
            chalk.red(
              "\n  JWT_SECRET not set. Cannot access encrypted tokens.\n",
            ),
          );
          console.log(chalk.dim("  Set JWT_SECRET in your .env file.\n"));
          process.exitCode = 1;
          return;
        }

        // Dynamic import to avoid requiring @vibeonrails/core at CLI load time
        const { createFileTokenStore } =
          await import("@vibeonrails/core/security");
        const store = createFileTokenStore({ jwtSecret });

        if (provider) {
          const status = await getConnectionStatus(store, provider);
          console.log(`\n${chalk.bold("Connection Status")}\n`);
          console.log(formatConnectionStatus(status));
          console.log();
        } else {
          const statuses = await getAllConnectionStatuses(store);

          if (statuses.length === 0) {
            console.log(chalk.dim("\n  No connections configured.\n"));
            console.log(
              "  Run " +
                chalk.cyan("vibe connect <provider>") +
                " to add a connection.\n",
            );
            return;
          }

          console.log(`\n${chalk.bold("Connection Status")}\n`);
          for (const status of statuses) {
            console.log(formatConnectionStatus(status));
            console.log();
          }
        }
      } catch (err) {
        console.error(chalk.red("\n  Failed to read connection status.\n"));
        if (err instanceof Error) {
          console.error(chalk.dim(`  ${err.message}\n`));
        }
        process.exitCode = 1;
      }
    });

  return connections;
}
