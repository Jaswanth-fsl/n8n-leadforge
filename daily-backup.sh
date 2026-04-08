#!/bin/bash
# LeadForge AI - Daily Backup Script
# Usage: bash daily-backup.sh

DATE=$(date +%Y-%m-%d)
BACKUP_DIR="./backups"

echo "[1/3] Dumping PostgreSQL..."
"C:/Program Files/PostgreSQL/17/bin/pg_dump.exe" -U postgres -d n8n_dev -f $BACKUP_DIR/db.sql

echo "[2/3] Copying workflow JSONs..."
cp workflows/*.json $BACKUP_DIR/

echo "[3/3] Creating archive..."
tar -czf $BACKUP_DIR/leadforge-backup-$DATE.tar.gz -C $BACKUP_DIR db.sql *.json

echo "Backup complete: backups/leadforge-backup-$DATE.tar.gz"
