/**
 * Authorization Guards
 *
 * Guards are functions that check whether a user has permission
 * to perform an action. They throw TRPCError if unauthorized.
 *
 * Usage in controllers:
 *   requireRole('admin')(ctx);
 *   requireOwnership(post.authorId)(ctx);
 */

import { TRPCError } from '@trpc/server';
import type { Context, Role } from '../../shared/types/index.js';

/**
 * Require the user to have one of the specified roles.
 *
 * @param roles - Allowed roles
 * @returns Guard function that throws if user doesn't have required role
 */
export function requireRole(...roles: Role[]) {
  return (ctx: Context) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }
    if (!roles.includes(ctx.user.role as Role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Required role: ${roles.join(' or ')}. Current role: ${ctx.user.role}`,
      });
    }
  };
}

/**
 * Require the user to own the resource (or be an admin).
 *
 * @param resourceUserId - The user ID that owns the resource
 * @returns Guard function that throws if user doesn't own the resource
 */
export function requireOwnership(resourceUserId: string) {
  return (ctx: Context) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }
    if (ctx.user.id !== resourceUserId && ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not own this resource',
      });
    }
  };
}
