import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  tracing,
  getRequestId,
  getTraceContext,
  getRequestDuration,
  propagationHeaders,
  generateRequestId,
  REQUEST_ID_HEADER,
} from './tracing.js';

describe('Request Tracing Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    vi.restoreAllMocks();
    app = new Hono();
  });

  // -----------------------------------------------------------------------
  // ID generation
  // -----------------------------------------------------------------------

  it('should generate a unique request ID', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  // -----------------------------------------------------------------------
  // Middleware basics
  // -----------------------------------------------------------------------

  it('should assign a request ID to every request', async () => {
    app.use('*', tracing());
    app.get('/test', (c) => {
      const reqId = getRequestId(c);
      return c.json({ requestId: reqId });
    });

    const res = await app.request('/test');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.requestId).toBeTruthy();
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe(body.requestId);
  });

  it('should use incoming x-request-id header when trustProxy is true', async () => {
    app.use('*', tracing({ trustProxy: true }));
    app.get('/test', (c) => {
      return c.json({ requestId: getRequestId(c) });
    });

    const res = await app.request('/test', {
      headers: { [REQUEST_ID_HEADER]: 'incoming-req-id' },
    });
    const body = await res.json();

    expect(body.requestId).toBe('incoming-req-id');
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe('incoming-req-id');
  });

  it('should ignore incoming header when trustProxy is false', async () => {
    app.use('*', tracing({ trustProxy: false }));
    app.get('/test', (c) => {
      return c.json({ requestId: getRequestId(c) });
    });

    const res = await app.request('/test', {
      headers: { [REQUEST_ID_HEADER]: 'should-be-ignored' },
    });
    const body = await res.json();

    expect(body.requestId).not.toBe('should-be-ignored');
    expect(body.requestId).toBeTruthy();
  });

  it('should support custom header name', async () => {
    app.use('*', tracing({ headerName: 'x-trace-id' }));
    app.get('/test', (c) => {
      return c.json({ requestId: getRequestId(c) });
    });

    const res = await app.request('/test', {
      headers: { 'x-trace-id': 'custom-trace' },
    });
    const body = await res.json();

    expect(body.requestId).toBe('custom-trace');
    expect(res.headers.get('x-trace-id')).toBe('custom-trace');
  });

  it('should support custom ID generator', async () => {
    let counter = 0;
    app.use('*', tracing({ generateId: () => `custom-${++counter}` }));
    app.get('/test', (c) => {
      return c.json({ requestId: getRequestId(c) });
    });

    const res1 = await app.request('/test');
    const body1 = await res1.json();

    const res2 = await app.request('/test');
    const body2 = await res2.json();

    expect(body1.requestId).toBe('custom-1');
    expect(body2.requestId).toBe('custom-2');
  });

  // -----------------------------------------------------------------------
  // Trace context
  // -----------------------------------------------------------------------

  it('should provide full trace context', async () => {
    app.use('*', tracing());
    app.get('/test', (c) => {
      const ctx = getTraceContext(c);
      return c.json({
        requestId: ctx?.requestId,
        hasStartTime: typeof ctx?.startTime === 'number',
      });
    });

    const res = await app.request('/test');
    const body = await res.json();

    expect(body.requestId).toBeTruthy();
    expect(body.hasStartTime).toBe(true);
  });

  it('should set parentSpanId when incoming ID is provided', async () => {
    app.use('*', tracing());
    app.get('/test', (c) => {
      const ctx = getTraceContext(c);
      return c.json({ parentSpanId: ctx?.parentSpanId });
    });

    const res = await app.request('/test', {
      headers: { [REQUEST_ID_HEADER]: 'parent-span-123' },
    });
    const body = await res.json();

    expect(body.parentSpanId).toBe('parent-span-123');
  });

  it('should not set parentSpanId when no incoming ID', async () => {
    app.use('*', tracing());
    app.get('/test', (c) => {
      const ctx = getTraceContext(c);
      return c.json({ parentSpanId: ctx?.parentSpanId ?? null });
    });

    const res = await app.request('/test');
    const body = await res.json();

    expect(body.parentSpanId).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Duration tracking
  // -----------------------------------------------------------------------

  it('should calculate request duration', async () => {
    app.use('*', tracing());
    app.get('/test', (c) => {
      const duration = getRequestDuration(c);
      return c.json({ duration });
    });

    const res = await app.request('/test');
    const body = await res.json();

    expect(typeof body.duration).toBe('number');
    expect(body.duration).toBeGreaterThanOrEqual(0);
  });

  // -----------------------------------------------------------------------
  // Propagation headers
  // -----------------------------------------------------------------------

  it('should generate propagation headers', async () => {
    app.use('*', tracing());
    app.get('/test', (c) => {
      const headers = propagationHeaders(c);
      return c.json(headers);
    });

    const res = await app.request('/test');
    const body = await res.json();

    expect(body[REQUEST_ID_HEADER]).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it('should return undefined when middleware is not installed', async () => {
    app.get('/test', (c) => {
      return c.json({
        requestId: getRequestId(c) ?? null,
        traceContext: getTraceContext(c) ?? null,
        duration: getRequestDuration(c) ?? null,
      });
    });

    const res = await app.request('/test');
    const body = await res.json();

    expect(body.requestId).toBeNull();
    expect(body.traceContext).toBeNull();
    expect(body.duration).toBeNull();
  });

  it('should return empty object from propagationHeaders when no tracing', async () => {
    app.get('/test', (c) => {
      const headers = propagationHeaders(c);
      return c.json({ headers, isEmpty: Object.keys(headers).length === 0 });
    });

    const res = await app.request('/test');
    const body = await res.json();

    expect(body.isEmpty).toBe(true);
  });
});
