# Cache Strategy

This document describes the caching strategy used across the application. All caching uses TTL-based invalidation with event-driven cache-busting for consistency.

## TTL Guidelines by Data Type

### User Profiles
- **TTL**: 5 minutes
- **Invalidation**: On profile update, password change, or role change
- **Key pattern**: `user:{userId}`
- **Rationale**: Short TTL balances freshness with read performance. Explicit invalidation on writes ensures immediate consistency for the user who made the change.

### Configuration / Settings
- **TTL**: 1 hour
- **Invalidation**: On admin settings change
- **Key pattern**: `config:{scope}`
- **Rationale**: Configuration changes are rare. Longer TTL reduces load on the config store. Event-based invalidation ensures changes propagate within seconds.

### Session Data
- **TTL**: Match session TTL (default 7 days)
- **Invalidation**: On logout or session revocation
- **Key pattern**: `session:{sessionId}`
- **Rationale**: Session cache TTL must align with the session store TTL to avoid serving stale session data or keeping sessions alive after revocation.

### Public Content (Posts, Pages)
- **TTL**: 10 minutes
- **Invalidation**: On publish, update, or delete
- **Key pattern**: `content:{contentType}:{id}`
- **Rationale**: Moderate TTL allows CDN/cache to absorb read spikes. Invalidation on write ensures freshness for editors.

### Rate Limit Counters
- **TTL**: Match the rate limit window (e.g. 60 seconds)
- **Invalidation**: None (natural expiry)
- **Key pattern**: `rl:{identifier}:{window}`

## Event-Based Invalidation Patterns

Use the event bus or direct cache delete calls when data changes:

```typescript
// After updating a user profile
await cache.del(`user:${userId}`);

// After changing app configuration
await cache.del(`config:${scope}`);

// After publishing a post
await cache.del(`content:post:${postId}`);
await cache.del('content:post:list'); // Invalidate list cache too
```

## Cache Warming on Deploy

On deployment, warm critical caches to prevent a thundering herd:

1. **Configuration**: Load all config into cache during app startup
2. **Feature flags**: Pre-populate flag values from environment
3. **Frequently accessed data**: Optionally warm top-N user profiles or content pages

```typescript
// Example: warm config cache on startup
async function warmCaches(cache: CacheClient) {
  const config = await db.select().from(appConfig);
  for (const entry of config) {
    await cache.set(`config:${entry.scope}`, entry.value, 3600);
  }
}
```

## Anti-Patterns to Avoid

- **Cache-aside without invalidation**: Always pair cache reads with explicit write-through invalidation
- **Unbounded TTLs**: Every cache entry must have a TTL, even if it is long
- **Caching user-specific data in shared keys**: Always include the user ID or session ID in the key
- **Ignoring cache stampede**: Use lock-based or probabilistic early expiry for high-traffic keys
