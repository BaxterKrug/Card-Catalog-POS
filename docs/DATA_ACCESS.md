# Data Access Guide - Card Catalog POS

## Overview
Your Card Catalog POS system stores all data in a PostgreSQL database. This guide explains how to access your data from anywhere.

## 🔐 Authentication Required
All backup/export endpoints require **Owner** level access with a valid JWT token.

---

## 📊 Available Export Formats

### 1. CSV Export (Best for Excel/Google Sheets)

**Export Single Table:**
```
GET /api/backup/export/csv/{table_name}
```

Available tables:
- `customers` - Customer information with contact details
- `orders` - All sales orders
- `order_items` - Line items for each order
- `order_payments` - Payment records
- `inventory` - Product catalog with pricing and stock
- `inventory_adjustments` - Stock movement history
- `preorder_items` - Pre-order product listings
- `preorder_orders` - Customer pre-order groups
- `preorder_claims` - Individual pre-order claims
- `buylist_transactions` - Buylist purchases from customers
- `checklist_templates` - Store procedure templates
- `checklist_completions` - Employee completion history
- `users` - Staff accounts

**Example:** `GET /api/backup/export/csv/customers`
Returns: `customers_20260302_143022.csv`

**Export All Tables (ZIP):**
```
GET /api/backup/export/all-csv
```
Returns: `cardcatalog_backup_20260302_143022.zip` containing all tables as CSV files

### 2. JSON Export (Best for Programmatic Access)

```
GET /api/backup/export/json
```
Returns: Complete database dump as JSON with all tables and relationships
- Easy to parse with any programming language
- Includes metadata like export timestamp
- Perfect for custom integrations

### 3. SQL Dump (Best for Database Migration)

```
GET /api/backup/export/sql
```
Returns: PostgreSQL-compatible SQL INSERT statements
- Can be imported into PostgreSQL, MySQL, SQLite
- **Compatible with Microsoft Access** (may need minor syntax adjustments)
- Preserves data types and relationships

### 4. Database Info

```
GET /api/backup/info
```
Returns: Record counts and column names for all tables
- Check data size before exporting
- Verify what data you have

---

## 💻 How to Access from Other Computers

### Option 1: Network Database Access (Real-time)

**Setup PostgreSQL for Network Access:**

1. Find your server's IP address:
   ```bash
   hostname -I
   ```

2. Edit PostgreSQL config to allow network connections:
   ```bash
   sudo nano /etc/postgresql/*/main/postgresql.conf
   ```
   Change: `listen_addresses = 'localhost'` to `listen_addresses = '*'`

3. Edit pg_hba.conf to allow your network:
   ```bash
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   ```
   Add: `host    all    all    192.168.1.0/24    md5`
   (Replace with your network range)

4. Restart PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

5. Connect from other computers using:
   - **Host:** Your server's IP (e.g., 192.168.1.100)
   - **Port:** 5432
   - **Database:** checkoutdesignator_db
   - **Username:** Your PostgreSQL user
   - **Password:** Your PostgreSQL password

**Recommended Tools:**
- **DBeaver** (Free, works on Windows/Mac/Linux)
- **pgAdmin** (Official PostgreSQL GUI)
- **DataGrip** (JetBrains, paid)
- **Microsoft Access** (via ODBC driver)

### Option 2: API Access via Backend (Recommended)

Your backend already runs on the network. From any computer:

1. Start the backend on your main computer:
   ```bash
   cd "/home/baxterkrug/Documents/Card Catalog POS"
   ./start.sh
   ```

2. From other computers, access via browser:
   ```
   http://YOUR_SERVER_IP:8000/api/backup/export/all-csv
   ```
   (Replace YOUR_SERVER_IP with your server's local IP)

3. Or use curl/wget:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://YOUR_SERVER_IP:8000/api/backup/export/all-csv \
     -o backup.zip
   ```

### Option 3: Scheduled Backups to Shared Folder

Create a script to automatically export data to a network share:

```bash
#!/bin/bash
# save as: /home/baxterkrug/backup_to_network.sh

# Set variables
SERVER="http://localhost:8000"
TOKEN="YOUR_JWT_TOKEN_HERE"
BACKUP_DIR="/mnt/network_share/cardcatalog_backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Export all CSV files
curl -H "Authorization: Bearer $TOKEN" \
  "$SERVER/api/backup/export/all-csv" \
  -o "$BACKUP_DIR/backup_$DATE.zip"

# Export JSON
curl -H "Authorization: Bearer $TOKEN" \
  "$SERVER/api/backup/export/json" \
  -o "$BACKUP_DIR/backup_$DATE.json"

# Export SQL
curl -H "Authorization: Bearer $TOKEN" \
  "$SERVER/api/backup/export/sql" \
  -o "$BACKUP_DIR/backup_$DATE.sql"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "backup_*.zip" -mtime +30 -delete
find "$BACKUP_DIR" -name "backup_*.json" -mtime +30 -delete
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Run daily with cron:
```bash
crontab -e
# Add: 0 2 * * * /home/baxterkrug/backup_to_network.sh
```

---

## ☁️ Google Drive Sync

### Automatic Backup to Google Drive

1. Install Google Drive API library:
   ```bash
   pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
   ```

2. Set up Google Cloud Project:
   - Go to https://console.cloud.google.com
   - Create new project "Card Catalog Backups"
   - Enable Google Drive API
   - Create OAuth 2.0 credentials
   - Download credentials.json

3. Run the Google Drive sync script (to be created):
   ```bash
   python scripts/sync_to_google_drive.py
   ```

**Coming soon:** Automatic nightly backups to Google Drive folder

---

## 📱 Import to Microsoft Access

1. Export SQL dump:
   ```
   GET /api/backup/export/sql
   ```

2. In Access:
   - Create new blank database
   - Go to External Data → ODBC Database → Link
   - Choose "PostgreSQL Unicode"
   - Enter your server connection details
   - Select tables to import

Or import CSV files:
1. Download all CSVs (ZIP)
2. In Access: External Data → Text File → Import
3. Select each CSV file and follow wizard

---

## 🔒 Security Notes

- **JWT Tokens expire after 8 hours** - re-login if needed
- **Only owners can export data** - protects sensitive information
- **Use HTTPS in production** - encrypt data in transit
- **Backup regularly** - automate with cron jobs
- **Store backups securely** - encrypted drives recommended

---

## 📞 Quick Reference

| Need | Endpoint | Format |
|------|----------|--------|
| Excel analysis | `/api/backup/export/all-csv` | ZIP of CSVs |
| Single table | `/api/backup/export/csv/customers` | CSV |
| Database migration | `/api/backup/export/sql` | SQL |
| Custom integration | `/api/backup/export/json` | JSON |
| Check data size | `/api/backup/info` | JSON |

---

## 🆘 Troubleshooting

**"Owner access required" error:**
- Login with owner account to get fresh JWT token
- Token is in response after POST /api/users/login

**Network access not working:**
- Check firewall allows port 5432 (PostgreSQL) and 8000 (API)
- Verify server IP address is correct
- Ensure backend is running

**Export taking too long:**
- Export single tables instead of all at once
- Run during off-hours if database is large
- Consider setting up read replica for reporting

---

For additional help, see the full API documentation at http://localhost:8000/docs
