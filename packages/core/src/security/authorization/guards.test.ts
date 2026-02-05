import { describe, it, expect } from 'vitest';
import { requireRole, requireOwnership } from './guards.js';
import type { Context } from '../../shared/types/index.js';

describe('requireRole', () => {
  it('should allow users with the required role', () => {
    const ctx: Context = { user: { id: '1', email: 'admin@test.com', role: 'admin' } };
    expect(() => requireRole('admin')(ctx)).not.toThrow();
  });

  it('should allow users with any of the required roles', () => {
    const ctx: Context = { user: { id: '1', email: 'user@test.com', role: 'user' } };
    expect(() => requireRole('user', 'admin')(ctx)).not.toThrow();
  });

  it('should throw UNAUTHORIZED if no user', () => {
    const ctx: Context = { user: null };
    expect(() => requireRole('admin')(ctx)).toThrow('Authentication required');
  });

  it('should throw FORBIDDEN if wrong role', () => {
    const ctx: Context = { user: { id: '1', email: 'user@test.com', role: 'user' } };
    expect(() => requireRole('admin')(ctx)).toThrow('Required role');
  });
});

describe('requireOwnership', () => {
  it('should allow the resource owner', () => {
    const ctx: Context = { user: { id: 'user-1', email: 'a@test.com', role: 'user' } };
    expect(() => requireOwnership('user-1')(ctx)).not.toThrow();
  });

  it('should allow admins regardless of ownership', () => {
    const ctx: Context = { user: { id: 'admin-1', email: 'a@test.com', role: 'admin' } };
    expect(() => requireOwnership('user-1')(ctx)).not.toThrow();
  });

  it('should throw UNAUTHORIZED if no user', () => {
    const ctx: Context = { user: null };
    expect(() => requireOwnership('user-1')(ctx)).toThrow('Authentication required');
  });

  it('should throw FORBIDDEN if not owner and not admin', () => {
    const ctx: Context = { user: { id: 'user-2', email: 'b@test.com', role: 'user' } };
    expect(() => requireOwnership('user-1')(ctx)).toThrow('You do not own this resource');
  });
});
