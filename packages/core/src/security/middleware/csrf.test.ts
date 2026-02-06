import { describe, it, expect } from "vitest";
import { generateCsrfToken, verifyCsrfToken } from "./csrf.js";

describe("CSRF Protection", () => {
  const secret = "test-csrf-secret-key-1234567890ab";

  it("generates a token and signature", async () => {
    const { token, signature } = await generateCsrfToken(secret);
    expect(token).toBeDefined();
    expect(signature).toBeDefined();
    expect(token.length).toBeGreaterThan(20);
    expect(signature).toHaveLength(64);
  });

  it("verifies a valid token", async () => {
    const { token, signature } = await generateCsrfToken(secret);
    const valid = await verifyCsrfToken(token, signature, secret);
    expect(valid).toBe(true);
  });

  it("rejects a tampered token", async () => {
    const { signature } = await generateCsrfToken(secret);
    const valid = await verifyCsrfToken("tampered-token", signature, secret);
    expect(valid).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const { token } = await generateCsrfToken(secret);
    const valid = await verifyCsrfToken(token, "badsignature", secret);
    expect(valid).toBe(false);
  });

  it("rejects when using a different secret", async () => {
    const { token, signature } = await generateCsrfToken(secret);
    const valid = await verifyCsrfToken(token, signature, "wrong-secret");
    expect(valid).toBe(false);
  });
});
