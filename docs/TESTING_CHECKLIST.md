# Pre-Release Manual Testing Checklist

**Last Updated:** 2026-02-06

Walk through this checklist before every major release. Check each item after verifying.

---

## Authentication Flows

- [ ] Register with valid email and password
- [ ] Register with duplicate email shows correct error
- [ ] Login with correct credentials grants access
- [ ] Login with wrong password shows generic error (no enumeration)
- [ ] Login with non-existent email shows same generic error
- [ ] Password reset sends email (verify email arrives)
- [ ] Password reset link works and expires after use
- [ ] Logout clears session and redirects
- [ ] Accessing protected route after logout returns 401
- [ ] JWT token expires after configured TTL

## Payment Flows

- [ ] Checkout with valid card (Stripe test mode) succeeds
- [ ] Checkout redirects to success URL after payment
- [ ] Cancel checkout redirects to cancel URL
- [ ] Subscription creation with trial period works
- [ ] Subscription cancellation at period end works
- [ ] Subscription cancellation immediately works
- [ ] Plan upgrade processes correctly with proration
- [ ] Plan downgrade processes correctly
- [ ] Webhook receives `checkout.session.completed` event
- [ ] Duplicate webhook events are not processed twice
- [ ] Failed payment triggers `invoice.payment_failed` handling

## Core Features

- [ ] Create, read, update, delete operations work for main entities
- [ ] Pagination returns correct page sizes (max 100 enforced)
- [ ] Requesting `?limit=999999` returns capped results
- [ ] Empty lists show empty state UI (not blank area)
- [ ] Search/filter returns relevant results
- [ ] File upload accepts valid types and rejects invalid ones
- [ ] File upload rejects files exceeding size limit

## Mobile Testing

- [ ] Core flows work on mobile viewport (375px width)
- [ ] Forms are usable on mobile (no tiny inputs)
- [ ] Navigation is accessible on mobile
- [ ] Images load at appropriate size (not desktop 4000px images)
- [ ] Page loads in under 3 seconds on throttled 4G (Chrome DevTools)

## Error Handling

- [ ] Network disconnection shows friendly error (not white screen)
- [ ] Server 500 error shows error page with navigation
- [ ] 404 page shows helpful message with link home
- [ ] Form submission failure preserves user input
- [ ] API timeout shows appropriate message
- [ ] Error boundary catches component crash (test with intentional error)

## Security Spot Checks

- [ ] Changing user ID in URL does not expose other users' data
- [ ] API responses do not include `passwordHash`
- [ ] Rate limiting blocks rapid login attempts (>10 in 1 minute)
- [ ] CORS rejects requests from unauthorized origins
- [ ] XSS attempt in form input is escaped on display

## Accessibility

- [ ] All forms are navigable with keyboard (Tab key)
- [ ] Modal traps focus and returns it on close
- [ ] Error messages are announced by screen reader (role="alert")
- [ ] Images have descriptive alt text
- [ ] Color contrast passes 4.5:1 ratio (check with axe DevTools)

---

**Tested by:** _________________ **Date:** _______________
**Version/Commit:** _________________
