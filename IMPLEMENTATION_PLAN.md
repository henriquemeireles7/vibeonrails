# Implementation Plan: Codebase Hardening

**Based on:** Vibe Audit (172 checks), Security Audit (125 checks), Performance Audit (131 checks)
**Date:** 2026-02-06
**Scope:** Production hardening of VibeOnRails framework
**Rule:** One task = one file change/creation. No task touches multiple files.

---

## Phase 1: Critical Fixes (Before Launch) -- COMPLETED 2026-02-06

> These issues will lose you money, users, or data if not addressed. Fix before any production deployment.

### Project 1.1: Database Hardening

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 1 | Add indexes to users table | CRITICAL | `packages/core/src/database/schema/user.ts` | CHANGE | No indexes on `email` (queried in every login). At 10k rows, queries go from 100ms to 10s. Covers TOP-012, PERF-002. |
| 2 | Add indexes to posts table | CRITICAL | `packages/core/src/database/schema/post.ts` | CHANGE | No indexes on `authorId` or `published` (used in WHERE/JOIN). N+1 and slow list queries. Covers TOP-012, PERF-002. |
| 3 | Add pagination helpers | CRITICAL | `packages/core/src/database/pagination.ts` | CREATE | No pagination exists anywhere. `list()` and `findAll()` return unbounded results. One scraper requesting all data crashes the DB. Covers TOP-028, PERF-010, API-008. |
| 4 | Add pagination to user repository | CRITICAL | `packages/core/src/database/repositories/user.repository.ts` | CHANGE | `list()` returns all users with no limit. Must enforce max page size server-side. Covers TOP-028. |
| 5 | Add pagination to post repository | CRITICAL | `packages/core/src/database/repositories/post.repository.ts` | CHANGE | `findAll()` and `findByAuthor()` return all rows unbounded. Must enforce pagination. Covers TOP-028. |
| 6 | Add explicit connection pool config | CRITICAL | `packages/core/src/database/client.ts` | CHANGE | `postgres(url)` has no pool config. Under load, connections exhaust DB limits. Add `max`, `idle_timeout`, `connect_timeout`. Covers PERF-008, DB-005, SCALE-004. |

### Project 1.2: Payment Security

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 7 | Add webhook idempotency store | CRITICAL | `packages/features/payments/src/webhook-store.ts` | CREATE | No deduplication exists. Stripe explicitly sends duplicate events. Double-charges, double-account creation. Covers TOP-024, DATA-010, BIZ-002. |
| 8 | Add idempotency check to webhook handler | CRITICAL | `packages/features/payments/src/webhook.ts` | CHANGE | `handleWebhook()` processes every event blindly. Must check `event.id` against processed store before dispatching. Covers TOP-024. |
| 9 | Add pricing config (allowed price IDs) | CRITICAL | `packages/features/payments/src/pricing-config.ts` | CREATE | No server-side price validation. Attackers can modify `priceId` in checkout requests to use lower-priced plans. Covers BIZ-001. |
| 10 | Add price validation to checkout | CRITICAL | `packages/features/payments/src/checkout.ts` | CHANGE | `createCheckout()` passes `priceId` directly to Stripe without validation against allowed prices. Covers BIZ-001. |
| 11 | Add price validation to subscription | CRITICAL | `packages/features/payments/src/subscription.ts` | CHANGE | `createSubscription()` and `changePlan()` accept arbitrary `priceId` with no server-side validation. Covers BIZ-001. |
| 12 | Add subscription state machine | CRITICAL | `packages/features/payments/src/subscription-state.ts` | CREATE | No explicit state transitions. Invalid states (e.g. expired -> active without payment) are not blocked. Covers BIZ-003. |

### Project 1.3: Frontend Resilience

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 13 | Create ErrorBoundary component | CRITICAL | `packages/web/src/components/error/ErrorBoundary.tsx` | CREATE | No error boundaries exist. One broken component white-screens the entire app. Users see nothing. Covers ERR-003. |
| 14 | Create ErrorFallback component | CRITICAL | `packages/web/src/components/error/ErrorFallback.tsx` | CREATE | Need a friendly fallback UI with "try again" button. Without it, error boundaries have nothing to render. Covers ERR-002. |

