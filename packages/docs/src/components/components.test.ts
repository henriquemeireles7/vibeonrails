import { describe, it, expect } from 'vitest';

// Test that all components export correctly as modules
// (Full rendering tests would need jsdom + React testing library)
describe('components barrel export', () => {
  it('exports ApiReference', async () => {
    const mod = await import('./index.js');
    expect(mod.ApiReference).toBeDefined();
    expect(typeof mod.ApiReference).toBe('function');
  });

  it('exports CodeExample', async () => {
    const mod = await import('./index.js');
    expect(mod.CodeExample).toBeDefined();
    expect(typeof mod.CodeExample).toBe('function');
  });

  it('exports PackageInstall', async () => {
    const mod = await import('./index.js');
    expect(mod.PackageInstall).toBeDefined();
    expect(typeof mod.PackageInstall).toBe('function');
  });

  it('exports PropTable', async () => {
    const mod = await import('./index.js');
    expect(mod.PropTable).toBeDefined();
    expect(typeof mod.PropTable).toBe('function');
  });

  it('exports StatusBadge', async () => {
    const mod = await import('./index.js');
    expect(mod.StatusBadge).toBeDefined();
    expect(typeof mod.StatusBadge).toBe('function');
  });
});
