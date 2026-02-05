import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('hashPassword', () => {
  it('should hash a password', async () => {
    const hashed = await hashPassword('mysecretpassword');

    expect(hashed).toBeDefined();
    expect(typeof hashed).toBe('string');
    expect(hashed).not.toBe('mysecretpassword');
    expect(hashed.startsWith('$argon2')).toBe(true);
  });

  it('should produce different hashes for the same password', async () => {
    const hash1 = await hashPassword('samepassword');
    const hash2 = await hashPassword('samepassword');

    expect(hash1).not.toBe(hash2); // Different salts
  });
});

describe('verifyPassword', () => {
  it('should verify a correct password', async () => {
    const hashed = await hashPassword('correctpassword');
    const isValid = await verifyPassword(hashed, 'correctpassword');

    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hashed = await hashPassword('correctpassword');
    const isValid = await verifyPassword(hashed, 'wrongpassword');

    expect(isValid).toBe(false);
  });

  it('should handle invalid hash gracefully', async () => {
    const isValid = await verifyPassword('not-a-valid-hash', 'password');
    expect(isValid).toBe(false);
  });
});
