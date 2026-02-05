import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from './logger.js';

describe('Logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('should log info messages', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger();
    logger.info('Test message');

    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain('INFO');
    expect(output).toContain('Test message');
  });

  it('should log with additional data', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger();
    logger.info('Server started', { port: 3000 });

    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain('Server started');
    expect(output).toContain('3000');
  });

  it('should create child loggers with inherited context', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const parent = new Logger({ service: 'api' });
    const child = parent.child({ requestId: '123' });
    child.info('Handling request');

    expect(spy).toHaveBeenCalled();
  });

  it('should respect minimum log level', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger({}, 'warn');

    logger.debug('Should not appear');
    logger.info('Should not appear either');
    logger.warn('Should appear');

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should log errors with stack traces', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger();

    logger.error('Something failed', new Error('Boom'));

    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain('ERROR');
  });

  it('should output JSON in production mode', () => {
    process.env.NODE_ENV = 'production';
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger();
    logger.info('Production log');

    const output = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('Production log');
    expect(parsed.timestamp).toBeDefined();
  });
});
