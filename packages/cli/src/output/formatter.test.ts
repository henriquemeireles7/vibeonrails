import { describe, it, expect, vi, afterEach } from 'vitest';
import { getOutputMode, createFormatter } from './formatter.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getOutputMode', () => {
  it('should default to human mode', () => {
    expect(getOutputMode()).toBe('human');
  });

  it('should detect json mode', () => {
    vi.stubEnv('VIBE_OUTPUT', 'json');
    expect(getOutputMode()).toBe('json');
  });

  it('should detect ci mode', () => {
    vi.stubEnv('VIBE_OUTPUT', 'ci');
    expect(getOutputMode()).toBe('ci');
  });
});

describe('OutputFormatter', () => {
  describe('json mode', () => {
    it('should output success as JSON envelope', () => {
      vi.stubEnv('VIBE_OUTPUT', 'json');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const fmt = createFormatter();
      fmt.success({
        command: 'vibe dev',
        data: { port: 3000 },
        warnings: ['test warning'],
        nextSteps: ['next step 1'],
      });

      expect(spy).toHaveBeenCalledOnce();
      const output = JSON.parse(spy.mock.calls[0][0]);
      expect(output.command).toBe('vibe dev');
      expect(output.success).toBe(true);
      expect(output.data.port).toBe(3000);
      expect(output.warnings).toEqual(['test warning']);
      expect(output.next_steps).toEqual(['next step 1']);
    });

    it('should output error as JSON envelope', () => {
      vi.stubEnv('VIBE_OUTPUT', 'json');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const fmt = createFormatter();
      fmt.error({
        command: 'vibe build',
        message: 'Build failed',
        code: 'VOR_BUILD_001',
        fix: 'Fix the error',
      });

      const output = JSON.parse(spy.mock.calls[0][0]);
      expect(output.success).toBe(false);
      expect(output.data.code).toBe('VOR_BUILD_001');
      expect(output.next_steps).toEqual(['Fix the error']);
    });

    it('should output table as JSON array', () => {
      vi.stubEnv('VIBE_OUTPUT', 'json');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const fmt = createFormatter();
      fmt.table(['Name', 'Status'], [
        ['marketing', 'installed'],
        ['sales', 'not installed'],
      ]);

      const output = JSON.parse(spy.mock.calls[0][0]);
      expect(output).toHaveLength(2);
      expect(output[0].Name).toBe('marketing');
      expect(output[1].Status).toBe('not installed');
    });
  });

  describe('ci mode', () => {
    it('should output plain text for success', () => {
      vi.stubEnv('VIBE_OUTPUT', 'ci');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const fmt = createFormatter();
      fmt.success({
        command: 'vibe dev',
        data: {},
        message: 'Server started',
      });

      expect(spy).toHaveBeenCalledWith('Server started');
    });

    it('should output error with code prefix', () => {
      vi.stubEnv('VIBE_OUTPUT', 'ci');
      const spy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const fmt = createFormatter();
      fmt.error({
        command: 'vibe build',
        message: 'Build failed',
        code: 'VOR_BUILD_001',
      });

      expect(spy.mock.calls[0][0]).toContain('[VOR_BUILD_001]');
    });
  });

  describe('human mode', () => {
    it('should output formatted message', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const fmt = createFormatter();
      fmt.success({
        command: 'vibe dev',
        data: {},
        message: 'Server started on port 3000',
        nextSteps: ['Open http://localhost:3000'],
      });

      const allOutput = spy.mock.calls.map((c) => c[0]).join('\n');
      expect(allOutput).toContain('Server started on port 3000');
      expect(allOutput).toContain('Next steps:');
    });
  });
});
