import { describe, it, expect } from "vitest";
import { encrypt, decrypt, generateEncryptionKey } from "./encrypt.js";
import { sha256, hmacSha256 } from "./hash.js";
import { generateToken, generateOTP } from "./tokens.js";

describe("encrypt / decrypt", () => {
  const key = generateEncryptionKey();

  it("encrypts and decrypts a string", async () => {
    const plaintext = "Hello, World!";
    const ciphertext = await encrypt(plaintext, key);
    expect(ciphertext).not.toBe(plaintext);
    const decrypted = await decrypt(ciphertext, key);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", async () => {
    const a = await encrypt("same", key);
    const b = await encrypt("same", key);
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with wrong key", async () => {
    const ciphertext = await encrypt("secret", key);
    const wrongKey = generateEncryptionKey();
    await expect(decrypt(ciphertext, wrongKey)).rejects.toThrow();
  });
});

describe("sha256", () => {
  it("returns a 64-char hex string", async () => {
    const hash = await sha256("test");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic", async () => {
    const a = await sha256("hello");
    const b = await sha256("hello");
    expect(a).toBe(b);
  });
});

describe("hmacSha256", () => {
  it("returns a 64-char hex HMAC", async () => {
    const mac = await hmacSha256("message", "secret");
    expect(mac).toHaveLength(64);
  });

  it("different secrets produce different MACs", async () => {
    const a = await hmacSha256("message", "secret1");
    const b = await hmacSha256("message", "secret2");
    expect(a).not.toBe(b);
  });
});

describe("generateToken", () => {
  it("generates a URL-safe token", () => {
    const token = generateToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });
});

describe("generateOTP", () => {
  it("generates a 6-digit code by default", () => {
    const otp = generateOTP();
    expect(otp).toHaveLength(6);
    expect(otp).toMatch(/^\d+$/);
  });

  it("generates the requested number of digits", () => {
    const otp = generateOTP(4);
    expect(otp).toHaveLength(4);
  });
});
