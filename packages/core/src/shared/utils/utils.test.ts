import { describe, it, expect } from 'vitest';
import { toPascalCase, toCamelCase, paginate, omit, pick, randomString } from './index.js';

describe('toPascalCase', () => {
  it('should convert kebab-case', () => {
    expect(toPascalCase('user-profile')).toBe('UserProfile');
  });

  it('should convert snake_case', () => {
    expect(toPascalCase('user_profile')).toBe('UserProfile');
  });

  it('should convert space-separated', () => {
    expect(toPascalCase('user profile')).toBe('UserProfile');
  });

  it('should handle single word', () => {
    expect(toPascalCase('user')).toBe('User');
  });
});

describe('toCamelCase', () => {
  it('should convert kebab-case', () => {
    expect(toCamelCase('user-profile')).toBe('userProfile');
  });

  it('should convert snake_case', () => {
    expect(toCamelCase('user_profile')).toBe('userProfile');
  });

  it('should handle single word', () => {
    expect(toCamelCase('user')).toBe('user');
  });
});

describe('paginate', () => {
  it('should create a paginated result', () => {
    const result = paginate(['a', 'b', 'c'], 10, 1, 3);

    expect(result).toEqual({
      data: ['a', 'b', 'c'],
      total: 10,
      page: 1,
      limit: 3,
      totalPages: 4,
    });
  });

  it('should calculate totalPages correctly', () => {
    expect(paginate([], 0, 1, 10).totalPages).toBe(0);
    expect(paginate([], 1, 1, 10).totalPages).toBe(1);
    expect(paginate([], 11, 1, 10).totalPages).toBe(2);
  });
});

describe('omit', () => {
  it('should remove specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('should handle empty keys array', () => {
    const obj = { a: 1 };
    expect(omit(obj, [])).toEqual({ a: 1 });
  });
});

describe('pick', () => {
  it('should keep only specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });
});

describe('randomString', () => {
  it('should generate a string of specified length', () => {
    const str = randomString(32);
    expect(str).toHaveLength(32);
  });

  it('should generate different strings', () => {
    const a = randomString(16);
    const b = randomString(16);
    expect(a).not.toBe(b);
  });

  it('should only contain alphanumeric characters', () => {
    const str = randomString(100);
    expect(str).toMatch(/^[A-Za-z0-9]+$/);
  });
});
