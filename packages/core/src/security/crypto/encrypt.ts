/**
 * AES-256-GCM encryption / decryption using Web Crypto API.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

async function importKey(keyHex: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(keyHex.match(/.{2}/g)!, (h) => parseInt(h, 16));
  return crypto.subtle.importKey("raw", raw, { name: ALGORITHM, length: KEY_LENGTH }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * @param plaintext - String to encrypt
 * @param keyHex - 64-char hex string (32 bytes)
 * @returns Base64-encoded ciphertext (iv + encrypted + tag)
 */
export async function encrypt(plaintext: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: ALGORITHM, iv, tagLength: TAG_LENGTH }, key, encoded),
  );
  const combined = new Uint8Array(iv.length + encrypted.length);
  combined.set(iv);
  combined.set(encrypted, iv.length);
  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * @param ciphertext - Base64-encoded string from encrypt()
 * @param keyHex - Same key used for encryption
 * @returns Decrypted plaintext
 */
export async function decrypt(ciphertext: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const combined = new Uint8Array(Buffer.from(ciphertext, "base64"));
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv, tagLength: TAG_LENGTH }, key, data);
  return new TextDecoder().decode(decrypted);
}

/**
 * Generate a random 256-bit encryption key as hex string.
 */
export function generateEncryptionKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
