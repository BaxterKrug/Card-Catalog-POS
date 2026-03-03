#!/bin/bash
#
# SQLite Database File Backup Script
# Automatically backs up the database file daily
# No authentication needed - just copies the file
#

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_FILE="$PROJECT_DIR/checkoutdesignator.db"
BACKUP_DIR="$PROJECT_DIR/db_backups"
DATE=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "SQLite Database Backup"
echo "Time: $(date)"
echo "=========================================="

# Check if database file exists
if [ ! -f "$DB_FILE" ]; then
    echo "ERROR: Database file not found at $DB_FILE"
    exit 1
fi

# Get database size
DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
echo "Database size: $DB_SIZE"

# Create timestamped backup
BACKUP_FILE="$BACKUP_DIR/checkoutdesignator_${DATE}.db"
echo "Creating backup..."
cp "$DB_FILE" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✓ Backup created: checkoutdesignator_${DATE}.db"
else
    echo "✗ Backup failed!"
    exit 1
fi

# Create a "latest" symlink for easy access
ln -sf "checkoutdesignator_${DATE}.db" "$BACKUP_DIR/latest.db"
echo "✓ Latest backup link updated"

# Also create a daily backup (only one per day)
DAILY_BACKUP="$BACKUP_DIR/daily/checkoutdesignator_${DATE_ONLY}.db"
mkdir -p "$BACKUP_DIR/daily"
if [ ! -f "$DAILY_BACKUP" ]; then
    cp "$DB_FILE" "$DAILY_BACKUP"
    echo "✓ Daily backup saved: checkoutdesignator_${DATE_ONLY}.db"
fi

# Optional: Compress older backups (files older than 7 days)
echo ""
echo "Compressing old backups..."
find "$BACKUP_DIR" -name "checkoutdesignator_*.db" -type f -mtime +7 ! -name "*.gz" -exec gzip {} \; 2>/dev/null
echo "✓ Old backups compressed"

# Cleanup: Delete backups older than 30 days (including compressed)
echo ""
echo "Cleaning up old backups (keeping last 30 days)..."
find "$BACKUP_DIR" -name "checkoutdesignator_*.db*" -type f -mtime +30 -delete 2>/dev/null
find "$BACKUP_DIR/daily" -name "checkoutdesignator_*.db" -type f -mtime +30 -delete 2>/dev/null

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "checkoutdesignator_*.db*" -type f | wc -l)
DAILY_COUNT=$(find "$BACKUP_DIR/daily" -name "checkoutdesignator_*.db" -type f | wc -l)

echo "✓ Cleanup complete"
echo ""
echo "=========================================="
echo "Backup Summary:"
echo "  - Location: $BACKUP_DIR"
echo "  - Timestamped backups: $BACKUP_COUNT"
echo "  - Daily backups: $DAILY_COUNT"
echo "  - Latest: $BACKUP_DIR/latest.db"
echo "=========================================="

# Optional: Copy to network share if mounted
NETWORK_BACKUP="/mnt/network_backup"
if [ -d "$NETWORK_BACKUP" ]; then
    echo ""
    echo "Copying to network share..."
    cp "$BACKUP_FILE" "$NETWORK_BACKUP/"
    cp "$DAILY_BACKUP" "$NETWORK_BACKUP/daily/" 2>/dev/null
    echo "✓ Copied to $NETWORK_BACKUP"
fi

# Optional: Verify backup integrity
echo ""
echo "Verifying backup integrity..."
if sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "✓ Backup integrity verified"
else
    echo "⚠ Backup integrity check failed!"
    exit 1
fi

echo ""
echo "✅ Backup completed successfully!"
