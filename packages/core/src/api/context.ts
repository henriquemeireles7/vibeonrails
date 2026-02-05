/**
 * tRPC Context Creator
 *
 * Creates the context for each tRPC request.
 * Extracts user identity from the JWT Bearer token in the Authorization header.
 */

import { verifyToken } from '../security/auth/jwt.js';
import type { Context, TokenPayload } from '../shared/types/index.js';

/**
 * Create a tRPC context from an incoming request.
 * Automatically extracts and verifies JWT from the Authorization header.
 *
 * @param opts - Object containing the incoming Request
 * @returns Context with user (if authenticated) or null
 */
export async function createContext(opts: { req: Request }): Promise<Context> {
  const authHeader = opts.req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null };
  }

  try {
    const token = authHeader.slice(7);
    const payload: TokenPayload = await verifyToken(token);

    return {
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    };
  } catch {
    // Invalid or expired token — treat as unauthenticated
    return { user: null };
  }
}
