import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectSeedEnvironment,
  getSeedPlan,
  formatSeedPlan,
} from './db-seed-env.js';

describe('Per-Environment Seeds', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Environment Detection
  // -----------------------------------------------------------------------

  describe('detectSeedEnvironment', () => {
    it('should detect development from NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      expect(detectSeedEnvironment()).toBe('development');
    });

    it('should detect staging from NODE_ENV', () => {
      process.env.NODE_ENV = 'staging';
      expect(detectSeedEnvironment()).toBe('staging');
    });

    it('should detect production from NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      expect(detectSeedEnvironment()).toBe('production');
    });

    it('should detect test from NODE_ENV', () => {
      process.env.NODE_ENV = 'test';
      expect(detectSeedEnvironment()).toBe('test');
    });

    it('should default to development for unknown NODE_ENV', () => {
      process.env.NODE_ENV = 'custom';
      expect(detectSeedEnvironment()).toBe('development');
    });

    it('should respect override', () => {
      process.env.NODE_ENV = 'production';
      expect(detectSeedEnvironment('staging')).toBe('staging');
    });
  });

  // -----------------------------------------------------------------------
  // Seed Plans
  // -----------------------------------------------------------------------

  describe('getSeedPlan', () => {
    it('should return rich dev plan with 50 users and 200 posts', () => {
      const plan = getSeedPlan('development');

      expect(plan.env).toBe('development');
      const users = plan.tables.find((t) => t.table === 'users');
      const posts = plan.tables.find((t) => t.table === 'posts');

      expect(users?.recordCount).toBe(50);
      expect(posts?.recordCount).toBe(200);
      expect(plan.totalRecords).toBeGreaterThan(200);
    });

    it('should return minimal staging plan', () => {
      const plan = getSeedPlan('staging');

      expect(plan.env).toBe('staging');
      const users = plan.tables.find((t) => t.table === 'users');
      const posts = plan.tables.find((t) => t.table === 'posts');

      expect(users?.recordCount).toBe(5);
      expect(posts?.recordCount).toBe(10);
      expect(plan.totalRecords).toBeLessThan(50);
    });

    it('should return production plan with system records only', () => {
      const plan = getSeedPlan('production');

      expect(plan.env).toBe('production');
      const users = plan.tables.find((t) => t.table === 'users');

      expect(users?.recordCount).toBe(1);
      expect(plan.totalRecords).toBeLessThanOrEqual(5);

      // Should NOT have posts
      const posts = plan.tables.find((t) => t.table === 'posts');
      expect(posts).toBeUndefined();
    });

    it('should return test plan', () => {
      const plan = getSeedPlan('test');

      expect(plan.env).toBe('test');
      expect(plan.totalRecords).toBeLessThan(20);
    });

    it('should always include settings table', () => {
      for (const env of ['development', 'staging', 'production', 'test'] as const) {
        const plan = getSeedPlan(env);
        const settings = plan.tables.find((t) => t.table === 'settings');
        expect(settings).toBeDefined();
      }
    });

    it('should have consistent totalRecords', () => {
      for (const env of ['development', 'staging', 'production', 'test'] as const) {
        const plan = getSeedPlan(env);
        const sum = plan.tables.reduce((acc, t) => acc + t.recordCount, 0);
        expect(plan.totalRecords).toBe(sum);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Format
  // -----------------------------------------------------------------------

  describe('formatSeedPlan', () => {
    it('should format dev plan with table details', () => {
      const plan = getSeedPlan('development');
      const output = formatSeedPlan(plan);

      expect(output).toContain('development');
      expect(output).toContain('users');
      expect(output).toContain('posts');
      expect(output).toContain('Total:');
    });

    it('should format production plan', () => {
      const plan = getSeedPlan('production');
      const output = formatSeedPlan(plan);

      expect(output).toContain('production');
      expect(output).toContain('Admin user');
    });
  });
});
