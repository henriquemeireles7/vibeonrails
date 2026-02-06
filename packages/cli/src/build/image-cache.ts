/**
 * Image Optimization Cache
 *
 * Caches optimized images in .vibe/image-cache/ keyed by source content hash.
 * WebP conversion, responsive srcset generation. Skip processing for cache hits.
 * Reports cache stats in build output.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, basename, extname, dirname } from "node:path";
import { createHash } from "node:crypto";

/**
 * Supported image formats for optimization.
 */
export const SUPPORTED_FORMATS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
] as const;

/**
 * Responsive image widths for srcset generation.
 */
export const RESPONSIVE_WIDTHS = [320, 640, 768, 1024, 1280, 1536] as const;

/**
 * Image cache entry.
 */
export interface ImageCacheEntry {
  readonly sourceHash: string;
  readonly sourcePath: string;
  readonly outputPath: string;
  readonly format: string;
  readonly width: number;
  readonly cachedAt: string;
}

/**
 * Cache stats for reporting.
 */
export interface CacheStats {
  readonly totalEntries: number;
  readonly hits: number;
  readonly misses: number;
  readonly sizeBytes: number;
}

/**
 * Image cache manager.
 */
export class ImageCache {
  private readonly cacheDir: string;
  private readonly manifestPath: string;
  private manifest: Record<string, ImageCacheEntry>;
  private stats: CacheStats;

  constructor(projectRoot: string) {
    this.cacheDir = join(projectRoot, ".vibe", "image-cache");
    this.manifestPath = join(this.cacheDir, "manifest.json");
    this.manifest = this.loadManifest();
    this.stats = {
      totalEntries: Object.keys(this.manifest).length,
      hits: 0,
      misses: 0,
      sizeBytes: 0,
    };
  }

  /**
   * Compute content hash of a file.
   */
  computeHash(filePath: string): string {
    const content = readFileSync(filePath);
    return createHash("sha256").update(content).digest("hex").substring(0, 16);
  }

  /**
   * Generate cache key for a source image + width.
   */
  cacheKey(sourceHash: string, width: number, format: string): string {
    return `${sourceHash}-${width}.${format}`;
  }

  /**
   * Check if a cached version exists.
   */
  has(sourceHash: string, width: number, format: string): boolean {
    const key = this.cacheKey(sourceHash, width, format);
    const entry = this.manifest[key];
    if (!entry) return false;

    const outputExists = existsSync(join(this.cacheDir, entry.outputPath));
    if (outputExists) {
      this.stats = { ...this.stats, hits: this.stats.hits + 1 };
      return true;
    }

    this.stats = { ...this.stats, misses: this.stats.misses + 1 };
    return false;
  }

  /**
   * Get the cached output path.
   */
  get(sourceHash: string, width: number, format: string): string | null {
    const key = this.cacheKey(sourceHash, width, format);
    const entry = this.manifest[key];
    if (!entry) return null;

    return join(this.cacheDir, entry.outputPath);
  }

  /**
   * Store a processed image in the cache.
   */
  set(
    sourcePath: string,
    sourceHash: string,
    width: number,
    format: string,
    outputData: Buffer,
  ): string {
    this.ensureCacheDir();

    const outputFilename = this.cacheKey(sourceHash, width, format);
    const outputPath = join(this.cacheDir, outputFilename);

    writeFileSync(outputPath, outputData);

    const key = this.cacheKey(sourceHash, width, format);
    this.manifest[key] = {
      sourceHash,
      sourcePath,
      outputPath: outputFilename,
      format,
      width,
      cachedAt: new Date().toISOString(),
    };

    this.saveManifest();
    this.stats = { ...this.stats, misses: this.stats.misses + 1 };

    return outputPath;
  }

  /**
   * Generate srcset attribute value for an image.
   */
  generateSrcset(sourceHash: string, format: string): string {
    const parts: string[] = [];

    for (const width of RESPONSIVE_WIDTHS) {
      const key = this.cacheKey(sourceHash, width, format);
      const entry = this.manifest[key];
      if (entry) {
        parts.push(`${entry.outputPath} ${width}w`);
      }
    }

    return parts.join(", ");
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    let sizeBytes = 0;

    if (existsSync(this.cacheDir)) {
      try {
        const files = readdirSync(this.cacheDir);
        for (const file of files) {
          if (file === "manifest.json") continue;
          const fullPath = join(this.cacheDir, file);
          try {
            sizeBytes += statSync(fullPath).size;
          } catch {
            // File might have been deleted
          }
        }
      } catch {
        // Cache dir might not exist
      }
    }

    return {
      ...this.stats,
      totalEntries: Object.keys(this.manifest).length,
      sizeBytes,
    };
  }

  /**
   * Format stats for display.
   */
  formatStats(): string {
    const stats = this.getStats();
    const sizeMB = (stats.sizeBytes / (1024 * 1024)).toFixed(1);
    return [
      `Image cache: ${stats.totalEntries} entries, ${sizeMB}MB`,
      `  Hits: ${stats.hits}, Misses: ${stats.misses}`,
    ].join("\n");
  }

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private loadManifest(): Record<string, ImageCacheEntry> {
    if (existsSync(this.manifestPath)) {
      try {
        return JSON.parse(readFileSync(this.manifestPath, "utf-8"));
      } catch {
        return {};
      }
    }
    return {};
  }

  private saveManifest(): void {
    this.ensureCacheDir();
    writeFileSync(
      this.manifestPath,
      JSON.stringify(this.manifest, null, 2),
      "utf-8",
    );
  }
}

/**
 * Check if a file is a supported image format.
 */
export function isSupportedImage(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return (SUPPORTED_FORMATS as readonly string[]).includes(ext);
}
