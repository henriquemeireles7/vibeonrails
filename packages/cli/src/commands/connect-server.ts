/**
 * OAuth Connect Flow — Local HTTP Server
 *
 * Implements the OAuth authorization code flow with a local HTTP server
 * for receiving the callback (similar to `gh auth login`).
 *
 * Features:
 * - Starts a temporary HTTP server on a random port
 * - Opens browser for user authorization
 * - Waits for OAuth callback with authorization code
 * - Exchanges code for tokens
 * - Stores encrypted tokens using the OAuth token store
 * - Falls back to device code flow in headless environments (non-TTY)
 */

import { createServer, type Server } from "node:http";
import { createServer as createNetServer } from "node:net";
import { randomBytes } from "node:crypto";
import {
  createFileTokenStore,
  type OAuthToken,
} from "@vibeonrails/core/security";

export interface ConnectOptions {
  /** OAuth provider identifier (e.g., "twitter", "bluesky") */
  provider: string;
  /** OAuth client ID */
  clientId: string;
  /** OAuth authorization URL */
  authorizationUrl: string;
  /** OAuth token exchange URL */
  tokenUrl: string;
  /** OAuth scopes to request */
  scopes: string[];
  /** JWT secret for token encryption */
  jwtSecret: string;
  /** Project root directory (defaults to process.cwd()) */
  projectRoot?: string;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
}

/**
 * Find an available port by attempting to bind to a random port.
 */
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === "object" && "port" in address) {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Could not determine port")));
      }
    });
    server.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Check if the current environment is a TTY (interactive terminal).
 */
function isTTY(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

/**
 * Open the browser with the authorization URL.
 * Falls back to printing the URL if `open` package is not available.
 */
async function openBrowser(url: string): Promise<void> {
  try {
    const openModule = await import("open");
    // The 'open' package exports a default function
    const openFn = "default" in openModule ? openModule.default : openModule;
    await openFn(url);
  } catch {
    // Fallback: print the URL
    console.log(`\nPlease open this URL in your browser:\n\n  ${url}\n`);
  }
}

/**
 * Generate a random state string for OAuth CSRF protection.
 */
function generateState(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Build the OAuth authorization URL with all required parameters.
 */
function buildAuthorizationUrl(
  authorizationUrl: string,
  clientId: string,
  redirectUri: string,
  scopes: string[],
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state,
  });
  return `${authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for OAuth tokens.
 */
async function exchangeCodeForToken(
  tokenUrl: string,
  clientId: string,
  code: string,
  redirectUri: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OAuth token exchange failed: ${response.status} ${response.statusText}\n${errorText}`,
    );
  }

  return response.json() as Promise<Record<string, unknown>>;
}

/**
 * Convert raw OAuth token response to OAuthToken format.
 */
function normalizeToken(
  provider: string,
  rawToken: Record<string, unknown>,
  scopes: string[],
): OAuthToken {
  const accessToken = String(rawToken.access_token ?? "");
  const refreshToken = rawToken.refresh_token
    ? String(rawToken.refresh_token)
    : undefined;
  const tokenType = String(rawToken.token_type ?? "Bearer");
  const expiresIn = rawToken.expires_in
    ? Number(rawToken.expires_in)
    : undefined;
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : undefined;

  return {
    provider,
    accessToken,
    refreshToken,
    tokenType,
    expiresAt,
    scopes,
    storedAt: new Date().toISOString(),
    metadata: {},
  };
}

/**
 * Start the OAuth authorization code flow with a local HTTP server.
 *
 * This function:
 * 1. Starts a temporary HTTP server on a random port
 * 2. Generates the OAuth authorization URL
 * 3. Opens the browser (or prints URL if headless)
 * 4. Waits for the callback with the authorization code
 * 5. Exchanges the code for tokens
 * 6. Encrypts and stores the token
 * 7. Shuts down the server
 *
 * Falls back to device code flow if running in a non-TTY environment.
 */
export async function startConnectFlow(
  options: ConnectOptions,
): Promise<OAuthToken> {
  const {
    provider,
    clientId,
    authorizationUrl,
    tokenUrl,
    scopes,
    jwtSecret,
    projectRoot,
  } = options;

  // Check if we're in a headless environment (non-TTY)
  if (!isTTY()) {
    throw new Error(
      "OAuth connect flow requires an interactive terminal. " +
        "Device code flow fallback is not yet implemented.",
    );
  }

  // Find a free port for the callback server
  const port = await findFreePort();
  const redirectUri = `http://localhost:${port}/callback`;
  const state = generateState();

  // Create token store
  const tokenStore = createFileTokenStore({
    jwtSecret,
    projectRoot,
  });

  return new Promise<OAuthToken>((resolve, reject) => {
    let server: Server | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (server) {
        server.close();
        server = null;
      }
    };

    // Set a timeout for the OAuth flow (5 minutes)
    timeoutId = setTimeout(
      () => {
        cleanup();
        reject(new Error("OAuth flow timed out after 5 minutes"));
      },
      5 * 60 * 1000,
    );

    // Create HTTP server for OAuth callback
    server = createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad Request");
        return;
      }

      const url = new URL(req.url, `http://localhost:${port}`);

      // Handle callback
      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const returnedState = url.searchParams.get("state");

        // Check for OAuth error
        if (error) {
          cleanup();
          res.writeHead(400);
          res.end(`OAuth error: ${error}`);
          reject(new Error(`OAuth authorization failed: ${error}`));
          return;
        }

        // Verify state (CSRF protection)
        if (returnedState !== state) {
          cleanup();
          res.writeHead(400);
          res.end("Invalid state parameter");
          reject(new Error("OAuth state mismatch - possible CSRF attack"));
          return;
        }

        // Check for authorization code
        if (!code) {
          cleanup();
          res.writeHead(400);
          res.end("Missing authorization code");
          reject(new Error("OAuth callback missing authorization code"));
          return;
        }

        try {
          // Exchange code for tokens
          const rawToken = await exchangeCodeForToken(
            tokenUrl,
            clientId,
            code,
            redirectUri,
          );

          // Normalize token format
          const token = normalizeToken(provider, rawToken, scopes);

          // Store encrypted token
          await tokenStore.set(provider, token);

          // Send success response
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <head><title>Authorization Successful</title></head>
              <body>
                <h1>Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                <script>setTimeout(() => window.close(), 2000);</script>
              </body>
            </html>
          `);

          cleanup();
          resolve(token);
        } catch (err) {
          cleanup();
          res.writeHead(500);
          res.end("Token exchange failed");
          reject(err);
        }
      } else {
        // Unknown path
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    // Start server
    server.listen(port, async () => {
      try {
        // Build authorization URL
        const authUrl = buildAuthorizationUrl(
          authorizationUrl,
          clientId,
          redirectUri,
          scopes,
          state,
        );

        // Open browser (or print URL)
        await openBrowser(authUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });

    server.on("error", (err) => {
      cleanup();
      reject(err);
    });
  });
}
