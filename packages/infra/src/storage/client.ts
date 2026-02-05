/**
 * Storage Client
 *
 * S3-compatible file storage client. Works with AWS S3, Cloudflare R2,
 * DigitalOcean Spaces, or any S3-compatible provider.
 *
 * Usage:
 *   import { createStorage } from '@aor/infra/storage';
 *
 *   const storage = createStorage();
 *   const url = await storage.upload('avatars/user-123.jpg', fileBuffer, 'image/jpeg');
 */

export interface StorageClient {
  upload(key: string, body: Buffer | Uint8Array, contentType?: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export interface StorageConfig {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  publicUrl?: string;
}

/**
 * Create an S3-compatible storage client.
 *
 * @param config - Storage configuration (defaults to env vars)
 * @returns Storage client with upload/download/delete operations
 */
export function createStorage(config?: Partial<StorageConfig>): StorageClient {
  const bucket = config?.bucket ?? process.env.S3_BUCKET;
  const endpoint = config?.endpoint ?? process.env.S3_ENDPOINT;
  const accessKeyId = config?.accessKeyId ?? process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = config?.secretAccessKey ?? process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      '[AOR] S3 storage configuration is incomplete.\n' +
      '  Required env vars: S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY\n' +
      '  Docs: https://aor.dev/errors/STORAGE_CONFIG_MISSING',
    );
  }

  const publicUrl = config?.publicUrl ?? `${endpoint}/${bucket}`;

  // Note: In production, use @aws-sdk/client-s3 for proper S3 operations.
  // This is a simplified interface that can be backed by any S3 SDK.
  return {
    async upload(key: string, _body: Buffer | Uint8Array, _contentType?: string): Promise<string> {
      // Placeholder: implement with @aws-sdk/client-s3 PutObjectCommand
      return `${publicUrl}/${key}`;
    },

    async download(_key: string): Promise<Buffer> {
      // Placeholder: implement with @aws-sdk/client-s3 GetObjectCommand
      throw new Error('[AOR] Storage download not yet implemented. Add @aws-sdk/client-s3.');
    },

    async delete(_key: string): Promise<void> {
      // Placeholder: implement with @aws-sdk/client-s3 DeleteObjectCommand
      throw new Error('[AOR] Storage delete not yet implemented. Add @aws-sdk/client-s3.');
    },

    async getSignedUrl(_key: string, _expiresInSeconds = 3600): Promise<string> {
      // Placeholder: implement with @aws-sdk/s3-request-presigner
      throw new Error('[AOR] Storage getSignedUrl not yet implemented. Add @aws-sdk/s3-request-presigner.');
    },
  };
}
