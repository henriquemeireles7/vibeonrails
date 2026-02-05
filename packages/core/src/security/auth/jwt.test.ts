import { describe, it, expect, beforeAll } from 'vitest';
import { signAccessToken, signRefreshToken, verifyToken } from './jwt.js';

beforeAll(() => {
  // Set JWT_SECRET for tests
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
});

describe('signAccessToken', () => {
  it('should sign a token with user data', async () => {
    const token = await signAccessToken({
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });
});

describe('signRefreshToken', () => {
  it('should sign a refresh token with user ID', async () => {
    const token = await signRefreshToken('user-123');

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('verifyToken', () => {
  it('should verify and decode a valid access token', async () => {
    const token = await signAccessToken({
      id: 'user-123',
      email: 'test@example.com',
      role: 'admin',
    });

    const payload = await verifyToken(token);

    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.role).toBe('admin');
  });

  it('should reject an invalid token', async () => {
    await expect(verifyToken('invalid-token')).rejects.toThrow();
  });

  it('should reject a tampered token', async () => {
    const token = await signAccessToken({
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });

    // Tamper with the token
    const tampered = token.slice(0, -5) + 'XXXXX';

    await expect(verifyToken(tampered)).rejects.toThrow();
  });
});
