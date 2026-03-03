# Automatic Database Backup Setup

## Overview

Your SQLite database is automatically backed up with:
- ✅ **Timestamped backups** - Every time script runs
- ✅ **Daily backups** - One per day (no duplicates)
- ✅ **Compression** - Files older than 7 days are gzipped
- ✅ **30-day retention** - Older backups auto-deleted
- ✅ **Integrity checks** - Verifies backup is valid
- ✅ **No authentication needed** - Just copies the file

## Quick Setup

### Step 1: Test the Backup

```bash
cd "/home/baxterkrug/Documents/Card Catalog POS"
./scripts/backup_database.sh
```

You should see:
```
✓ Backup created: checkoutdesignator_20260302_225801.db
✓ Daily backup saved: checkoutdesignator_20260302.db
✓ Backup integrity verified
✅ Backup completed successfully!
```

Backups are saved in: `db_backups/` directory

### Step 2: Schedule Automatic Backups

**Option A: Multiple Times Daily (Recommended for Active Store)**

```bash
crontab -e
```

Add these lines:
```cron
# Backup database 4 times daily (opening, lunch, evening, closing)
0 8 * * * /home/baxterkrug/Documents/Card\ Catalog\ POS/scripts/backup_database.sh >> /home/baxterkrug/Documents/Card\ Catalog\ POS/db_backups/backup.log 2>&1
0 12 * * * /home/baxterkrug/Documents/Card\ Catalog\ POS/scripts/backup_database.sh >> /home/baxterkrug/Documents/Card\ Catalog\ POS/db_backups/backup.log 2>&1
0 18 * * * /home/baxterkrug/Documents/Card\ Catalog\ POS/scripts/backup_database.sh >> /home/baxterkrug/Documents/Card\ Catalog\ POS/db_backups/backup.log 2>&1
0 23 * * * /home/baxterkrug/Documents/Card\ Catalog\ POS/scripts/backup_database.sh >> /home/baxterkrug/Documents/Card\ Catalog\ POS/db_backups/backup.log 2>&1
```

**Option B: Hourly During Business Hours**

```cron
# Backup every hour from 8 AM to 11 PM
0 8-23 * * * /home/baxterkrug/Documents/Card\ Catalog\ POS/scripts/backup_database.sh >> /home/baxterkrug/Documents/Card\ Catalog\ POS/db_backups/backup.log 2>&1
```

**Option C: Just Daily at 8 AM**

```cron
# Backup once daily at 8 AM
0 8 * * * /home/baxterkrug/Documents/Card\ Catalog\ POS/scripts/backup_database.sh >> /home/baxterkrug/Documents/Card\ Catalog\ POS/db_backups/backup.log 2>&1
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 3: Verify Cron Job

```bash
# Check cron is scheduled
crontab -l | grep backup_database

# Wait for next scheduled time, then check log
tail -f /home/baxterkrug/Documents/Card\ Catalog\ POS/db_backups/backup.log
```

## Backup Strategy

### What Gets Backed Up

The script creates **3 types of backups**:

1. **Timestamped Backups** - `checkoutdesignator_YYYYMMDD_HHMMSS.db`
   - Created every time script runs
   - Includes date and time
   - Auto-compressed after 7 days (saves space)
   - Deleted after 30 days

2. **Daily Backups** - `daily/checkoutdesignator_YYYYMMDD.db`
   - One per day (first backup of the day)
   - Easier to find specific day
   - Also deleted after 30 days

3. **Latest Link** - `latest.db`
   - Always points to most recent backup
   - Easy to restore from

### Example Backup Directory

```
db_backups/
├── backup.log                           (backup history log)
├── latest.db                             (symlink to newest)
├── checkoutdesignator_20260302_080000.db
├── checkoutdesignator_20260302_120000.db
├── checkoutdesignator_20260302_180000.db
├── checkoutdesignator_20260302_230000.db
├── checkoutdesignator_20260301_080000.db.gz (compressed)
├── checkoutdesignator_20260301_120000.db.gz
└── daily/
    ├── checkoutdesignator_20260302.db
    ├── checkoutdesignator_20260301.db
    └── checkoutdesignator_20260228.db
```

## Restoring from Backup

### Quick Restore (Latest Backup)

```bash
cd "/home/baxterkrug/Documents/Card Catalog POS"

# Stop the backend first!
# Then restore:
cp db_backups/latest.db checkoutdesignator.db

# Restart backend
./start.sh
```

### Restore Specific Date

```bash
# List available backups
ls -lh db_backups/daily/

# Restore specific day
cp db_backups/daily/checkoutdesignator_20260301.db checkoutdesignator.db
```

### Restore Specific Time

```bash
# List all timestamped backups
ls -lh db_backups/checkoutdesignator_*.db*

# If compressed, decompress first
gunzip db_backups/checkoutdesignator_20260301_120000.db.gz

