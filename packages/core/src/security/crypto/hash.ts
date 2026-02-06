/**
 * SHA-256 hashing utilities using Web Crypto API.
 */

/**
 * Hash a string with SHA-256 and return hex digest.
 */
export async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hash with SHA-256 and HMAC using a secret key.
 */
export async function hmacSha256(message: string, secret: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const messageData = new TextEncoder().encode(message);
  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}
