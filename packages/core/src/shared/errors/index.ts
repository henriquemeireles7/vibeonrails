/**
 * @vibeonrails/core - Error Handling System
 *
 * Provides structured, AI-friendly error classes with error codes,
 * locations, and suggested fixes. Every error includes a documentation link.
 */

export const ErrorCodes = {
  // Authentication errors (E1xxx)
  AUTH_INVALID_CREDENTIALS: 'E1001',
  AUTH_TOKEN_EXPIRED: 'E1002',
  AUTH_TOKEN_INVALID: 'E1003',

  // User errors (E2xxx)
  USER_NOT_FOUND: 'E2001',
  USER_ALREADY_EXISTS: 'E2002',

  // Resource errors (E3xxx)
  RESOURCE_NOT_FOUND: 'E3001',
  RESOURCE_ALREADY_EXISTS: 'E3002',

  // Validation errors (E4xxx)
  VALIDATION_FAILED: 'E4001',

  // Authorization errors (E5xxx)
  UNAUTHORIZED: 'E5001',
  FORBIDDEN: 'E5002',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      docs: `https://aor.dev/errors/${this.code}`,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      ErrorCodes.RESOURCE_NOT_FOUND,
      `${resource} not found${id ? ` (id: ${id})` : ''}`,
      404,
      { resource, id },
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(ErrorCodes.UNAUTHORIZED, message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(ErrorCodes.FORBIDDEN, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCodes.VALIDATION_FAILED, message, 422, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(ErrorCodes.AUTH_INVALID_CREDENTIALS, message, 401);
    this.name = 'AuthenticationError';
  }
}
