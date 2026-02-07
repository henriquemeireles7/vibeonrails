/**
 * File Upload Validation
 *
 * Validates uploaded files by checking magic bytes (file signatures)
 * rather than trusting the Content-Type header, which can be spoofed.
 *
 * Supported types: JPEG, PNG, GIF, PDF, WebP
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileTypeResult {
  /** Whether the detected type is in the allowed list */
  valid: boolean;
  /** The detected MIME type, or null if unrecognized */
  detectedType: string | null;
}

// ---------------------------------------------------------------------------
// Magic Bytes Mapping
// ---------------------------------------------------------------------------

interface MagicBytesEntry {
  /** MIME type */
  mime: string;
  /** Magic bytes at the start of the file */
  bytes: number[];
  /** Optional offset for additional bytes check */
  offset?: number;
  /** Additional bytes to check at offset */
  additionalBytes?: number[];
}

/**
 * Common file type signatures (magic bytes).
 * Maps human-readable type names to their byte signatures.
 */
export const COMMON_FILE_TYPES: Record<string, MagicBytesEntry> = {
  jpeg: { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  png: { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  gif: { mime: "image/gif", bytes: [0x47, 0x49, 0x46] },
  pdf: { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  webp: {
    mime: "image/webp",
    bytes: [0x52, 0x49, 0x46, 0x46],
    offset: 8,
    additionalBytes: [0x57, 0x45, 0x42, 0x50],
  },
} as const;

/** Default maximum file size: 10 MB */
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a buffer starts with the given byte sequence.
 */
function matchesBytes(
  buffer: Buffer,
  expected: number[],
  offset = 0,
): boolean {
  if (buffer.length < offset + expected.length) return false;
  return expected.every((byte, i) => buffer[offset + i] === byte);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a file buffer against a list of allowed MIME types.
 *
 * Checks magic bytes rather than trusting Content-Type headers.
 *
 * @param buffer - The file buffer to inspect
 * @param allowedTypes - Array of allowed MIME types (e.g. ['image/jpeg', 'image/png'])
 * @returns Validation result with detected type
 */
export function validateFileType(
  buffer: Buffer,
  allowedTypes: string[],
): FileTypeResult {
  let detectedType: string | null = null;

  for (const entry of Object.values(COMMON_FILE_TYPES)) {
    if (!matchesBytes(buffer, entry.bytes)) continue;

    // WebP requires an additional check at offset 8
    if (entry.additionalBytes && entry.offset) {
      if (!matchesBytes(buffer, entry.additionalBytes, entry.offset)) continue;
    }

    detectedType = entry.mime;
    break;
  }

  return {
    valid: detectedType !== null && allowedTypes.includes(detectedType),
    detectedType,
  };
}

/**
 * Validate that a file size is within the allowed limit.
 *
 * @param size - File size in bytes
 * @param maxBytes - Maximum allowed size in bytes
 * @returns true if file size is within the limit
 */
export function validateFileSize(size: number, maxBytes: number): boolean {
  return size >= 0 && size <= maxBytes;
}
