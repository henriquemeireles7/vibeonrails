import { describe, it, expect, beforeEach } from 'vitest';
import {
  listByType,
  filterByTag,
  searchByKeyword,
  getByPath,
  getAll,
  getByDate,
  clearCache,
} from './query.js';
import type { ContentIndex, ContentEntry } from './types.js';

describe('Content Query Functions', () => {
  let index: ContentIndex;

  beforeEach(() => {
    clearCache();

    const entries: Record<string, ContentEntry> = {
      'blog/post1.md': {
        path: 'blog/post1.md',
        title: 'First Blog Post',
        type: 'blog',
        tags: ['tech', 'news'],
        date: '2024-01-01',
        description: 'A tech news post',
        contentSnippet: 'This is about technology and news',
        mtime: '2024-01-01T00:00:00.000Z',
      },
      'blog/post2.md': {
        path: 'blog/post2.md',
        title: 'Second Blog Post',
        type: 'blog',
        tags: ['tech', 'tutorial'],
        date: '2024-01-02',
        description: 'A tutorial post',
        contentSnippet: 'Learn how to build things',
        mtime: '2024-01-02T00:00:00.000Z',
      },
      'docs/page1.md': {
        path: 'docs/page1.md',
        title: 'Documentation Page',
        type: 'docs',
        tags: ['guide'],
        date: null,
        description: 'A guide',
        contentSnippet: 'How to use the system',
        mtime: '2024-01-03T00:00:00.000Z',
      },
      'news/article1.md': {
        path: 'news/article1.md',
        title: 'News Article',
        type: 'news',
        tags: ['news', 'updates'],
        date: '2024-01-05',
        description: 'Latest updates',
        contentSnippet: 'Breaking news about updates',
        mtime: '2024-01-05T00:00:00.000Z',
      },
    };

    index = {
      entries,
      generatedAt: '2024-01-01T00:00:00.000Z',
      contentRoot: '/content',
    };
  });

  describe('listByType', () => {
    it('should return all entries of a specific type', () => {
      const blogPosts = listByType(index, 'blog');

      expect(blogPosts).toHaveLength(2);
      expect(blogPosts.map((p) => p.path)).toContain('blog/post1.md');
      expect(blogPosts.map((p) => p.path)).toContain('blog/post2.md');
    });

    it('should return empty array for non-existent type', () => {
      const results = listByType(index, 'nonexistent');

      expect(results).toEqual([]);
    });

    it('should return docs entries', () => {
      const docs = listByType(index, 'docs');

      expect(docs).toHaveLength(1);
      expect(docs[0].path).toBe('docs/page1.md');
    });
  });

  describe('filterByTag', () => {
    it('should return entries with specific tag', () => {
      const techPosts = filterByTag(index, 'tech');

      expect(techPosts).toHaveLength(2);
      expect(techPosts.map((p) => p.path)).toContain('blog/post1.md');
      expect(techPosts.map((p) => p.path)).toContain('blog/post2.md');
    });

    it('should return entries with news tag', () => {
      const newsPosts = filterByTag(index, 'news');

      expect(newsPosts).toHaveLength(2);
      expect(newsPosts.map((p) => p.path)).toContain('blog/post1.md');
      expect(newsPosts.map((p) => p.path)).toContain('news/article1.md');
    });

    it('should return empty array for non-existent tag', () => {
      const results = filterByTag(index, 'nonexistent');

      expect(results).toEqual([]);
    });
  });

  describe('searchByKeyword', () => {
    it('should search by title', () => {
      const results = searchByKeyword(index, 'Blog');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.path === 'blog/post1.md')).toBe(true);
    });

    it('should search by description', () => {
      const results = searchByKeyword(index, 'tutorial');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.path === 'blog/post2.md')).toBe(true);
    });

    it('should search by content snippet', () => {
      const results = searchByKeyword(index, 'technology');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.path === 'blog/post1.md')).toBe(true);
    });

    it('should return empty array for short keywords', () => {
      const results = searchByKeyword(index, 'a');

      expect(results).toEqual([]);
    });

    it('should handle partial matches', () => {
      const results = searchByKeyword(index, 'tech');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      const results1 = searchByKeyword(index, 'blog');
      const results2 = searchByKeyword(index, 'BLOG');

      expect(results1.length).toBe(results2.length);
    });
  });

  describe('getByPath', () => {
    it('should return entry by path', () => {
      const entry = getByPath(index, 'blog/post1.md');

      expect(entry).toBeTruthy();
      expect(entry?.title).toBe('First Blog Post');
    });

    it('should return null for non-existent path', () => {
      const entry = getByPath(index, 'nonexistent.md');

      expect(entry).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all entries', () => {
      const all = getAll(index);

      expect(all).toHaveLength(4);
    });
  });

  describe('getByDate', () => {
    it('should return entries sorted by date (newest first)', () => {
      const sorted = getByDate(index);

      expect(sorted[0].path).toBe('news/article1.md');
      expect(sorted[1].path).toBe('blog/post2.md');
      expect(sorted[2].path).toBe('blog/post1.md');
    });

    it('should handle entries without dates', () => {
      const sorted = getByDate(index);

      // Entries without dates should be at the end
      const docsEntry = sorted.find((e) => e.path === 'docs/page1.md');
      expect(docsEntry).toBeTruthy();
    });

    it('should limit results when limit specified', () => {
      const limited = getByDate(index, 2);

      expect(limited).toHaveLength(2);
      expect(limited[0].path).toBe('news/article1.md');
    });
  });

  describe('cache', () => {
    it('should cache query results', () => {
      // First call builds cache
      const results1 = listByType(index, 'blog');

      // Second call uses cache
      const results2 = listByType(index, 'blog');

      expect(results1).toEqual(results2);
    });

    it('should clear cache', () => {
      listByType(index, 'blog');
      clearCache();

      // Cache should be rebuilt
      const results = listByType(index, 'blog');
      expect(results).toHaveLength(2);
    });
  });
});
