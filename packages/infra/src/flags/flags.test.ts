import { describe, it, expect, vi } from 'vitest';
import { createFlagService, type FlagRedisLike } from './flags.js';
import type { FlagConfig } from './types.js';

const baseConfig: FlagConfig = {
  version: 1,
  flags: [
    {
      name: 'dark-mode',
      description: 'Enable dark mode UI',
      type: 'boolean',
      defaultValue: true,
      enabled: true,
    },
    {
      name: 'new-checkout',
      description: 'New checkout flow',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
    },
    {
      name: 'beta-features',
      description: '50% rollout',
      type: 'percentage',
      defaultValue: 50,
      enabled: true,
    },
    {
      name: 'disabled-flag',
      description: 'This flag is disabled',
      type: 'boolean',
      defaultValue: true,
      enabled: false,
    },
  ],
};

function createMockRedis(): FlagRedisLike {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async set(key: string, value: string) {
      store.set(key, value);
      return 'OK';
    },
    async del(key: string) {
      return store.delete(key) ? 1 : 0;
    },
    async keys(pattern: string) {
      const prefix = pattern.replace('*', '');
      return Array.from(store.keys()).filter((k) => k.startsWith(prefix));
    },
  };
}

describe('Feature Flags — JSON-only mode', () => {
  it('should return true for enabled boolean flag', async () => {
    const service = createFlagService({ config: baseConfig });
    expect(await service.isEnabled('dark-mode')).toBe(true);
  });

  it('should return false for disabled boolean flag', async () => {
    const service = createFlagService({ config: baseConfig });
    expect(await service.isEnabled('new-checkout')).toBe(false);
  });

  it('should return false for non-existent flag', async () => {
    const service = createFlagService({ config: baseConfig });
    expect(await service.isEnabled('nonexistent')).toBe(false);
  });

  it('should return false for disabled flag even with true default', async () => {
    const service = createFlagService({ config: baseConfig });
    expect(await service.isEnabled('disabled-flag')).toBe(false);
  });

  it('should handle percentage rollout deterministically with userId', async () => {
    const service = createFlagService({ config: baseConfig });

    // Same userId should always get the same result
    const result1 = await service.isEnabled('beta-features', {
      userId: 'user-123',
    });
    const result2 = await service.isEnabled('beta-features', {
      userId: 'user-123',
    });
    expect(result1).toBe(result2);
  });

  it('should get flag value', async () => {
    const service = createFlagService({ config: baseConfig });
    expect(await service.getValue('dark-mode')).toBe(true);
    expect(await service.getValue('new-checkout')).toBe(false);
    expect(await service.getValue('beta-features')).toBe(50);
    expect(await service.getValue('nonexistent')).toBeNull();
  });

  it('should list all flags', async () => {
    const service = createFlagService({ config: baseConfig });
    const list = await service.list();

    expect(list).toHaveLength(4);
    expect(list[0].name).toBe('dark-mode');
    expect(list[0].runtimeOverride).toBeNull();
  });

  it('should throw when toggling without Redis', async () => {
    const service = createFlagService({ config: baseConfig });
    await expect(service.toggle('dark-mode', false)).rejects.toThrow(
      'Redis is required',
    );
  });
});

describe('Feature Flags — with Redis overrides', () => {
  it('should use Redis override when available', async () => {
    const redis = createMockRedis();
    const service = createFlagService({ config: baseConfig, redis });

    // Default is false
    expect(await service.isEnabled('new-checkout')).toBe(false);

    // Toggle on via Redis
    await service.toggle('new-checkout', true);
    expect(await service.isEnabled('new-checkout')).toBe(true);
  });

  it('should prefer Redis override over JSON default', async () => {
    const redis = createMockRedis();
    const service = createFlagService({ config: baseConfig, redis });

    // Default is true
    expect(await service.isEnabled('dark-mode')).toBe(true);

    // Override to false
    await service.toggle('dark-mode', false);
    expect(await service.isEnabled('dark-mode')).toBe(false);
  });

  it('should remove override and fall back to JSON', async () => {
    const redis = createMockRedis();
    const service = createFlagService({ config: baseConfig, redis });

    await service.toggle('dark-mode', false);
    expect(await service.isEnabled('dark-mode')).toBe(false);

    await service.removeOverride('dark-mode');
    expect(await service.isEnabled('dark-mode')).toBe(true);
  });

  it('should show overrides in list', async () => {
    const redis = createMockRedis();
    const service = createFlagService({ config: baseConfig, redis });

    await service.toggle('new-checkout', true);

    const list = await service.list();
    const checkout = list.find((f) => f.name === 'new-checkout');
    expect(checkout!.runtimeOverride).toBe(true);
    expect(checkout!.effectiveValue).toBe(true);
    expect(checkout!.definedValue).toBe(false);
  });
});
