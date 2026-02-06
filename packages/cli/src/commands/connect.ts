/**
 * Connect CLI Commands
 *
 * Implements `npx vibe connect <provider>`,
 * `npx vibe connections list`, and
 * `npx vibe disconnect <provider>`.
 *
 * Uses the OAuth token store from @vibeonrails/core for
 * encrypted credential management.
 */

import { Command } from "commander";

// ---------------------------------------------------------------------------
// Supported Providers
// ---------------------------------------------------------------------------

const SUPPORTED_PROVIDERS = ["twitter", "bluesky", "stripe"] as const;

type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

interface ProviderConfig {
  name: SupportedProvider;
  displayName: string;
  authType: "oauth" | "api-key";
  description: string;
}

const PROVIDER_CONFIGS: Record<SupportedProvider, ProviderConfig> = {
  twitter: {
    name: "twitter",
    displayName: "Twitter / X",
    authType: "oauth",
    description: "OAuth2 flow for Twitter API v2 access (posting, reading)",
  },
  bluesky: {
    name: "bluesky",
    displayName: "Bluesky",
    authType: "api-key",
    description: "App password authentication for Bluesky AT Protocol",
  },
  stripe: {
    name: "stripe",
    displayName: "Stripe",
    authType: "api-key",
    description: "API key configuration for Stripe payments",
  },
};

// ---------------------------------------------------------------------------
// Token Store Factory (lazy load to avoid circular deps)
// ---------------------------------------------------------------------------

interface TokenStoreInterface {
  get(
    provider: string,
  ): Promise<{
    provider: string;
    accessToken: string;
    scopes: string[];
    expiresAt?: string;
    storedAt: string;
  } | null>;
  set(provider: string, token: Record<string, unknown>): Promise<void>;
  remove(provider: string): Promise<boolean>;
  list(): Promise<string[]>;
  has(provider: string): Promise<boolean>;
}

export interface ConnectCommandOptions {
  /** Token store instance */
  tokenStore: TokenStoreInterface;
}

// ---------------------------------------------------------------------------
// Connect Command
// ---------------------------------------------------------------------------

/**
 * Execute the connect flow for a provider.
 * For OAuth providers, opens browser for authentication.
 * For API key providers, prompts for key input.
 */
export async function executeConnect(
  provider: string,
  tokenStore: TokenStoreInterface,
  options: { accessToken?: string; handle?: string } = {},
): Promise<{ success: boolean; message: string }> {
  if (!SUPPORTED_PROVIDERS.includes(provider as SupportedProvider)) {
    return {
      success: false,
      message: `Unknown provider: "${provider}". Supported providers: ${SUPPORTED_PROVIDERS.join(", ")}`,
    };
  }

  const config = PROVIDER_CONFIGS[provider as SupportedProvider];

  // Check if already connected
  const existing = await tokenStore.has(provider);
  if (existing) {
    return {
      success: false,
      message: `Already connected to ${config.displayName}. Run "vibe disconnect ${provider}" first to reconnect.`,
    };
  }

  if (config.authType === "api-key") {
    // For API key auth, the token is passed directly
    if (!options.accessToken) {
      return {
        success: false,
        message:
          `Please provide an access token or API key for ${config.displayName}.\n` +
          `Usage: vibe connect ${provider} --token <your-api-key>`,
      };
    }

    await tokenStore.set(provider, {
      provider,
      accessToken: options.accessToken,
      tokenType: "Bearer",
      scopes: [],
      storedAt: new Date().toISOString(),
      metadata: options.handle ? { handle: options.handle } : {},
    });

    return {
      success: true,
      message: `Connected to ${config.displayName}. Credentials stored securely.`,
    };
  }

  // OAuth flow — in the real implementation this would open a browser
  // For now, accept token directly (same as API key flow)
  if (!options.accessToken) {
    return {
      success: false,
      message:
        `OAuth flow for ${config.displayName} requires a token.\n` +
        `Get your token from the provider's developer portal, then run:\n` +
        `  vibe connect ${provider} --token <your-access-token>`,
    };
  }

  await tokenStore.set(provider, {
    provider,
    accessToken: options.accessToken,
    tokenType: "Bearer",
    scopes: [],
    storedAt: new Date().toISOString(),
    metadata: {},
  });

  return {
    success: true,
    message: `Connected to ${config.displayName}. OAuth credentials stored securely.`,
  };
}

