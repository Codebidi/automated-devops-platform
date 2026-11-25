#!/bin/sh
# restore.sh – restore deployhub PostgreSQL from a .sql.gz backup file.
# Usage: ./database/restore.sh <backup.sql.gz>
# POSIX sh compatible.
# WARNING: This REPLACES all data in the database.

set -eu

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup.sql.gz>" 1>&2
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: File not found: ${BACKUP_FILE}" >&2
    exit 1
fi

echo ""
echo "WARNING: This will REPLACE all data in the deployhub database."
echo "Backup file: ${BACKUP_FILE}"
echo ""
printf "Type YES to continue: "
read -r CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Aborted." >&2
    exit 1
fi

echo "Restoring from ${BACKUP_FILE} ..."

gunzip -c "$BACKUP_FILE" \
    | docker compose exec -T db \
        psql -U deployhub -d deployhub \
        -v ON_ERROR_STOP=1

echo "Restore complete."
