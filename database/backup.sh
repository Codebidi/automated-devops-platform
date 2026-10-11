#!/bin/sh
# backup.sh – dump the deployhub PostgreSQL database to a timestamped gzip file.
# Usage: ./database/backup.sh [output_dir]
# POSIX sh compatible.

set -eu

OUTPUT_DIR="${1:-./database/backups}"
TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M-%S")
FILENAME="deployhub_${TIMESTAMP}.sql.gz"
DEST="${OUTPUT_DIR}/${FILENAME}"

mkdir -p "$OUTPUT_DIR"

echo "Backing up deployhub database to ${DEST} ..."

docker compose exec -T db \
    pg_dump -U deployhub -d deployhub --clean --if-exists \
    | gzip > "$DEST"

SIZE=$(wc -c < "$DEST")
if [ "$SIZE" -lt 100 ]; then
    echo "ERROR: backup file is suspiciously small (${SIZE} bytes). Aborting." >&2
    rm -f "$DEST"
    exit 1
fi

echo "Backup complete: ${DEST} (${SIZE} bytes)"
