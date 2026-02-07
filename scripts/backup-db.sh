#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Database Backup Script
#
# Creates a compressed PostgreSQL backup with timestamped filename.
# Designed for cron jobs or manual execution.
#
# Prerequisites:
#   - pg_dump installed (comes with PostgreSQL client)
#   - DATABASE_URL environment variable set
#
# Usage:
#   ./scripts/backup-db.sh                     # backup to ./backups/
#   BACKUP_DIR=/mnt/backups ./scripts/backup-db.sh  # custom directory
#   DATABASE_URL=postgres://... ./scripts/backup-db.sh
#
# Cron example (daily at 2 AM):
#   0 2 * * * cd /app && ./scripts/backup-db.sh >> /var/log/backup.log 2>&1
#
# Retention: keeps the last 30 backups by default (override with BACKUP_RETENTION)
# ---------------------------------------------------------------------------

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION="${BACKUP_RETENTION:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "  Example: export DATABASE_URL=postgresql://user:pass@localhost:5432/myapp"
  exit 1
fi

if ! command -v pg_dump &> /dev/null; then
  echo "ERROR: pg_dump is not installed."
  echo "  Install: brew install postgresql (macOS) or apt install postgresql-client (Linux)"
  exit 1
fi

# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------

mkdir -p "${BACKUP_DIR}"

echo "[$(date -Iseconds)] Starting database backup..."
echo "  Target: ${BACKUP_FILE}"

pg_dump "${DATABASE_URL}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  | gzip > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ---------------------------------------------------------------------------
# Retention (delete old backups)
# ---------------------------------------------------------------------------

BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f | wc -l | tr -d ' ')

if [ "${BACKUP_COUNT}" -gt "${BACKUP_RETENTION}" ]; then
  EXCESS=$((BACKUP_COUNT - BACKUP_RETENTION))
  echo "[$(date -Iseconds)] Pruning ${EXCESS} old backup(s) (retention: ${BACKUP_RETENTION})..."

  find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f \
    | sort \
    | head -n "${EXCESS}" \
    | xargs rm -f

  echo "[$(date -Iseconds)] Pruning complete."
fi

echo "[$(date -Iseconds)] Backup pipeline finished successfully."
