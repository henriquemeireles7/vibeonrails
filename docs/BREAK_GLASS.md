# Break Glass: Emergency Procedures

**Last Updated:** 2026-02-06
**Audience:** Anyone on the team who may need to respond to a production incident

This document contains step-by-step procedures for the most common production emergencies. Keep it bookmarked.

---

## 1. Application is Down

**Symptoms:** Users report the app is unreachable, monitoring alerts fire.

**Steps:**

1. Check hosting provider status page (Vercel/Railway/AWS status)
2. Check the health endpoint: `curl -s https://your-app.com/health`
3. If health fails, check deploy logs for recent deployments
4. If a recent deploy broke things, rollback (see Section 6)
5. If no recent deploy, check database connectivity (see Section 2)
6. If nothing obvious, restart the application

```bash
# Check health
curl -s https://your-app.com/health | jq .

# Check recent deploys (GitHub)
gh run list --limit 5

# Restart on Railway/Render (example)
# railway restart
# render restart <service-id>
```

---

## 2. Database is Unreachable

**Symptoms:** API returns 500 errors, health endpoint shows degraded.

**Steps:**

1. Check database provider status page (Supabase/Neon/RDS)
2. Test direct database connectivity:

```bash
psql $DATABASE_URL -c "SELECT 1;"
```

3. Check if connection pool is exhausted (too many connections):

```bash
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

4. If pool exhausted, restart the application to release connections
5. If database is truly down, wait for provider recovery or failover

---

## 3. Rollback a Deployment

**Symptoms:** Latest deploy broke something.

**Steps:**

```bash
# Option A: Revert the last commit and push
git revert HEAD --no-edit
git push origin main

# Option B: Deploy a specific known-good commit
git log --oneline -10                    # find the good commit
git checkout <good-commit-hash>
git push origin HEAD:main --force-with-lease

# Option C: Use hosting provider's rollback
# Vercel: vercel rollback
# Railway: railway rollback
```

**Target:** Rollback should complete in under 5 minutes.

---

## 4. Restore Database from Backup

**Symptoms:** Data was accidentally deleted or corrupted.

**Steps:**

```bash
# 1. List available backups
ls -la backups/

# 2. Create a backup of CURRENT state first (in case restore goes wrong)
./scripts/backup-db.sh

# 3. Restore from the backup
./scripts/restore-db.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz

# 4. Run any pending migrations
pnpm run db:migrate

# 5. Verify data
psql $DATABASE_URL -c "SELECT count(*) FROM users;"
```

---

## 5. Disable a Feature (Kill Switch)

**Symptoms:** A specific feature is causing problems (errors, performance, abuse).

**Steps:**

```bash
# Option A: Environment variable toggle
# Set the feature flag to false in your hosting provider's env config:
FEATURE_<NAME>_ENABLED=false

# Option B: If using a feature flags service, toggle the flag there

# Option C: Quick code-level disable
# Add to the relevant route/handler:
#   if (process.env.FEATURE_XYZ_ENABLED === 'false') {
#     return c.json({ error: 'Feature temporarily disabled' }, 503);
#   }
```

---

## 6. Ban/Suspend a User

**Symptoms:** Abusive user, compromised account, TOS violation.

**Steps:**

```bash
# 1. Identify the user
psql $DATABASE_URL -c "SELECT id, email, role FROM users WHERE email = 'abuser@example.com';"

# 2. Disable their account (update role to 'banned' or set a flag)
psql $DATABASE_URL -c "UPDATE users SET role = 'banned', updated_at = NOW() WHERE email = 'abuser@example.com';"

# 3. Invalidate their sessions (if using Redis session store)
# redis-cli DEL "session:<session-id>"

# 4. If using JWT: their tokens will expire naturally (15min default)
# For immediate revocation, add their user ID to a blocklist
```

---

## 7. Payment/Stripe Emergency

**Symptoms:** Webhook failures, double charges, missing access.

**Steps:**

```bash
# 1. Check Stripe Dashboard for failed webhooks
# https://dashboard.stripe.com/webhooks

# 2. Check webhook endpoint logs
# Look for failed deliveries and retry manually from Stripe Dashboard

# 3. If double-charge occurred:
#    - Refund via Stripe Dashboard immediately
#    - Investigate webhook idempotency store

# 4. If user paid but has no access:
#    - Verify subscription status in Stripe Dashboard
#    - Manually grant access in your database
psql $DATABASE_URL -c "UPDATE subscriptions SET status = 'active' WHERE customer_email = 'user@example.com';"

# 5. If webhooks are completely broken:
#    - Check the webhook signing secret matches
#    - Verify the webhook URL is reachable
curl -X POST https://your-app.com/webhooks/stripe -d '{}' -H "Content-Type: application/json"
```

---

## 8. Suspected Security Breach

**Symptoms:** Unauthorized access, data exfiltration, unusual activity.

**Steps:**

1. **Rotate all secrets immediately:**

```bash
# Generate new JWT secret, API keys, database passwords
# Update in your hosting provider's secret management
# Redeploy the application
```

2. **Revoke all active sessions:**

```bash
# If using Redis: FLUSHDB on the session store
# If using JWT: change JWT_SECRET forces all tokens invalid
```

3. **Review access logs:**

```bash
# Check application logs for unusual patterns
# Look for: unexpected IP addresses, mass data access, admin endpoint hits
```

4. **Assess scope of breach:**
   - What data was accessed?
   - How many users affected?
   - What was the entry point?

5. **Notify affected users** (required by LGPD/GDPR within 72 hours)
6. **Document the incident** for post-mortem

---

## Contact List

| Role | Name | Contact |
|------|------|---------|
| Lead Developer | [NAME] | [PHONE/EMAIL] |
| DevOps/Infra | [NAME] | [PHONE/EMAIL] |
| Stripe Support | Stripe | support.stripe.com |
| Hosting Provider | [PROVIDER] | [STATUS PAGE URL] |
| Database Provider | [PROVIDER] | [STATUS PAGE URL] |

---

## Post-Incident

After every incident:

1. Write a brief post-mortem (what happened, timeline, root cause, fix, prevention)
2. Update this document if procedures need improvement
3. Create tickets for any follow-up work
4. Share learnings with the team