# Then restore
cp db_backups/checkoutdesignator_20260301_120000.db checkoutdesignator.db
```

## Network Backup (Optional)

### Option 1: Mount Network Share

1. Create mount point:
```bash
sudo mkdir -p /mnt/network_backup
```

2. Mount network drive (SMB/CIFS):
```bash
sudo mount -t cifs //192.168.1.100/backups /mnt/network_backup \
  -o username=your_user,password=your_pass
```

3. Make permanent by adding to `/etc/fstab`:
```bash
sudo nano /etc/fstab
# Add:
//192.168.1.100/backups /mnt/network_backup cifs username=your_user,password=your_pass,_netdev 0 0
```

4. The script will automatically copy backups there!

### Option 2: Sync to Another Computer via SSH

Add to script or separate cron job:
```bash
# After backup completes, sync to another computer
rsync -avz db_backups/ user@backup-computer:/path/to/backups/
```

### Option 3: Copy to USB Drive

```bash
# Mount USB drive, then:
cp -r db_backups/* /media/usb/cardcatalog_backups/
```

## Monitoring

### Check Backup Status

```bash
# View recent backups
ls -lht db_backups/ | head -10

# View backup log
tail -50 db_backups/backup.log

# Count backups
find db_backups -name "*.db*" | wc -l
```

### Check Disk Space

```bash
# Check database size
du -h checkoutdesignator.db

# Check backup directory size
du -sh db_backups/

# Check available disk space
df -h .
```

### Verify Backup Integrity

```bash
# Check a specific backup
sqlite3 db_backups/latest.db "PRAGMA integrity_check;"

# Should output: ok
```

## Advanced Options

### Change Retention Period

Edit `scripts/backup_database.sh`:

```bash
# Line with mtime +30 controls retention
# Change 30 to desired days:
find "$BACKUP_DIR" -name "checkoutdesignator_*.db*" -type f -mtime +60 -delete
```

### Disable Compression

Comment out the compression lines in script:
```bash
# find "$BACKUP_DIR" -name "checkoutdesignator_*.db" -type f -mtime +7 ! -name "*.gz" -exec gzip {} \; 2>/dev/null
```

### Backup to Multiple Locations

Add at end of script:
```bash
# Backup to multiple locations
cp "$BACKUP_FILE" /mnt/network_share/
cp "$BACKUP_FILE" /media/usb_drive/
cp "$BACKUP_FILE" ~/Dropbox/cardcatalog_backups/
```

## Combining with API Backups

You now have **two backup systems**:

1. **Database File Backup** (this guide)
   - ✅ Simple file copy
   - ✅ No authentication needed
   - ✅ Fast and reliable
   - ✅ Can run frequently (hourly)
   - ⚠️ Backs up entire database (can't select specific tables)

2. **API Export Backup** (from `daily_backup.sh`)
   - ✅ Exports to CSV/JSON/SQL
   - ✅ Easy to import to Excel/Access
   - ✅ Can export specific tables
   - ⚠️ Requires authentication
   - ⚠️ Backend must be running

**Recommended schedule:**
- **Database file backup**: Every 4 hours or hourly
- **API export backup**: Once daily at 8 AM

This gives you:
- Frequent protection (database file copies)
- Human-readable exports (CSV/JSON daily)

## Disaster Recovery

### Worst Case: Hard Drive Failure

If you lose your hard drive but have backups:

1. **Reinstall system** and Card Catalog POS
2. **Copy backup file**:
   ```bash
   cp /path/to/backup/checkoutdesignator_20260302.db checkoutdesignator.db
   ```
3. **Verify data**:
   ```bash
   sqlite3 checkoutdesignator.db "SELECT COUNT(*) FROM inventoryitem;"
   ```
4. **Start backend**: All data restored!

### Accidental Data Deletion

If someone deletes items by mistake:

1. **Stop backend immediately**
2. **Restore from latest backup** (before deletion)
3. **Verify restoration** by checking specific items
4. **Restart backend**

### Corrupted Database

If database gets corrupted (power failure, disk error):

```bash
# Try to recover
sqlite3 checkoutdesignator.db ".recover" | sqlite3 recovered.db

# If that fails, restore from backup
cp db_backups/latest.db checkoutdesignator.db
```

## Best Practices

✅ **Test restores monthly** - Make sure backups work!
✅ **Keep multiple backup locations** - Network + USB + Cloud
✅ **Monitor disk space** - Backups need room to grow
✅ **Check logs regularly** - Catch failures early
✅ **Document procedures** - Know how to restore before you need to
✅ **Version your backups** - 30-day retention gives you time

## Quick Commands Reference

```bash
# Run backup manually
./scripts/backup_database.sh

# List backups
ls -lh db_backups/

# Check latest backup
sqlite3 db_backups/latest.db "SELECT COUNT(*) FROM inventoryitem;"

# Restore from latest
cp db_backups/latest.db checkoutdesignator.db

# View backup log
tail db_backups/backup.log

# Schedule backups (edit cron)
crontab -e
```

## Support

For issues:
1. Check `db_backups/backup.log`
2. Verify script has execute permissions: `ls -l scripts/backup_database.sh`
3. Ensure disk space available: `df -h .`
4. Test manual backup: `./scripts/backup_database.sh`
