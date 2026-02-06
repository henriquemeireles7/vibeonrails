/**
 * Content Index Query Functions
 *
 * Query functions for searching and filtering content entries.
 * Uses in-memory caching for performance.
 */

import type { ContentEntry, ContentIndex } from './types.js';

// ---------------------------------------------------------------------------
// Query Cache
// ---------------------------------------------------------------------------

interface QueryCache {
  byType: Map<string, ContentEntry[]>;
  byTag: Map<string, ContentEntry[]>;
  byKeyword: Map<string, ContentEntry[]>;
}

let cache: QueryCache | null = null;
let cachedIndex: ContentIndex | null = null;

/**
 * Clear query cache.
 */
export function clearCache(): void {
  cache = null;
  cachedIndex = null;
}

/**
 * Build query cache from index.
 */
function buildCache(index: ContentIndex): QueryCache {
  const byType = new Map<string, ContentEntry[]>();
  const byTag = new Map<string, ContentEntry[]>();
  const byKeyword = new Map<string, ContentEntry[]>();

  for (const entry of Object.values(index.entries)) {
    // Index by type
    if (!byType.has(entry.type)) {
      byType.set(entry.type, []);
    }
    byType.get(entry.type)!.push(entry);

    // Index by tag
    for (const tag of entry.tags) {
      if (!byTag.has(tag)) {
        byTag.set(tag, []);
      }
      byTag.get(tag)!.push(entry);
    }

    // Index by keyword (title, description, content snippet)
    const keywords = [
      entry.title,
      entry.description,
      entry.contentSnippet,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .split(/\s+/);

    for (const keyword of keywords) {
      if (keyword.length > 2) {
        // Only index words longer than 2 chars
        if (!byKeyword.has(keyword)) {
          byKeyword.set(keyword, []);
        }
        byKeyword.get(keyword)!.push(entry);
      }
    }
  }

  return { byType, byTag, byKeyword };
}

/**
 * Get or build cache for index.
 */
function getCache(index: ContentIndex): QueryCache {
  if (cache && cachedIndex === index) {
    return cache;
  }

  cache = buildCache(index);
  cachedIndex = index;
  return cache;
}

// ---------------------------------------------------------------------------
// Query Functions
// ---------------------------------------------------------------------------

/**
 * List all entries of a specific type.
 */
export function listByType(
  index: ContentIndex,
  type: string,
): ContentEntry[] {
  const queryCache = getCache(index);
  return queryCache.byType.get(type) ?? [];
}

/**
 * Filter entries by tag.
 */
export function filterByTag(
  index: ContentIndex,
  tag: string,
): ContentEntry[] {
  const queryCache = getCache(index);
  return queryCache.byTag.get(tag) ?? [];
}

/**
 * Search entries by keyword (searches title, description, content snippet).
 */
export function searchByKeyword(
  index: ContentIndex,
  keyword: string,
): ContentEntry[] {
  const normalizedKeyword = keyword.toLowerCase().trim();
  if (normalizedKeyword.length < 2) {
    return [];
  }

  const queryCache = getCache(index);
  const results = new Set<ContentEntry>();

  // Exact keyword match
  const exactMatches = queryCache.byKeyword.get(normalizedKeyword);
  if (exactMatches) {
    for (const entry of exactMatches) {
      results.add(entry);
    }
  }

  // Partial matches (keyword is substring)
  for (const [cachedKeyword, entries] of queryCache.byKeyword.entries()) {
    if (cachedKeyword.includes(normalizedKeyword)) {
      for (const entry of entries) {
        results.add(entry);
      }
    }
  }

  // Also search in entry fields directly
  for (const entry of Object.values(index.entries)) {
    const searchableText = [
      entry.title,
      entry.description,
      entry.contentSnippet,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (searchableText.includes(normalizedKeyword)) {
      results.add(entry);
    }
  }

  return Array.from(results);
}

/**
 * Get entry by file path.
 */
export function getByPath(
  index: ContentIndex,
  path: string,
): ContentEntry | null {
  return index.entries[path] ?? null;
}

/**
 * Get all entries.
 */
export function getAll(index: ContentIndex): ContentEntry[] {
  return Object.values(index.entries);
}

/**
 * Get entries sorted by date (newest first).
 */
export function getByDate(
  index: ContentIndex,
  limit?: number,
): ContentEntry[] {
  const entries = Object.values(index.entries);

  const sorted = entries.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA; // Newest first
  });

  return limit ? sorted.slice(0, limit) : sorted;
}
