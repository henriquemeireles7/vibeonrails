import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  AuthenticationError,
  ErrorCodes,
} from './index.js';

describe('AppError', () => {
  it('should create an error with code, message, and status', () => {
    const error = new AppError('E1001', 'Test error', 400, { foo: 'bar' });

    expect(error.code).toBe('E1001');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.name).toBe('AppError');
  });

  it('should serialize to JSON with docs link', () => {
    const error = new AppError('E1001', 'Test error');
    const json = error.toJSON();

    expect(json).toEqual({
      code: 'E1001',
      message: 'Test error',
      details: undefined,
      docs: 'https://aor.dev/errors/E1001',
    });
  });

  it('should default statusCode to 400', () => {
    const error = new AppError('E1001', 'Test');
    expect(error.statusCode).toBe(400);
  });
});

describe('NotFoundError', () => {
  it('should create a 404 error with resource name', () => {
    const error = new NotFoundError('User');

    expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User not found');
    expect(error.name).toBe('NotFoundError');
  });

  it('should include resource ID when provided', () => {
    const error = new NotFoundError('User', 'abc-123');

    expect(error.message).toBe('User not found (id: abc-123)');
    expect(error.details).toEqual({ resource: 'User', id: 'abc-123' });
  });
});

describe('UnauthorizedError', () => {
  it('should create a 401 error', () => {
    const error = new UnauthorizedError();

    expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Authentication required');
  });

  it('should accept custom message', () => {
    const error = new UnauthorizedError('Token expired');
    expect(error.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('should create a 403 error', () => {
    const error = new ForbiddenError();

    expect(error.code).toBe(ErrorCodes.FORBIDDEN);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Insufficient permissions');
  });
});

describe('ValidationError', () => {
  it('should create a 422 error with details', () => {
    const error = new ValidationError('Invalid input', {
      field: 'email',
      reason: 'must be a valid email',
    });

    expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
    expect(error.statusCode).toBe(422);
    expect(error.details).toEqual({ field: 'email', reason: 'must be a valid email' });
  });
});

describe('AuthenticationError', () => {
  it('should create a 401 error for invalid credentials', () => {
    const error = new AuthenticationError();

    expect(error.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Invalid credentials');
  });
});
