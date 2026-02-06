import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTwitterIntegration } from './twitter.js';
import { IntegrationError } from './types.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function tweetResponse(id: string, text: string) {
  return new Response(
    JSON.stringify({ data: { id, text } }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  );
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('Twitter Integration', () => {
  const getAccessToken = vi.fn().mockResolvedValue('test-bearer-token');

  it('should create integration with name twitter', () => {
    const twitter = createTwitterIntegration({ getAccessToken });
    expect(twitter.name).toBe('twitter');
  });

  describe('postTweet', () => {
    it('should post a tweet', async () => {
      mockFetch.mockResolvedValueOnce(tweetResponse('1234', 'Hello world!'));

      const twitter = createTwitterIntegration({ getAccessToken });
      const tweet = await twitter.client.postTweet('Hello world!');

      expect(tweet.id).toBe('1234');
      expect(tweet.text).toBe('Hello world!');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.twitter.com/2/tweets');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer test-bearer-token');
      expect(JSON.parse(options.body)).toEqual({ text: 'Hello world!' });
    });

    it('should use auth token from getAccessToken', async () => {
      getAccessToken.mockResolvedValueOnce('fresh-token');
      mockFetch.mockResolvedValueOnce(tweetResponse('1', 'test'));

      const twitter = createTwitterIntegration({ getAccessToken });
      await twitter.client.postTweet('test');

      expect(getAccessToken).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer fresh-token');
    });
  });

  describe('postThread', () => {
    it('should post a thread of tweets', async () => {
      mockFetch
        .mockResolvedValueOnce(tweetResponse('1', 'First'))
        .mockResolvedValueOnce(tweetResponse('2', 'Second'))
        .mockResolvedValueOnce(tweetResponse('3', 'Third'));

      const twitter = createTwitterIntegration({ getAccessToken });
      const tweets = await twitter.client.postThread([
        'First',
        'Second',
        'Third',
      ]);

      expect(tweets).toHaveLength(3);
      expect(tweets[0].id).toBe('1');
      expect(tweets[2].id).toBe('3');

      // Second tweet should reply to first
      const secondBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(secondBody.reply).toEqual({ in_reply_to_tweet_id: '1' });

      // Third tweet should reply to second
      const thirdBody = JSON.parse(mockFetch.mock.calls[2][1].body);
      expect(thirdBody.reply).toEqual({ in_reply_to_tweet_id: '2' });
    });

    it('should throw for empty thread', async () => {
      const twitter = createTwitterIntegration({ getAccessToken });
      await expect(twitter.client.postThread([])).rejects.toThrow(
        IntegrationError,
      );
    });
  });

  describe('deleteTweet', () => {
    it('should delete a tweet', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { deleted: true } }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      );

      const twitter = createTwitterIntegration({ getAccessToken });
      const deleted = await twitter.client.deleteTweet('1234');
      expect(deleted).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.twitter.com/2/tweets/1234');
      expect(options.method).toBe('DELETE');
    });
  });

  describe('error handling', () => {
    it('should throw IntegrationError on API failure', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Unauthorized', {
          status: 401,
          headers: { 'content-type': 'text/plain' },
        }),
      );

      const twitter = createTwitterIntegration({ getAccessToken });
      await expect(twitter.client.postTweet('test')).rejects.toThrow(
        IntegrationError,
      );
    });
  });
});
