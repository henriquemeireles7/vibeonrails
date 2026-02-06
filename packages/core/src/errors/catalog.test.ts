import { describe, it, expect } from 'vitest';
import {
  ERROR_CATALOG,
  getError,
  interpolateMessage,
  getAllErrorCodes,
  getErrorsByDomain,
} from './catalog.js';

describe('Error Catalog', () => {
  it('should have no duplicate error codes', () => {
    const codes = getAllErrorCodes();
    const unique = new Set(codes);
    expect(codes.length).toBe(unique.size);
  });

  it('should look up error by code', () => {
    const error = getError('VOR_AUTH_001');
    expect(error).not.toBeNull();
    expect(error!.code).toBe('VOR_AUTH_001');
    expect(error!.message).toBe('Invalid credentials');
    expect(error!.statusCode).toBe(401);
  });

  it('should return null for unknown code', () => {
    expect(getError('VOR_UNKNOWN_999')).toBeNull();
  });

  it('should interpolate message templates', () => {
    const result = interpolateMessage(
      'Missing required environment variable: {name}',
      { name: 'DATABASE_URL' },
    );
    expect(result).toBe(
      'Missing required environment variable: DATABASE_URL',
    );
  });

  it('should keep unmatched placeholders', () => {
    const result = interpolateMessage('Error: {unknown}', {});
    expect(result).toBe('Error: {unknown}');
  });

  it('should have autoFixable flag on every entry', () => {
    for (const entry of Object.values(ERROR_CATALOG)) {
      expect(typeof entry.autoFixable).toBe('boolean');
    }
  });

  it('should have docs URL on every entry', () => {
    for (const entry of Object.values(ERROR_CATALOG)) {
      expect(entry.docsUrl).toMatch(/^https:\/\/vibeonrails\.dev\/errors\//);
      expect(entry.docsUrl).toContain(entry.code);
    }
  });

  it('should have fix on every entry', () => {
    for (const entry of Object.values(ERROR_CATALOG)) {
      expect(entry.fix.length).toBeGreaterThan(0);
    }
  });

  it('should get errors by domain', () => {
    const authErrors = getErrorsByDomain('AUTH');
    expect(authErrors.length).toBeGreaterThan(0);
    expect(authErrors.every((e) => e.code.startsWith('VOR_AUTH_'))).toBe(
      true,
    );
  });

  it('should follow VOR_XXX_NNN code format', () => {
    for (const code of getAllErrorCodes()) {
      expect(code).toMatch(/^VOR_[A-Z]+_\d{3}$/);
    }
  });
});
