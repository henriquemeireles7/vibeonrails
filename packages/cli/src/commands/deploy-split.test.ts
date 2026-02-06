import { describe, it, expect } from 'vitest';
import {
  getCacheHeaders,
  CDN_CACHE_HEADERS,
  SSG_PAGE_CACHE_HEADERS,
  getSitesDeployCommand,
  getApiDeployCommand,
} from './deploy-split.js';

describe('Split Deploy', () => {
  // -----------------------------------------------------------------------
  // Cache Headers
  // -----------------------------------------------------------------------

  describe('getCacheHeaders', () => {
    it('should return immutable headers for JS files', () => {
      const headers = getCacheHeaders('app.bundle.js');
      expect(headers).toEqual(CDN_CACHE_HEADERS);
      expect(headers['Cache-Control']).toContain('immutable');
    });

    it('should return immutable headers for CSS files', () => {
      const headers = getCacheHeaders('styles.css');
      expect(headers).toEqual(CDN_CACHE_HEADERS);
    });

    it('should return immutable headers for images', () => {
      expect(getCacheHeaders('logo.png')).toEqual(CDN_CACHE_HEADERS);
      expect(getCacheHeaders('hero.webp')).toEqual(CDN_CACHE_HEADERS);
      expect(getCacheHeaders('photo.jpg')).toEqual(CDN_CACHE_HEADERS);
    });

    it('should return immutable headers for fonts', () => {
      expect(getCacheHeaders('inter.woff2')).toEqual(CDN_CACHE_HEADERS);
      expect(getCacheHeaders('roboto.woff')).toEqual(CDN_CACHE_HEADERS);
    });

    it('should return stale-while-revalidate for HTML pages', () => {
      const headers = getCacheHeaders('index.html');
      expect(headers).toEqual(SSG_PAGE_CACHE_HEADERS);
      expect(headers['Cache-Control']).toContain('stale-while-revalidate');
    });

    it('should return empty headers for unknown types', () => {
      const headers = getCacheHeaders('data.json');
      expect(headers).toEqual({});
    });
  });

  // -----------------------------------------------------------------------
  // CDN cache header constants
  // -----------------------------------------------------------------------

  describe('CDN_CACHE_HEADERS', () => {
    it('should include max-age of 1 year', () => {
      expect(CDN_CACHE_HEADERS['Cache-Control']).toContain('max-age=31536000');
    });

    it('should include immutable directive', () => {
      expect(CDN_CACHE_HEADERS['Cache-Control']).toContain('immutable');
    });

    it('should include security headers', () => {
      expect(CDN_CACHE_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    });
  });

  describe('SSG_PAGE_CACHE_HEADERS', () => {
    it('should include stale-while-revalidate of 24 hours', () => {
      expect(SSG_PAGE_CACHE_HEADERS['Cache-Control']).toContain('stale-while-revalidate=86400');
    });
  });

  // -----------------------------------------------------------------------
  // Deploy commands
  // -----------------------------------------------------------------------

  describe('getSitesDeployCommand', () => {
    it('should return sites deploy instruction', () => {
      const cmd = getSitesDeployCommand('dist/sites');
      expect(cmd).toContain('dist/sites');
      expect(cmd).toContain('CDN');
    });
  });

  describe('getApiDeployCommand', () => {
    it('should return railway up for Railway', () => {
      expect(getApiDeployCommand('railway')).toBe('railway up');
    });

    it('should return fly deploy for Fly.io', () => {
      expect(getApiDeployCommand('fly')).toBe('fly deploy');
    });

    it('should return docker commands for Docker', () => {
      const cmd = getApiDeployCommand('docker');
      expect(cmd).toContain('docker build');
    });

    it('should return null for unknown platform', () => {
      expect(getApiDeployCommand('unknown')).toBeNull();
    });
  });
});
