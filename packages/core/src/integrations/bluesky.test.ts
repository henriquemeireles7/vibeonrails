import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlueskyIntegration } from './bluesky.js';
import { IntegrationError } from './types.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('Bluesky Integration', () => {
  const getAccessToken = vi.fn().mockResolvedValue('test-jwt');
  const getDid = vi.fn().mockResolvedValue('did:plc:abc123');

  it('should create integration with name bluesky', () => {
    const bsky = createBlueskyIntegration({ getAccessToken, getDid });
    expect(bsky.name).toBe('bluesky');
  });

  describe('createSession', () => {
    it('should authenticate with identifier and password', async () => {
      const session = {
        did: 'did:plc:abc123',
        handle: 'user.bsky.social',
        accessJwt: 'jwt-token',
        refreshJwt: 'refresh-jwt',
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(session));

      const bsky = createBlueskyIntegration({ getAccessToken, getDid });
      const result = await bsky.client.createSession(
        'user.bsky.social',
        'password123',
      );

      expect(result.did).toBe('did:plc:abc123');
      expect(result.accessJwt).toBe('jwt-token');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://bsky.social/xrpc/com.atproto.server.createSession',
      );
      expect(options.method).toBe('POST');
    });
  });

  describe('createPost', () => {
    it('should create a post', async () => {
      const postResponse = {
        uri: 'at://did:plc:abc123/app.bsky.feed.post/xyz',
        cid: 'bafyabc123',
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(postResponse));

      const bsky = createBlueskyIntegration({ getAccessToken, getDid });
      const result = await bsky.client.createPost('Hello Bluesky!');

      expect(result.uri).toBe(
        'at://did:plc:abc123/app.bsky.feed.post/xyz',
      );
      expect(result.cid).toBe('bafyabc123');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://bsky.social/xrpc/com.atproto.repo.createRecord',
      );
      const body = JSON.parse(options.body);
      expect(body.repo).toBe('did:plc:abc123');
      expect(body.collection).toBe('app.bsky.feed.post');
      expect(body.record.text).toBe('Hello Bluesky!');
    });

    it('should use auth token from getAccessToken', async () => {
      getAccessToken.mockResolvedValueOnce('fresh-token');
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ uri: 'at://x', cid: 'c' }),
      );

      const bsky = createBlueskyIntegration({ getAccessToken, getDid });
      await bsky.client.createPost('test');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer fresh-token');
    });
  });

  describe('createThread', () => {
    it('should create a thread with replies', async () => {
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({ uri: 'at://did/post/1', cid: 'cid1' }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ uri: 'at://did/post/2', cid: 'cid2' }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ uri: 'at://did/post/3', cid: 'cid3' }),
        );

      const bsky = createBlueskyIntegration({ getAccessToken, getDid });
      const posts = await bsky.client.createThread([
        'First',
        'Second',
        'Third',
      ]);

      expect(posts).toHaveLength(3);

      // First post should not have reply
      const firstBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(firstBody.record.reply).toBeUndefined();

      // Second post should reply to first
      const secondBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(secondBody.record.reply.parent.uri).toBe('at://did/post/1');
      expect(secondBody.record.reply.root.uri).toBe('at://did/post/1');

      // Third post should reply to second, root is first
      const thirdBody = JSON.parse(mockFetch.mock.calls[2][1].body);
      expect(thirdBody.record.reply.parent.uri).toBe('at://did/post/2');
      expect(thirdBody.record.reply.root.uri).toBe('at://did/post/1');
    });

    it('should throw for empty thread', async () => {
      const bsky = createBlueskyIntegration({ getAccessToken, getDid });
      await expect(bsky.client.createThread([])).rejects.toThrow(
        IntegrationError,
      );
    });
  });

  describe('deletePost', () => {
    it('should delete a post by URI', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      const bsky = createBlueskyIntegration({ getAccessToken, getDid });
      await bsky.client.deletePost(
        'at://did:plc:abc123/app.bsky.feed.post/xyz789',
      );

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        'https://bsky.social/xrpc/com.atproto.repo.deleteRecord',
      );
      const body = JSON.parse(options.body);
      expect(body.rkey).toBe('xyz789');
      expect(body.collection).toBe('app.bsky.feed.post');
    });
  });

  describe('custom service URL', () => {
    it('should use custom service URL', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ uri: 'at://x', cid: 'c' }),
      );

      const bsky = createBlueskyIntegration({
        getAccessToken,
        getDid,
        serviceUrl: 'https://custom.pds.example.com',
      });
      await bsky.client.createPost('test');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('https://custom.pds.example.com/xrpc/');
    });
  });
});
