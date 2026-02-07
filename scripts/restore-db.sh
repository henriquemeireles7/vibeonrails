#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Database Restore Script
#
# Restores a PostgreSQL database from a compressed backup file.
# Includes safety checks to prevent accidental production restores.
#
# Prerequisites:
#   - psql installed (comes with PostgreSQL client)
#   - DATABASE_URL environment variable set
#   - A backup file created by backup-db.sh
#
# Usage:
#   ./scripts/restore-db.sh backups/backup_20260206_020000.sql.gz
#   DATABASE_URL=postgres://... ./scripts/restore-db.sh path/to/backup.sql.gz
#
# WARNING: This script will DROP and RECREATE tables. All existing data
# in the target database will be replaced with the backup contents.
# ---------------------------------------------------------------------------

set -euo pipefail

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo ""
  echo "Example:"
  echo "  $0 backups/backup_20260206_020000.sql.gz"
  echo ""
  echo "Available backups:"
  find ./backups -name "backup_*.sql.gz" -type f 2>/dev/null | sort -r | head -10 || echo "  (none found in ./backups/)"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "  Example: export DATABASE_URL=postgresql://user:pass@localhost:5432/myapp"
  exit 1
fi

if ! command -v psql &> /dev/null; then
  echo "ERROR: psql is not installed."
  echo "  Install: brew install postgresql (macOS) or apt install postgresql-client (Linux)"
  exit 1
fi

# ---------------------------------------------------------------------------
# Safety Check
# ---------------------------------------------------------------------------

# Warn if restoring to a production-looking database
if echo "${DATABASE_URL}" | grep -qiE '(production|prod|\.rds\.|\.supabase\.)'; then
  echo ""
  echo "  *** WARNING: DATABASE_URL appears to point to a PRODUCTION database! ***"
  echo ""
fi

echo "=== Database Restore ==="
echo "  Backup:   ${BACKUP_FILE}"
echo "  Target:   (from DATABASE_URL)"
echo "  Size:     $(du -h "${BACKUP_FILE}" | cut -f1)"
echo ""
echo "  This will DROP existing tables and replace all data."
echo ""
read -p "  Are you sure? Type 'yes' to proceed: " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# ---------------------------------------------------------------------------
# Restore
# ---------------------------------------------------------------------------

echo "[$(date -Iseconds)] Starting database restore from: ${BACKUP_FILE}"

gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}" --quiet --set ON_ERROR_STOP=on

echo "[$(date -Iseconds)] Restore complete."
echo ""
echo "Next steps:"
echo "  1. Verify the data: psql \$DATABASE_URL -c 'SELECT count(*) FROM users;'"
echo "  2. Run pending migrations: pnpm run db:migrate"
echo "  3. Test the application"