### Project 1.4: Backup & Recovery

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 15 | Create database backup script | CRITICAL | `scripts/backup-db.sh` | CREATE | No backup strategy exists. One `DELETE FROM users` and your business is gone. Covers TOP-001, DATA-006. |
| 16 | Create database restore script | CRITICAL | `scripts/restore-db.sh` | CREATE | Backups are useless if you can't restore. Must be tested. Covers TOP-001. |
| 17 | Create emergency runbook | CRITICAL | `docs/BREAK_GLASS.md` | CREATE | No documented emergency procedures. How to SSH, rollback, disable features, ban users, restore DB. Covers TOP-030. |

**Phase 1 Total: 17 tasks (all CRITICAL) -- ALL COMPLETED**

---

## Phase 2: High-Priority Security & Infrastructure (Sprint 1-2)

> Significant risk to user experience, security, or maintainability. Fix within 2 weeks.

### Project 2.1: Server Security Hardening

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 18 | Fix CORS default (reject wildcard) | HIGH | `packages/core/src/api/server.ts` | CHANGE | CORS defaults to `(origin) => origin` which reflects any origin. With `credentials: true` this allows any website to make authenticated requests. Must require explicit allowlist. Covers TOP-025, API-005. |
| 19 | Add CSP and HSTS security headers | HIGH | `packages/core/src/api/middleware/security-headers.ts` | CREATE | No CSP header blocks XSS. No HSTS prevents protocol downgrade. `secureHeaders()` from Hono sets basics but not CSP or HSTS with proper max-age. Covers SEC-011, SEC-015, CLIENT-001. |
| 20 | Add request body size limits | HIGH | `packages/core/src/api/middleware/body-limit.ts` | CREATE | No body size limit. Attackers send massive payloads to exhaust memory. Need configurable per-route limits (default 1MB). Covers API-006. |
| 21 | Integrate rate limiting into server | HIGH | `packages/core/src/api/server.ts` | CHANGE | Rate limiting middleware exists but is NOT wired into `createServer()`. Auth endpoints have zero rate limiting by default. Covers TOP-011, SEC-009, AUTH-001. (Separate task from #18 -- different concern.) |

### Project 2.2: Error Handling & Logging

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 22 | Add structured context to error handler | HIGH | `packages/core/src/api/middleware/error-handler.ts` | CHANGE | Currently uses `console.error` with no user/request context. When users report "it broke" you can't diagnose. Must log userId, path, sanitized input. Covers ERR-010, LOG-003. |
| 23 | Add sensitive data redaction to logger | HIGH | `packages/infra/src/logging/logger.ts` | CHANGE | Logger has no redaction. Passwords, tokens, PII can leak into logs. Must redact known sensitive field names (password, token, secret, authorization). Covers TOP-021, DATA-005, PRIV-004. |

### Project 2.3: Response Safety

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 24 | Create response transformer utilities | HIGH | `packages/core/src/api/transformers/response.ts` | CREATE | API responses return raw DB records. `passwordHash`, internal metadata, other users' data can leak. Need DTOs/transformers to strip internal fields. Covers TOP-019, SEC-004, API-002. |
| 25 | Apply user transformer to user repository | HIGH | `packages/core/src/database/repositories/user.repository.ts` | CHANGE | `list()` and `findByEmail()` return `passwordHash` in the result. Must exclude sensitive fields from public-facing queries. Covers TOP-019. (Separate task from #4 -- different concern.) |

### Project 2.4: CI/CD Pipeline

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 26 | Create CI workflow (lint + test + build) | HIGH | `.github/workflows/ci.yml` | CREATE | No CI pipeline in main repo. Broken code can be merged to main unchecked. CI workflows only exist in `ai-workflow/` subdirectory. Covers TOP-015, DEPLOY-001. |
| 27 | Create deploy workflow | HIGH | `.github/workflows/deploy.yml` | CREATE | No automated deployment. Manual deploys mean human error on Friday nights. Covers TOP-015, DEPLOY-001. |
| 28 | Create Dockerfile | HIGH | `Dockerfile` | CREATE | No containerization. "Works on my machine" is not a deploy strategy. Multi-stage build for production. Covers DEPLOY-003, INFRA-001. |
| 29 | Create docker-compose for local dev | HIGH | `docker-compose.yml` | CREATE | No local environment setup with postgres + redis. Developers must manually provision services. Covers TOP-018, TOP-027. |
| 30 | Create .dockerignore | HIGH | `.dockerignore` | CREATE | Without it, Docker copies node_modules, .git, and test files into production images (bloat + secrets). Covers CI-003. |

### Project 2.5: Data Integrity

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 31 | Add soft delete to user schema | HIGH | `packages/core/src/database/schema/user.ts` | CHANGE | Hard deletes are unrecoverable. Must add `deletedAt` timestamp column. Covers DATA-003. (Separate task from #1 -- different migration.) |
| 32 | Add soft delete to post schema | HIGH | `packages/core/src/database/schema/post.ts` | CHANGE | `remove()` hard-deletes posts. Accidental deletions are permanent. Must add `deletedAt` column. Covers DATA-003. (Separate task from #2.) |
| 33 | Create soft delete helpers | HIGH | `packages/core/src/database/soft-delete.ts` | CREATE | No soft delete utilities. Need `softDelete()`, `restore()`, and automatic `WHERE deleted_at IS NULL` filtering. Covers DATA-003. |
| 34 | Add soft delete to post repository | HIGH | `packages/core/src/database/repositories/post.repository.ts` | CHANGE | `remove()` uses hard `DELETE`. Must use soft delete helper. `findAll()` must filter `deletedAt IS NULL`. Covers DATA-003. (Separate task from #5.) |

### Project 2.6: Testing Infrastructure

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 35 | Add coverage config to core package | HIGH | `packages/core/vitest.config.ts` | CHANGE | No coverage thresholds. Coverage drifts to zero without enforcement. Must set 80% minimum for security-critical code. Covers TEST-001. |
| 36 | Add coverage config to infra package | HIGH | `packages/infra/vitest.config.ts` | CHANGE | Same as above for infra package. Covers TEST-001. |
| 37 | Add coverage config to payments package | HIGH | `packages/features/payments/vitest.config.ts` | CHANGE | Payment code is the most critical path. Must enforce coverage thresholds. Covers TEST-001. |

### Project 2.7: Resilience Patterns

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 38 | Create HTTP client with timeouts | HIGH | `packages/infra/src/http/client.ts` | CREATE | No default timeouts on external calls. One slow Stripe/email API hangs the entire app forever. Need preconfigured client with timeout, retry, circuit breaker. Covers PERF-011, PERF-017, REL-002. |
| 39 | Create circuit breaker | HIGH | `packages/infra/src/resilience/circuit-breaker.ts` | CREATE | No circuit breakers. If Stripe goes down, your entire app goes down cascading. Need open/half-open/closed state machine. Covers REL-001, REL-005, ERR-006. |
| 40 | Add trial abuse prevention | HIGH | `packages/features/payments/src/trial-guard.ts` | CREATE | No trial abuse checks. Users create multiple accounts for unlimited free trials. Must check email/payment method history. Covers BIZ-002, BIZ-006. |

### Project 2.8: Monitoring

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 41 | Add Prometheus metrics adapter | HIGH | `packages/infra/src/monitoring/prometheus-adapter.ts` | CREATE | Metrics are in-memory only, lost on restart. Production needs persistent export to Prometheus/Datadog for alerting. Covers OBS-001, OBS-002, OBS-006. |

**Phase 2 Total: 24 tasks (all HIGH)**

---

## Phase 3: Medium-Priority Improvements (Month 2-3)

> Real improvements that matter. Schedule within the month.

### Project 3.1: Frontend Performance

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 42 | Create optimized Image component | MEDIUM | `packages/web/src/components/media/Image.tsx` | CREATE | No image optimization. Unoptimized images are the #1 cause of slow apps after DB. Need WebP/AVIF, lazy loading, responsive srcset. Covers TOP-023, PERF-003. |
| 43 | Create Skeleton loading component | MEDIUM | `packages/web/src/components/loading/Skeleton.tsx` | CREATE | No loading states. Users see blank screens during data fetches. Need skeleton placeholders. Covers ERR-007. |
| 44 | Create Spinner component | MEDIUM | `packages/web/src/components/loading/Spinner.tsx` | CREATE | No loading indicator for button/form submissions. Users double-click, double-submit. Covers ERR-007. |
| 45 | Create EmptyState component | MEDIUM | `packages/web/src/components/empty/EmptyState.tsx` | CREATE | Lists with no items show blank white areas that look broken. Need "No items yet" UI. Covers ERR-008. |
| 46 | Create NotFound (404) page | MEDIUM | `packages/web/src/pages/NotFound.tsx` | CREATE | No custom 404 page. Users hit raw framework error pages with no navigation back. Covers ERR-009. |
| 47 | Create ServerError (500) page | MEDIUM | `packages/web/src/pages/ServerError.tsx` | CREATE | No custom 500 page. Users see raw JSON blobs or blank screens on server errors. Covers ERR-009. |

### Project 3.2: Security Enhancements

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 48 | Add account enumeration prevention | MEDIUM | `packages/core/src/security/auth/auth-messages.ts` | CREATE | Login/register responses reveal whether emails exist. Attackers build user lists. Need generic "Invalid credentials" constants. Covers SEC-003, AUTH-006, AUTH-009. |
| 49 | Add file upload validation (magic bytes) | MEDIUM | `packages/infra/src/storage/validators.ts` | CREATE | File type checked by extension only (trivially bypassed). Must validate magic bytes to prevent code execution via uploaded files. Covers TOP-020, SEC-015. |
| 50 | Add secure cookie configuration | MEDIUM | `packages/core/src/security/auth/cookie-config.ts` | CREATE | No centralized secure cookie settings. Must enforce `HttpOnly`, `Secure`, `SameSite=Lax` on all auth cookies. Covers SEC-004. |
| 51 | Add open redirect prevention | MEDIUM | `packages/core/src/security/middleware/redirect-guard.ts` | CREATE | No redirect URL validation. After login, users can be redirected to attacker-controlled sites. Need allowlist check. Covers SEC-005, SEC-020. |
| 52 | Create SSRF protection utility | MEDIUM | `packages/infra/src/security/ssrf-guard.ts` | CREATE | Features accepting user URLs (webhooks, image URLs) don't block internal IPs (127.0.0.1, 10.x, 169.254.x). Covers SEC-012, EDGE-006. |

### Project 3.3: N+1 Query Enforcement

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 53 | Add dev-mode N+1 warning to query analyzer | MEDIUM | `packages/core/src/database/analyzer.ts` | CHANGE | Detection exists but no enforcement. Must log loud warnings or throw in dev when N+1 detected. Covers TOP-013, PERF-001. |

### Project 3.4: Configuration & Documentation

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 54 | Update .env.example with all required vars | MEDIUM | `.env.example` | CHANGE | Missing vars for new features (pool config, rate limits, CSP, etc.). New developers can't set up without guessing. Covers CODE-014, TOP-027. |
| 55 | Create feature flags system | MEDIUM | `packages/infra/src/feature-flags/flags.ts` | CREATE | No feature flags. Risky changes can't be toggled off without a deploy. Simple boolean flags backed by env/config. Covers ARCH-010. |
| 56 | Create feature flags barrel export | MEDIUM | `packages/infra/src/feature-flags/index.ts` | CREATE | Barrel export for the feature flags module to follow package conventions. |

### Project 3.5: Compliance & Privacy

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 57 | Create data export utility | MEDIUM | `packages/core/src/database/data-export.ts` | CREATE | No way for users to export their data. GDPR/LGPD legal requirement. Must export all user PII in portable format. Covers DATA-007, PRIV-006. |
| 58 | Add account deletion/anonymization | MEDIUM | `packages/core/src/database/data-deletion.ts` | CREATE | No account deletion capability. When users delete accounts, PII must be anonymized within 30 days. Covers DATA-008, PRIV-006. |
| 59 | Create cookie consent component | MEDIUM | `packages/web/src/components/compliance/CookieConsent.tsx` | CREATE | No cookie consent banner. LGPD/GDPR require consent before non-essential cookies. Covers PRIV-002. |

### Project 3.6: Performance Monitoring

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 60 | Add bundle size config | MEDIUM | `.bundlewatchrc.json` | CREATE | No bundle size monitoring. JS grows silently until page loads take 5s on mobile. Need a budget with CI enforcement. Covers PERF-004, FE-011, CI-002. |
| 61 | Add cache invalidation strategy docs | MEDIUM | `packages/infra/src/cache/CACHE_STRATEGY.md` | CREATE | Cache exists but no documented invalidation strategy (TTL, event-based, write-through). Stale data is inevitable without strategy. Covers CACHE-001. |

### Project 3.7: Testing Enhancements

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 62 | Create webhook handler test fixtures | MEDIUM | `packages/features/payments/src/__tests__/webhook.test.ts` | CREATE | Webhook handlers are not tested with real Stripe test events. Must test all event types plus duplicate delivery. Covers TEST-005. |
| 63 | Create auth flow integration test | MEDIUM | `packages/core/src/__tests__/auth-flow.test.ts` | CREATE | No E2E test for register -> verify -> login -> protected route -> logout -> verify 401. Covers TEST-002. |
| 64 | Create manual testing checklist | MEDIUM | `docs/TESTING_CHECKLIST.md` | CREATE | No written checklist for flows too complex to automate. Walk through before major releases. Covers TEST-011. |

**Phase 3 Total: 23 tasks (all MEDIUM)**

---

## Phase 4: Low-Priority Best Practices (Ongoing)

> Best practices. Do when you have breathing room.

### Project 4.1: UX Polish

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 65 | Add font-display: swap to CSS tokens | LOW | `packages/web/src/styles/tokens.css` | CHANGE | Fonts may block rendering causing invisible text. Add `font-display: swap` to all @font-face rules. Covers PERF-005. |
| 66 | Add descriptive page titles utility | LOW | `packages/web/src/hooks/usePageTitle.ts` | CREATE | No unique page titles. Browser tabs are indistinguishable. Bad for SEO. Covers UX-010. |
| 67 | Add focus management to Modal | LOW | `packages/web/src/components/ui/Modal.tsx` | CHANGE | Modal may not trap focus or return focus on close. Tab key can escape into background. Covers UX-009. |

### Project 4.2: Code Quality

| # | Task | Priority | File | Action | Why |
|---|------|----------|------|--------|-----|
| 68 | Add deploy notification step to CI | LOW | `.github/workflows/deploy.yml` | CHANGE | Team doesn't know when deploys happen. Add Slack/Discord webhook. Covers DEPLOY-006. (Depends on #27 existing.) |

**Phase 4 Total: 4 tasks (all LOW)**

---

## Summary

| Phase | Focus | Tasks | Critical | High | Medium | Low |
|-------|-------|-------|----------|------|--------|-----|
| **Phase 1** | Critical Fixes | 17 | 17 | 0 | 0 | 0 |
| **Phase 2** | Security & Infrastructure | 24 | 0 | 24 | 0 | 0 |
| **Phase 3** | Improvements | 23 | 0 | 0 | 23 | 0 |
| **Phase 4** | Best Practices | 4 | 0 | 0 | 0 | 4 |
| **TOTAL** | | **68** | **17** | **24** | **23** | **4** |

### Files Created vs Changed

| Action | Count |
|--------|-------|
| **CREATE** (new files) | 42 |
| **CHANGE** (existing files) | 26 |
| **TOTAL** | 68 |

### Audit Coverage

| Audit | Total Checks | Addressed Here | Coverage |
|-------|-------------|----------------|----------|
| Vibe Audit | 172 | ~65 checks | ~38% of highest-impact items |
| Security Audit | 125 | ~40 checks | ~32% of highest-impact items |
| Performance Audit | 131 | ~35 checks | ~27% of highest-impact items |

> **Note:** Many audit checks are operational (monitoring dashboards, manual testing, DNS config) rather than code changes. This plan focuses exclusively on code-level improvements. Operational items (uptime monitoring setup, load testing, penetration testing) should be tracked separately in your project management tool.

### Dependency Graph

```
Phase 1 (no dependencies -- can start immediately)
  |
Phase 2 (depends on Phase 1 schema changes for soft delete)
  |-- Project 2.1 (server.ts changes) depends on nothing
  |-- Project 2.4 (CI/CD) depends on nothing
  |-- Project 2.5 (soft delete) depends on Phase 1 indexes being migrated
  |
Phase 3 (depends on Phase 2 infrastructure)
  |-- Project 3.2 (security) depends on 2.1 server hardening
  |-- Project 3.5 (compliance) depends on 2.5 soft delete
  |
Phase 4 (depends on Phase 2 CI/CD existing)
  |-- Task 68 depends on Task 27
```

---

*Generated from: vibeaudit.md (172 checks), security-audit.md (125 checks), performance-audit.md (131 checks)*
*Total source checks: 428 | Code-actionable items extracted: 68*
