#!/bin/bash
#
# Daily Database Backup Script
# Runs at 8:00 AM daily (same time as checklist reset)
# Exports database to multiple formats and stores in backup directory
#

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)
API_URL="http://localhost:8000"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "Card Catalog POS - Daily Backup"
echo "Time: $(date)"
echo "=========================================="

# Check if backend is running
if ! curl -s "$API_URL/api/health" > /dev/null 2>&1; then
    echo "ERROR: Backend is not running at $API_URL"
    echo "Please start the backend with: cd '$PROJECT_DIR' && ./start.sh"
    exit 1
fi

# Get owner JWT token (requires manual setup or stored token)
# For automation, store token in environment variable or secure file
if [ -z "$CARDCATALOG_BACKUP_TOKEN" ]; then
    echo "ERROR: CARDCATALOG_BACKUP_TOKEN environment variable not set"
    echo ""
    echo "To set up automated backups:"
    echo "1. Login as owner and get JWT token"
    echo "2. Add to your ~/.bashrc or ~/.profile:"
    echo "   export CARDCATALOG_BACKUP_TOKEN='your_jwt_token_here'"
    echo "3. Or create a secure token file at: $PROJECT_DIR/.backup_token"
    exit 1
fi

TOKEN="$CARDCATALOG_BACKUP_TOKEN"

# Alternative: Read from secure file
if [ -f "$PROJECT_DIR/.backup_token" ]; then
    TOKEN=$(cat "$PROJECT_DIR/.backup_token")
fi

echo "Exporting database..."

# Export all tables as CSV (ZIP)
echo "  - Creating CSV export..."
curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/backup/export/all-csv" \
    -o "$BACKUP_DIR/backup_${DATE}.zip"

if [ $? -eq 0 ] && [ -f "$BACKUP_DIR/backup_${DATE}.zip" ]; then
    SIZE=$(du -h "$BACKUP_DIR/backup_${DATE}.zip" | cut -f1)
    echo "    ✓ CSV export saved: backup_${DATE}.zip ($SIZE)"
else
    echo "    ✗ CSV export failed"
fi

# Export as JSON
echo "  - Creating JSON export..."
curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/backup/export/json" \
    -o "$BACKUP_DIR/backup_${DATE}.json"

if [ $? -eq 0 ] && [ -f "$BACKUP_DIR/backup_${DATE}.json" ]; then
    SIZE=$(du -h "$BACKUP_DIR/backup_${DATE}.json" | cut -f1)
    echo "    ✓ JSON export saved: backup_${DATE}.json ($SIZE)"
else
    echo "    ✗ JSON export failed"
fi

# Export as SQL
echo "  - Creating SQL export..."
curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/backup/export/sql" \
    -o "$BACKUP_DIR/backup_${DATE}.sql"

if [ $? -eq 0 ] && [ -f "$BACKUP_DIR/backup_${DATE}.sql" ]; then
    SIZE=$(du -h "$BACKUP_DIR/backup_${DATE}.sql" | cut -f1)
    echo "    ✓ SQL export saved: backup_${DATE}.sql ($SIZE)"
else
    echo "    ✗ SQL export failed"
fi

# Get backup info
echo ""
echo "Database Statistics:"
curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/backup/info" | python3 -m json.tool | grep -E "(total_records|record_count)" | head -20

# Cleanup old backups (keep last 30 days)
echo ""
echo "Cleaning up old backups (keeping last 30 days)..."
find "$BACKUP_DIR" -name "backup_*.zip" -mtime +30 -delete
find "$BACKUP_DIR" -name "backup_*.json" -mtime +30 -delete
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +30 -delete

REMAINING=$(find "$BACKUP_DIR" -name "backup_*.zip" | wc -l)
echo "  ✓ Cleanup complete. $REMAINING backup sets remaining."

echo ""
echo "=========================================="
echo "Backup Complete!"
echo "Location: $BACKUP_DIR"
echo "=========================================="
