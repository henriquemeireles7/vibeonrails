import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QueryAnalyzer,
  createQueryAnalyzer,
  normalizeQuery,
  suggestIndex,
} from './analyzer.js';

describe('Query Analyzer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = 'test';
  });

  // -----------------------------------------------------------------------
  // SQL Normalization
  // -----------------------------------------------------------------------

  describe('normalizeQuery', () => {
    it('should normalize numeric literals', () => {
      const result = normalizeQuery('SELECT * FROM users WHERE id = 42');
      expect(result).toBe('SELECT * FROM users WHERE id = ?');
    });

    it('should normalize string literals', () => {
      const result = normalizeQuery("SELECT * FROM users WHERE email = 'test@example.com'");
      expect(result).toBe("SELECT * FROM users WHERE email = '?'");
    });

    it('should normalize parameter placeholders', () => {
      const result = normalizeQuery('SELECT * FROM users WHERE id = $1 AND name = $2');
      expect(result).toBe('SELECT * FROM users WHERE id = $? AND name = $?');
    });

    it('should collapse whitespace', () => {
      const result = normalizeQuery('SELECT  *  FROM   users   WHERE   id = 1');
      expect(result).toBe('SELECT * FROM users WHERE id = ?');
    });

    it('should group similar queries together', () => {
      const q1 = normalizeQuery('SELECT * FROM posts WHERE user_id = $1');
      const q2 = normalizeQuery('SELECT * FROM posts WHERE user_id = $2');
      expect(q1).toBe(q2);
    });
  });

  // -----------------------------------------------------------------------
  // Index Suggestion
  // -----------------------------------------------------------------------

  describe('suggestIndex', () => {
    it('should suggest index for simple WHERE clause', () => {
      const suggestion = suggestIndex('SELECT * FROM users WHERE email = $1');
      expect(suggestion).toBe('CREATE INDEX idx_users_email ON users (email);');
    });

    it('should suggest composite index for multiple conditions', () => {
      const suggestion = suggestIndex('SELECT * FROM posts WHERE user_id = $1 AND status = $2');
      expect(suggestion).toContain('idx_posts_');
      expect(suggestion).toContain('user_id');
      expect(suggestion).toContain('status');
    });

    it('should return undefined for queries without WHERE', () => {
      const suggestion = suggestIndex('SELECT * FROM users');
      expect(suggestion).toBeUndefined();
    });

    it('should return undefined for queries without FROM', () => {
      const suggestion = suggestIndex('SELECT 1');
      expect(suggestion).toBeUndefined();
    });

    it('should handle IN conditions', () => {
      const suggestion = suggestIndex('SELECT * FROM users WHERE id IN ($1, $2, $3)');
      expect(suggestion).toContain('idx_users_id');
    });

    it('should handle comparison operators', () => {
      const suggestion = suggestIndex('SELECT * FROM orders WHERE total > $1');
      expect(suggestion).toContain('idx_orders_total');
    });
  });

  // -----------------------------------------------------------------------
  // Slow Query Detection
  // -----------------------------------------------------------------------

  describe('slow query detection', () => {
    it('should warn on queries exceeding threshold', () => {
      const warnings: string[] = [];
      const analyzer = createQueryAnalyzer({
        slowQueryThresholdMs: 50,
        writer: (msg) => warnings.push(msg),
      });

      analyzer.track('SELECT * FROM users WHERE id = $1', 75, 'req-1');

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('[SLOW QUERY]');
      expect(warnings[0]).toContain('75ms');
    });

    it('should not warn on fast queries', () => {
      const warnings: string[] = [];
      const analyzer = createQueryAnalyzer({
        slowQueryThresholdMs: 100,
        writer: (msg) => warnings.push(msg),
      });

      analyzer.track('SELECT * FROM users WHERE id = $1', 5, 'req-1');

      expect(warnings).toHaveLength(0);
    });

    it('should include index suggestion in slow query warning', () => {
      const warnings: string[] = [];
      const analyzer = createQueryAnalyzer({
        slowQueryThresholdMs: 50,
        writer: (msg) => warnings.push(msg),
      });

      analyzer.track('SELECT * FROM users WHERE email = $1', 200, 'req-1');

      expect(warnings[0]).toContain('Suggested index');
      expect(warnings[0]).toContain('CREATE INDEX');
    });

    it('should include slow queries in report', () => {
      const analyzer = createQueryAnalyzer({
        slowQueryThresholdMs: 50,
        writer: () => {},
      });

      analyzer.track('SELECT * FROM users WHERE id = $1', 200, 'req-1');
      analyzer.track('SELECT * FROM posts WHERE id = $1', 10, 'req-1');

      const report = analyzer.report('req-1');

      expect(report).not.toBeNull();
      expect(report?.slowQueries).toHaveLength(1);
      expect(report?.slowQueries[0].durationMs).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // N+1 Detection
  // -----------------------------------------------------------------------

  describe('N+1 detection', () => {
    it('should detect same query repeated 3+ times', () => {
      const warnings: string[] = [];
      const analyzer = createQueryAnalyzer({
        nPlusOneThreshold: 3,
        writer: (msg) => warnings.push(msg),
      });

      // Simulate N+1: same query with different params
      analyzer.track('SELECT * FROM posts WHERE user_id = $1', 5, 'req-1');
      analyzer.track('SELECT * FROM posts WHERE user_id = $2', 5, 'req-1');
      analyzer.track('SELECT * FROM posts WHERE user_id = $3', 5, 'req-1');

      const report = analyzer.report('req-1');

      expect(report?.nPlusOneDetections).toHaveLength(1);
      expect(report?.nPlusOneDetections[0].count).toBe(3);
      expect(warnings.some((w) => w.includes('[N+1 DETECTED]'))).toBe(true);
    });

    it('should not flag queries below threshold', () => {
      const analyzer = createQueryAnalyzer({
        nPlusOneThreshold: 3,
        writer: () => {},
      });

      analyzer.track('SELECT * FROM posts WHERE user_id = $1', 5, 'req-1');
      analyzer.track('SELECT * FROM posts WHERE user_id = $2', 5, 'req-1');

      const report = analyzer.report('req-1');

      expect(report?.nPlusOneDetections).toHaveLength(0);
    });

    it('should detect multiple N+1 patterns', () => {
      const analyzer = createQueryAnalyzer({
        nPlusOneThreshold: 3,
        writer: () => {},
      });

      // Pattern 1: user posts
      for (let i = 0; i < 5; i++) {
        analyzer.track(`SELECT * FROM posts WHERE user_id = $${i + 1}`, 5, 'req-1');
      }
      // Pattern 2: user comments
      for (let i = 0; i < 4; i++) {
        analyzer.track(`SELECT * FROM comments WHERE post_id = $${i + 1}`, 3, 'req-1');
      }

      const report = analyzer.report('req-1');

      expect(report?.nPlusOneDetections).toHaveLength(2);
    });

    it('should include suggestion in detection', () => {
      const analyzer = createQueryAnalyzer({
        nPlusOneThreshold: 3,
        writer: () => {},
      });

      for (let i = 0; i < 3; i++) {
        analyzer.track(`SELECT * FROM posts WHERE user_id = $${i + 1}`, 5, 'req-1');
      }

      const report = analyzer.report('req-1');
      expect(report?.nPlusOneDetections[0].suggestion).toContain('JOIN');
    });
  });

  // -----------------------------------------------------------------------
  // Production disable
  // -----------------------------------------------------------------------

  describe('production behavior', () => {
    it('should be disabled in production', () => {
      const analyzer = new QueryAnalyzer({ enabled: false });

      analyzer.track('SELECT * FROM users', 200, 'req-1');
      const report = analyzer.report('req-1');

      expect(report).toBeNull();
      expect(analyzer.isEnabled()).toBe(false);
    });

    it('should have zero overhead when disabled', () => {
      const writer = vi.fn();
      const analyzer = new QueryAnalyzer({ enabled: false, writer });

      // Track many queries — none should be stored
      for (let i = 0; i < 100; i++) {
        analyzer.track('SELECT * FROM users WHERE id = $1', 200, 'req-1');
      }

      expect(writer).not.toHaveBeenCalled();
      expect(analyzer.report('req-1')).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Report
  // -----------------------------------------------------------------------

  describe('report', () => {
    it('should return full analysis report', () => {
      const analyzer = createQueryAnalyzer({
        slowQueryThresholdMs: 50,
        writer: () => {},
      });

      analyzer.track('SELECT * FROM users WHERE id = $1', 5, 'req-1');
      analyzer.track('SELECT * FROM posts WHERE user_id = $1', 120, 'req-1');
      analyzer.track('SELECT count(*) FROM comments', 3, 'req-1');

      const report = analyzer.report('req-1');

      expect(report?.requestId).toBe('req-1');
      expect(report?.totalQueries).toBe(3);
      expect(report?.totalDurationMs).toBe(128);
      expect(report?.slowQueries).toHaveLength(1);
    });

    it('should return null for unknown request', () => {
      const analyzer = createQueryAnalyzer({ writer: () => {} });

      const report = analyzer.report('nonexistent');
      expect(report).toBeNull();
    });

    it('should clear queries after clear()', () => {
      const analyzer = createQueryAnalyzer({ writer: () => {} });

      analyzer.track('SELECT 1', 1, 'req-1');
      analyzer.clear('req-1');

      expect(analyzer.report('req-1')).toBeNull();
    });

    it('should clear all queries after clearAll()', () => {
      const analyzer = createQueryAnalyzer({ writer: () => {} });

      analyzer.track('SELECT 1', 1, 'req-1');
      analyzer.track('SELECT 1', 1, 'req-2');
      analyzer.clearAll();

      expect(analyzer.report('req-1')).toBeNull();
      expect(analyzer.report('req-2')).toBeNull();
    });
  });
});
