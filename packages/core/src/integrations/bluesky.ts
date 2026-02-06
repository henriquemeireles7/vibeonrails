/**
 * Bluesky Integration
 *
 * Implements Bluesky AT Protocol using the integrations SDK.
 * Supports authentication, post creation, and thread creation.
 */

import { defineIntegration } from './sdk.js';
import { IntegrationError, type Integration } from './types.js';

// ---------------------------------------------------------------------------
// Bluesky API Types
// ---------------------------------------------------------------------------

export interface BlueskySession {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
}

export interface BlueskyPost {
  uri: string;
  cid: string;
}

export interface BlueskyClient {
  /** Create a session (login) */
  createSession(
    identifier: string,
    password: string,
  ): Promise<BlueskySession>;

  /** Create a post */
  createPost(text: string): Promise<BlueskyPost>;

  /** Create a thread (array of post texts) */
  createThread(texts: string[]): Promise<BlueskyPost[]>;

  /** Delete a post by URI */
  deletePost(uri: string): Promise<void>;
}

export interface BlueskyIntegrationOptions {
  /** Bluesky service URL (default: https://bsky.social) */
  serviceUrl?: string;

  /** Get the current session JWT */
  getAccessToken: () => Promise<string>;

  /** Get the current user DID */
  getDid: () => Promise<string>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createBlueskyIntegration(
  options: BlueskyIntegrationOptions,
): Integration<BlueskyClient> {
  const serviceUrl = options.serviceUrl ?? 'https://bsky.social';

  return defineIntegration<BlueskyClient>(
    {
      name: 'bluesky',
      baseUrl: `${serviceUrl}/xrpc`,
      authenticate: async () => {
        const token = await options.getAccessToken();
        return { Authorization: `Bearer ${token}` };
      },
      retry: { maxRetries: 2, baseDelay: 1000 },
      normalizeError: (error) => {
        if (error instanceof IntegrationError) {
          return error;
        }
        return new IntegrationError(
          `Bluesky API error: ${error instanceof Error ? error.message : String(error)}`,
          'bluesky',
          undefined,
          false,
          error,
        );
      },
    },
    (api) => ({
      async createSession(
        identifier: string,
        password: string,
      ): Promise<BlueskySession> {
        const response = await api.request<BlueskySession>(
          '/com.atproto.server.createSession',
          {
            method: 'POST',
            body: { identifier, password },
          },
        );
        return response.data;
      },

      async createPost(text: string): Promise<BlueskyPost> {
        const did = await options.getDid();
        const now = new Date().toISOString();

        const response = await api.request<BlueskyPost>(
          '/com.atproto.repo.createRecord',
          {
            method: 'POST',
            body: {
              repo: did,
              collection: 'app.bsky.feed.post',
              record: {
                $type: 'app.bsky.feed.post',
                text,
                createdAt: now,
              },
            },
          },
        );
        return response.data;
      },

      async createThread(texts: string[]): Promise<BlueskyPost[]> {
        if (texts.length === 0) {
          throw new IntegrationError(
            'Thread must have at least one post',
            'bluesky',
            undefined,
            false,
          );
        }

        const did = await options.getDid();
        const posts: BlueskyPost[] = [];
        let parentRef: { uri: string; cid: string } | undefined;
        let rootRef: { uri: string; cid: string } | undefined;

        for (const text of texts) {
          const now = new Date().toISOString();
          const record: Record<string, unknown> = {
            $type: 'app.bsky.feed.post',
            text,
            createdAt: now,
          };

          if (parentRef && rootRef) {
            record.reply = {
              root: { uri: rootRef.uri, cid: rootRef.cid },
              parent: { uri: parentRef.uri, cid: parentRef.cid },
            };
          }

          const response = await api.request<BlueskyPost>(
            '/com.atproto.repo.createRecord',
            {
              method: 'POST',
              body: {
                repo: did,
                collection: 'app.bsky.feed.post',
                record,
              },
            },
          );

          const post = response.data;
          posts.push(post);

          if (!rootRef) {
            rootRef = { uri: post.uri, cid: post.cid };
          }
          parentRef = { uri: post.uri, cid: post.cid };
        }

        return posts;
      },

      async deletePost(uri: string): Promise<void> {
        const did = await options.getDid();
        // Extract rkey from the URI
        const parts = uri.split('/');
        const rkey = parts[parts.length - 1];

        await api.request('/com.atproto.repo.deleteRecord', {
          method: 'POST',
          body: {
            repo: did,
            collection: 'app.bsky.feed.post',
            rkey,
          },
        });
      },
    }),
  );
}
