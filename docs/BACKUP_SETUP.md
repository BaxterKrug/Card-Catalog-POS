# Database Backup Setup

> **⚠️ This document is deprecated. See [DATABASE_BACKUP.md](DATABASE_BACKUP.md) for the complete backup guide.**

## Quick Setup (5 Minutes)

The system includes two backup methods:

### Method 1: File-Based Backup (Recommended - No Auth Required)

**This is the easiest and most reliable method.**

1. **Test the backup:**
   ```bash
   cd "/home/baxterkrug/Documents/Card Catalog POS"
   ./scripts/backup_database.sh
   ```

2. **Schedule automatic backups:**
   ```bash
   crontab -e
   ```
   
   Add this line (backs up 4 times daily):
   ```cron
   0 8,12,18,23 * * * /home/baxterkrug/Documents/Card\ Catalog\ POS/scripts/backup_database.sh >> /home/baxterkrug/Documents/Card\ Catalog\ POS/db_backups/backup.log 2>&1
   ```

3. **Done!** Your database is now backed up automatically.

**See [DATABASE_BACKUP.md](DATABASE_BACKUP.md) for:**
- Restoring from backups
- Network/cloud backup setup
- Retention policy configuration
- Disaster recovery procedures

### Method 2: API-Based Backup (Advanced - Requires Auth)
./scripts/daily_backup.sh
```

You should see:
```
==========================================
Card Catalog POS - Daily Backup
Time: Sun Mar  2 08:00:00 AM PST 2026
==========================================
Exporting database...
  - Creating CSV export...
    ✓ CSV export saved: backup_20260302_080000.zip (124K)
  - Creating JSON export...

**This method exports via the API and requires authentication.**

Only use this if you need:
- CSV exports for Excel/Google Sheets
- JSON exports for external processing
- SQL exports for PostgreSQL import

**Setup:**

1. Get your JWT token:
   - Log in as owner
   - Open browser console (F12)
   - Go to Application → Local Storage
   - Copy the token value

2. Store the token:
   ```bash
   cd "/home/baxterkrug/Documents/Card Catalog POS"
   echo 'your_token_here' > .backup_token
   chmod 600 .backup_token
   ```

3. Schedule the API backup:
   ```bash
   crontab -e
   ```
   
   Add:
   ```cron
   0 8 * * * /home/baxterkrug/Documents/Card\ Catalog\ POS/scripts/daily_backup.sh >> /home/baxterkrug/Documents/Card\ Catalog\ POS/backups/backup.log 2>&1
   ```

**Note**: JWT tokens expire, so you'll need to update the token periodically.

---

## Complete Documentation

👉 **[See DATABASE_BACKUP.md for complete backup documentation](DATABASE_BACKUP.md)**

Including:
- Backup strategy and retention
- Restoring from backups
- Network and cloud backup setup
- Disaster recovery procedures
- Troubleshooting
- Best practices

---

**Last Updated**: March 2, 2026
