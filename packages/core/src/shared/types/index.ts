/**
 * @vibeonrails/core - Shared Type Definitions
 *
 * Central type definitions used across the framework.
 * These types are the single source of truth.
 */

/**
 * Note: The canonical User type is derived from the database schema.
 * Import it from '@vibeonrails/core/database' instead:
 *   import { type User } from '@vibeonrails/core/database';
 */

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export type Role = 'user' | 'admin';

export interface Context {
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
}

export interface AuthenticatedContext extends Context {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
