# Quick Start Guide - Card Catalog POS

**Get up and running in 10 minutes!**

## Prerequisites

- Linux, macOS, or Windows with WSL
- Python 3.11+ installed
- Node.js 18+ installed

## Installation Steps

### 1. Navigate to Project
```bash
cd "/home/baxterkrug/Documents/Card Catalog POS"
```

### 2. Set Up Python Environment
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 4. Initialize Database
```bash
checkout-designator init-db
```

### 5. Run Migrations
```bash
python scripts/migrate_add_checklist.py
python scripts/migrate_add_customer_fields.py
python scripts/migrate_add_payments.py
python scripts/migrate_add_preorder_orders.py
python scripts/migrate_preorder_enhancements.py
```

### 6. Seed Initial Data
```bash
python scripts/seed_default_customer.py
python scripts/seed_singles_item.py
python scripts/seed_staff.py
```

### 7. Start the Application
```bash
chmod +x start.sh
./start.sh
```

## Access the System

**Open your browser to:** http://localhost:5173

**Log in with:**
- Username: `cayle`
- Password: `dev123`

**⚠️ Change your password immediately after first login!**

## Next Steps

✅ **You're all set!** The system is running with:
- 8 staff accounts (see output from seed_staff.py)
- Default "Walk-in Customer" account
- "Singles" inventory item
- Daily checklist templates

**Now you should:**

1. **Change all passwords** - Settings → Change Password
2. **Add your products** - Inventory → Add Item
3. **Add your customers** - Customers → Add Customer
4. **Set up backups** - See [DATABASE_BACKUP.md](docs/DATABASE_BACKUP.md)

## Complete Documentation

For detailed setup, configuration, and daily operations:

👉 **[See SETUP.md](docs/SETUP.md)**

## Common Commands

**Start the system:**
```bash
source .venv/bin/activate
./start.sh
```

**Stop the system:**
- Press `Ctrl+C` in terminal

**Backup database:**
```bash
./scripts/backup_database.sh
```

**Add a user:**
```bash
source .venv/bin/activate
checkout-designator users add --name "Name" --username "user" --password "temp123" --role employee
```

## Need Help?

- **Full setup guide**: [SETUP.md](docs/SETUP.md)
- **Troubleshooting**: [SETUP.md - Troubleshooting](docs/SETUP.md#troubleshooting)
- **API docs**: http://localhost:8000/api/docs
- **GitHub Issues**: https://github.com/BaxterKrug/Card-Catalog-POS/issues

---

**Built by SK R&D for SK Games** 🎮
