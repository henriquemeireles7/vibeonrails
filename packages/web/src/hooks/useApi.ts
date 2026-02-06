import { httpBatchLink, type TRPCLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@trpc/server";

// ---------------------------------------------------------------------------
// useApi — tRPC + React Query setup helpers
// ---------------------------------------------------------------------------

// Re-export createTRPCReact so consumers don't need to install @trpc/react-query
export { createTRPCReact } from "@trpc/react-query";

/**
 * Create a configured QueryClient with sensible defaults.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  });
}

/**
 * Create tRPC client link for httpBatchLink.
 *
 * Usage:
 * ```ts
 * const trpcClient = trpc.createClient({
 *   links: [createTRPCLink("/api/trpc", () => useAuth.getState().accessToken)],
 * });
 * ```
 */
export function createTRPCLink(
  url: string,
  getToken?: () => string | null,
): TRPCLink<AnyRouter> {
  return httpBatchLink({
    url,
    headers() {
      const token = getToken?.();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  });
}