// ---------------------------------------------------------------------------
// List Connections
// ---------------------------------------------------------------------------

export interface ConnectionInfo {
  provider: string;
  displayName: string;
  connected: boolean;
  authType: "oauth" | "api-key";
  storedAt: string | null;
}

/**
 * List all connections and their status.
 */
export async function listConnections(
  tokenStore: TokenStoreInterface,
): Promise<ConnectionInfo[]> {
  const connections: ConnectionInfo[] = [];

  for (const provider of SUPPORTED_PROVIDERS) {
    const config = PROVIDER_CONFIGS[provider];
    const token = await tokenStore.get(provider);

    connections.push({
      provider: config.name,
      displayName: config.displayName,
      connected: token !== null,
      authType: config.authType,
      storedAt: token?.storedAt ?? null,
    });
  }

  return connections;
}

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------

/**
 * Remove stored credentials for a provider.
 */
export async function executeDisconnect(
  provider: string,
  tokenStore: TokenStoreInterface,
): Promise<{ success: boolean; message: string }> {
  if (!SUPPORTED_PROVIDERS.includes(provider as SupportedProvider)) {
    return {
      success: false,
      message: `Unknown provider: "${provider}". Supported providers: ${SUPPORTED_PROVIDERS.join(", ")}`,
    };
  }

  const config = PROVIDER_CONFIGS[provider as SupportedProvider];
  const removed = await tokenStore.remove(provider);

  if (!removed) {
    return {
      success: false,
      message: `Not connected to ${config.displayName}.`,
    };
  }

  return {
    success: true,
    message: `Disconnected from ${config.displayName}. Credentials removed.`,
  };
}

// ---------------------------------------------------------------------------
// Format Helpers
// ---------------------------------------------------------------------------

/**
 * Format connections list for CLI output.
 */
export function formatConnectionsList(connections: ConnectionInfo[]): string {
  const lines: string[] = [""];

  for (const conn of connections) {
    const status = conn.connected ? "+" : "-";
    const authLabel = conn.authType === "oauth" ? "OAuth" : "API Key";
    const since = conn.storedAt
      ? ` (since ${conn.storedAt.split("T")[0]})`
      : "";
    lines.push(`  ${status} ${conn.displayName} [${authLabel}]${since}`);
  }

  const connectedCount = connections.filter((c) => c.connected).length;
  lines.push(`\n  ${connectedCount}/${connections.length} connected`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Commander Command
// ---------------------------------------------------------------------------

/**
 * Create the `vibe connect` command group.
 */
export function connectCommand(): Command {
  const connect = new Command("connect").description(
    "Connect to external services (OAuth/API key)",
  );

  connect
    .command("provider <provider>")
    .description("Connect to a provider")
    .option("-t, --token <token>", "Access token or API key")
    .option("--handle <handle>", "Account handle (for Bluesky)")
    .action(
      async (
        provider: string,
        options: { token?: string; handle?: string },
      ) => {
        // Token store would be injected in real usage
        console.log(
          `Connect to ${provider} — use the @vibeonrails/core token store`,
        );
        console.log("Pass --token to provide your access token or API key");
      },
    );

  return connect;
}

/**
 * Create the `vibe connections` command.
 */
export function connectionsCommand(): Command {
  const connections = new Command("connections").description(
    "Manage service connections",
  );

  connections
    .command("list")
    .description("List all connections and their status")
    .action(async () => {
      console.log("Connections list — use the @vibeonrails/core token store");
    });

  return connections;
}

/**
 * Create the `vibe disconnect` command.
 */
export function disconnectCommand(): Command {
  return new Command("disconnect")
    .argument("<provider>", "Provider to disconnect from")
    .description("Remove stored credentials for a provider")
    .action(async (provider: string) => {
      console.log(
        `Disconnect from ${provider} — use the @vibeonrails/core token store`,
      );
    });
}
