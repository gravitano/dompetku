#!/bin/sh
# Backup PostgreSQL harian → object storage S3-compatible (R2/B2) — ITA §4.1.
#
# Env yang dibutuhkan (dari deploy/.env.production, bukan dari repo):
#   PGHOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
#   S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
#   BACKUP_PREFIX (opsional, default: dompetku/prod)
#   BACKUP_RETENTION_DAYS (opsional, default: 14)
# Butuh: pg_dump, aws-cli.
set -eu

: "${PGHOST:?PGHOST wajib di-set}"
: "${POSTGRES_USER:?POSTGRES_USER wajib di-set}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD wajib di-set}"
: "${POSTGRES_DB:?POSTGRES_DB wajib di-set}"
: "${S3_ENDPOINT:?S3_ENDPOINT wajib di-set}"
: "${S3_BUCKET:?S3_BUCKET wajib di-set}"
: "${S3_ACCESS_KEY_ID:?S3_ACCESS_KEY_ID wajib di-set}"
: "${S3_SECRET_ACCESS_KEY:?S3_SECRET_ACCESS_KEY wajib di-set}"

PREFIX="${BACKUP_PREFIX:-dompetku/prod}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="/tmp/${POSTGRES_DB}-${TIMESTAMP}.dump"

export PGPASSWORD="$POSTGRES_PASSWORD"
export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"

cleanup() { rm -f "$FILE"; }
trap cleanup EXIT

echo "[backup] $(date -Iseconds) dump ${POSTGRES_DB}@${PGHOST}"
pg_dump -h "$PGHOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom --no-owner --no-privileges -f "$FILE"

echo "[backup] upload s3://${S3_BUCKET}/${PREFIX}/$(basename "$FILE")"
aws s3 cp "$FILE" "s3://${S3_BUCKET}/${PREFIX}/$(basename "$FILE")" \
  --endpoint-url "$S3_ENDPOINT" --only-show-errors

# Retensi: hapus backup lebih tua dari RETENTION_DAYS (berdasarkan nama file).
CUTOFF="$(date -d "@$(( $(date +%s) - RETENTION_DAYS * 86400 ))" +%Y%m%d 2>/dev/null || echo "")"
if [ -n "$CUTOFF" ]; then
  aws s3 ls "s3://${S3_BUCKET}/${PREFIX}/" --endpoint-url "$S3_ENDPOINT" |
    awk '{print $4}' |
    while read -r key; do
      day="$(echo "$key" | sed -n 's/.*-\([0-9]\{8\}\)-[0-9]\{6\}\.dump$/\1/p')"
      if [ -n "$day" ] && [ "$day" -lt "$CUTOFF" ]; then
        echo "[backup] hapus backup lama: $key"
        aws s3 rm "s3://${S3_BUCKET}/${PREFIX}/${key}" \
          --endpoint-url "$S3_ENDPOINT" --only-show-errors
      fi
    done
fi

echo "[backup] selesai"
