# Card Catalog POS - Complete Setup Guide

> **Modern point-of-sale and inventory management system for SK Games**
> Built by SK R&D

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Initial Installation](#initial-installation)
3. [First-Time Setup](#first-time-setup)
4. [Adding Staff Users](#adding-staff-users)
5. [Adding Products (Inventory)](#adding-products-inventory)
6. [Adding Customers](#adding-customers)
7. [System Configuration](#system-configuration)
8. [Daily Operations](#daily-operations)
9. [Backup Setup](#backup-setup)
10. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Hardware
- **Minimum**: Dual-core processor, 4GB RAM, 10GB disk space
- **Recommended**: Quad-core processor, 8GB RAM, 20GB+ disk space
- Network connection (for multi-register setup)

### Software
- **Operating System**: Linux (Ubuntu 20.04+), macOS 10.15+, or Windows 10+ with WSL
- **Python**: Version 3.11 or higher
- **Node.js**: Version 18 or higher
- **Browser**: Chrome, Firefox, Safari, or Edge (latest version)

### Optional Hardware
- Barcode scanner (USB HID scanner recommended)
- Receipt printer (ESC/POS compatible)
- Cash drawer
- Label printer (for product labels)

---

## Initial Installation

### Step 1: Install Python (if not already installed)

**Linux/Ubuntu:**
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip
```

**macOS (using Homebrew):**
```bash
brew install python@3.11
```

**Windows (WSL):**
```bash
# Install WSL first, then follow Linux instructions
wsl --install
```

### Step 2: Install Node.js

**Linux/Ubuntu:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs
```

**macOS:**
```bash
brew install node
```

**Verify installation:**
```bash
node --version  # Should show v18.x or higher
npm --version   # Should show 9.x or higher
```

### Step 3: Clone or Extract the Project

```bash
cd ~/Documents
# If you have the folder already, skip to next step
# If cloning from git:
git clone https://github.com/BaxterKrug/Card-Catalog-POS.git
cd "Card Catalog POS"
```

### Step 4: Set Up Python Virtual Environment

```bash
cd "/home/baxterkrug/Documents/Card Catalog POS"

# Create virtual environment
python3.11 -m venv .venv

# Activate it
source .venv/bin/activate

# You should see (.venv) in your prompt now
```

### Step 5: Install Python Dependencies

```bash
# Install the backend application
pip install -e ".[dev]"

# This installs:
# - FastAPI (web framework)
# - SQLModel (database)
# - JWT authentication
# - All other backend dependencies
```

### Step 6: Install Frontend Dependencies

```bash
cd frontend
npm install

# This installs:
# - React framework
# - TanStack Query (data fetching)
# - Tailwind CSS (styling)
# - All other frontend dependencies

cd ..
```

---

## First-Time Setup

### Step 1: Initialize the Database

```bash
# Make sure you're in the project root and virtual environment is active
cd "/home/baxterkrug/Documents/Card Catalog POS"
source .venv/bin/activate

# Initialize database tables
checkout-designator init-db
```

**Output should be:**
```
✅ Database initialized successfully
```

This creates `checkoutdesignator.db` in your project folder.

### Step 2: Run Database Migrations

```bash
# Add checklist system
python scripts/migrate_add_checklist.py

# Add customer fields (phone, email, etc.)
python scripts/migrate_add_customer_fields.py

# Add payment tracking
python scripts/migrate_add_payments.py

# Add pre-order system
python scripts/migrate_add_preorder_orders.py
python scripts/migrate_preorder_enhancements.py
```

Each should output: `✅ Migration complete!`

### Step 3: Seed Default Data

```bash
# Create default "Walk-in Customer" account
python scripts/seed_default_customer.py

# Create the "Singles" inventory item for loose cards
python scripts/seed_singles_item.py
```

### Step 4: Create Staff Accounts

**Option A: Use the seed script (quick setup)**
```bash
python scripts/seed_staff.py
```

This creates default accounts:
- **cayle** / dev123 (Owner)
- **baxter** / dev123 (Owner)
- **ian** / dev123 (Owner)
- **brendan** / dev123 (Manager)
- **rick** / dev123 (Manager)
- **tony** / dev123 (Employee)
- **taft** / dev123 (Employee)
- **gabriel** / dev123 (Employee)

**Option B: Create users manually** (see [Adding Staff Users](#adding-staff-users) section below)

### Step 5: Start the Application

```bash
# Make start script executable (first time only)
chmod +x start.sh

# Start both backend and frontend
./start.sh
```

**You should see:**
```
🚀 Starting CheckoutDesignator...

📦 Starting backend server (http://0.0.0.0:8000)...
🎨 Starting frontend dev server (http://0.0.0.0:5173)...

✅ Both servers started!

Backend:  http://localhost:8000
API Docs: http://localhost:8000/api/docs
Frontend: http://localhost:5173

Press Ctrl+C to stop both servers.
```

### Step 6: Access the System

1. **Open your browser** to: http://localhost:5173
2. **Log in** with one of the staff accounts (e.g., `cayle` / `dev123`)
3. **Change your password** immediately (Settings → Change Password)

🎉 **Setup complete!** You're now ready to configure the system.

---

## Adding Staff Users

### User Roles

The system has three permission levels:

| Role | Permissions |
|------|-------------|
| **Owner** | Full access: financials, reports, user management, all operations |
| **Manager** | Most operations: inventory, orders, customers (no financial reports or user management) |
| **Employee** | Daily operations: process sales, accept pre-orders, customer lookup |

### Method 1: Via Web Interface (Recommended)

1. **Log in as an Owner**
2. **Navigate to**: Settings → Users
3. **Click**: "Add User"
4. **Fill in**:
   - Name: Full name
   - Username: Login username (lowercase, no spaces)
   - Password: Temporary password (user should change on first login)
   - Role: Owner, Manager, or Employee
   - Title: Job title (optional, e.g., "Store Manager", "Sales Associate")
5. **Click**: "Create User"

### Method 2: Via Command Line

```bash
# Activate virtual environment
source .venv/bin/activate

# Create a user
checkout-designator users add \
  --name "John Smith" \
  --username "john" \
  --password "temporary123" \
  --role employee \
  --title "Sales Associate"
```

**Roles**: `owner`, `manager`, or `employee`

### Method 3: Via Python Script

Create a file `scripts/add_user.py`:

```python
from checkoutdesignator.database import init_db, session_scope
from checkoutdesignator.models import UserRole
from checkoutdesignator.schemas import UserCreate
from checkoutdesignator.services import users

def add_user():
    init_db()
    with session_scope() as session:
        user_data = UserCreate(
            name="John Smith",
            username="john",
            password="temporary123",
            role=UserRole.EMPLOYEE,
            title="Sales Associate"
        )
        user = users.create_user(session, user_data)
        print(f"✅ Created {user.name} ({user.username}) - {user.role.value}")

if __name__ == "__main__":
    add_user()
```

Run it:
```bash
python scripts/add_user.py
```

### Security Best Practices

✅ **DO:**
- Use unique usernames for each person
- Require strong passwords (8+ characters, mix of letters/numbers)
- Have users change their password on first login
- Review user list regularly
- Disable accounts for former employees

❌ **DON'T:**
- Share login credentials between staff
- Use "password" or "123456" as passwords
- Leave default passwords (like "dev123") in production
- Give everyone Owner access

---

## Adding Products (Inventory)

### Understanding Inventory Types

The system tracks two types of inventory:

1. **Standard Products** - Sealed products with SKUs
   - Example: Booster boxes, pre-constructed decks, sleeves
   - Tracked by: SKU, name, quantity, price, cost

2. **Singles** - Individual cards
   - Tracked in the special "Singles" inventory item
   - Each transaction updates the singles count
   - Useful for buylist and individual card sales

### Method 1: Via Web Interface (Recommended)

1. **Log in** as Owner or Manager
2. **Navigate to**: Inventory
3. **Click**: "Add Item" or "Receive Stock"
4. **Fill in the form**:

   **Required Fields:**
   - **SKU**: Product identifier (e.g., "MH3-DRAFT-BOX")
   - **Name**: Product name (e.g., "Modern Horizons 3 Draft Booster Box")
   - **Quantity**: How many units you're adding
   - **Unit Price**: Selling price in dollars (e.g., 129.99)

   **Optional Fields:**
   - **Acquisition Cost**: What you paid per unit (for profit tracking)
   - **Category**: Product type (sealed, singles, accessories, etc.)
   - **Game**: Magic, Pokemon, Flesh and Blood, etc.
   - **Set/Edition**: Card set name
   - **Notes**: Internal notes

5. **Click**: "Add Item" or "Receive"

### Method 2: Via Command Line

```bash
# Activate virtual environment
source .venv/bin/activate

# Add a new product
checkout-designator inventory upsert \
  --sku "MH3-DRAFT-BOX" \
  --name "Modern Horizons 3 Draft Booster Box" \
  --physical-quantity 6 \
  --unit-price-cents 12999 \
  --acquisition-cost-cents 9500

# Add another product
checkout-designator inventory upsert \
  --sku "DRAGON-SHIELD-BLACK" \
  --name "Dragon Shield Sleeves - Matte Black (100ct)" \
  --physical-quantity 50 \
  --unit-price-cents 1299 \
  --acquisition-cost-cents 750
```

**Note**: Prices are in cents (multiply dollars by 100)

### Method 3: Bulk Import via CSV

Create a CSV file `products.csv`:

```csv
sku,name,quantity,unit_price,acquisition_cost,category,game,set_name
MH3-DRAFT-BOX,Modern Horizons 3 Draft Booster Box,6,129.99,95.00,sealed,Magic: The Gathering,Modern Horizons 3
MH3-SET-BOX,Modern Horizons 3 Set Booster Box,4,159.99,115.00,sealed,Magic: The Gathering,Modern Horizons 3
DRAGON-BLACK,Dragon Shield Sleeves - Matte Black,50,12.99,7.50,accessories,Universal,
COMMANDER-DECK,Commander Masters Deck,8,44.99,30.00,sealed,Magic: The Gathering,Commander Masters
```

Then import it (requires custom script - create `scripts/import_products.py`):

```python
import csv
from checkoutdesignator.database import init_db, session_scope
from checkoutdesignator.models import InventoryItem

def import_products(csv_file):
    init_db()
    with session_scope() as session:
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                item = InventoryItem(
                    sku=row['sku'],
                    name=row['name'],
                    physical_quantity=int(row['quantity']),
                    allocated_quantity=0,
                    unit_price_cents=int(float(row['unit_price']) * 100),
                    acquisition_cost_cents=int(float(row['acquisition_cost']) * 100) if row['acquisition_cost'] else None,
                    category=row.get('category'),
                    game=row.get('game'),
                    set_name=row.get('set_name')
                )
                session.add(item)
                print(f"✅ Added {item.name}")
            
            session.commit()
            print(f"\n✅ Import complete!")

if __name__ == "__main__":
    import_products("products.csv")
```

Run it:
```bash
python scripts/import_products.py
```

### Receiving Stock

When you get new inventory:

1. **Navigate to**: Inventory
2. **Find the product** (or create new if it doesn't exist)
3. **Click**: "Receive Stock"
4. **Enter quantity** received
5. **Optional**: Update acquisition cost if price changed
6. **Click**: "Receive"

**What happens:**
- Physical quantity increases
- If there are pre-orders waiting, they're automatically allocated (FIFO)
- Transaction logged in adjustment history

### Using Barcode Scanners

1. **Configure scanner** to add "Enter" after each scan (HID keyboard mode)
2. **In Inventory page**: Click in the search box
3. **Scan product barcode** - it will auto-search
4. **Click the product** to view/edit

---

## Adding Customers

### Why Track Customers?

- **Pre-orders**: Customers can reserve products before they arrive
- **Store credit**: Track customer balances
- **Purchase history**: See what customers bought
- **Pickup tracking**: Manage order fulfillment
- **Marketing**: Export customer list for promotions

### Default Customer

The system includes a "Walk-in Customer" account (ID: 1) for:
- Cash sales without customer info
- Quick transactions
- Anonymous purchases

### Method 1: Via Web Interface (Recommended)

1. **Navigate to**: Customers
2. **Click**: "Add Customer"
3. **Fill in**:

   **Required:**
   - **Name**: Customer's full name

   **Optional but recommended:**
   - **Email**: For receipts and notifications
   - **Phone**: Contact for order pickup
   - **Store Credit**: Starting balance (if applicable)
   - **Notes**: Preferences, account notes

4. **Click**: "Create Customer"

### Method 2: During Checkout

When creating an order:

1. **Click**: "New Order"
2. **Click**: "Add New Customer" (in customer dropdown)
3. **Enter customer info**
4. **Customer is created** and selected for the order

### Method 3: Via Command Line

```bash
checkout-designator customers add \
  --name "Jane Doe" \
  --email "jane@example.com" \
  --phone "555-1234" \
  --store-credit-cents 0
```

### Method 4: Import from CSV

Create `customers.csv`:

```csv
name,email,phone,notes
John Smith,john@example.com,555-1234,Regular customer
Jane Doe,jane@example.com,555-5678,Prefers email notifications
Bob Johnson,bob@example.com,555-9012,Commander player
```

Create `scripts/import_customers.py`:

```python
import csv
from checkoutdesignator.database import init_db, session_scope
from checkoutdesignator.schemas import CustomerCreate
from checkoutdesignator.services import customers

def import_customers(csv_file):
    init_db()
    with session_scope() as session:
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                customer_data = CustomerCreate(
                    name=row['name'],
                    email=row.get('email') or None,
                    phone=row.get('phone') or None,
                    notes=row.get('notes') or None,
                    store_credit_cents=0
                )
                customer = customers.create_customer(session, customer_data)
                print(f"✅ Added {customer.name}")
            
            print(f"\n✅ Customer import complete!")

if __name__ == "__main__":
    import_customers("customers.csv")
```

Run:
```bash
python scripts/import_customers.py
```

### Managing Customer Data

**View Customer Details:**
- Click customer name in Customers page
- See purchase history, pre-orders, store credit

**Add Store Credit:**
- Open customer details
- Click "Add Credit"
- Enter amount and reason
- Credit is applied immediately

**Edit Customer Info:**
- Open customer details
- Click "Edit"
- Update fields
- Save changes

---

## System Configuration

### Network Access (Multi-Register Setup)

To access the POS from multiple computers on your network:

1. **Find your computer's IP address:**
   ```bash
   # Linux/Mac:
   ip addr show | grep inet
   # Look for 192.168.x.x or 10.0.x.x
   
   # Or:
   hostname -I
   ```

2. **Update start.sh** (already configured for network access):
   - Backend: `--host 0.0.0.0 --port 8000`
   - Frontend: `--host 0.0.0.0 --port 5173`

3. **Start the application:**
   ```bash
   ./start.sh
   ```

4. **From other computers**, access:
   - Frontend: `http://YOUR_IP:5173`
   - Example: `http://192.168.1.100:5173`

5. **Firewall configuration** (if needed):
   ```bash
   # Ubuntu:
   sudo ufw allow 8000/tcp
   sudo ufw allow 5173/tcp
   
   # Or allow from local network only:
   sudo ufw allow from 192.168.1.0/24 to any port 8000
   sudo ufw allow from 192.168.1.0/24 to any port 5173
   ```

### Autostart on Boot (Linux)

Create systemd service file:

```bash
sudo nano /etc/systemd/system/card-catalog-pos.service
```

Add:
```ini
[Unit]
Description=Card Catalog POS System
After=network.target

[Service]
Type=forking
User=baxterkrug
WorkingDirectory=/home/baxterkrug/Documents/Card Catalog POS
ExecStart=/home/baxterkrug/Documents/Card Catalog POS/start.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable card-catalog-pos
sudo systemctl start card-catalog-pos
```

Check status:
```bash
sudo systemctl status card-catalog-pos
```

---

## Daily Operations

### Opening Checklist (8 AM)

The system includes an automated checklist that resets each day at 8 AM:

1. **Log in** when you arrive
2. **Dashboard** shows your opening checklist:
   - [ ] Count cash drawer
   - [ ] Turn on registers
   - [ ] Check pre-order pickups
   - [ ] Review inventory alerts
   - [ ] Check for price updates
   - [ ] Verify receipt printer
   - [ ] Test barcode scanner
   - [ ] Review daily goals

3. **Check off tasks** as you complete them
4. **Your name** appears next to completed items
5. **Managers can view** who completed what (history tracking)

### Processing Sales

1. **Click**: "New Order"
2. **Select customer** (or use "Walk-in Customer")
3. **Add items**:
   - Scan barcode, OR
   - Type SKU/name in search, OR
   - Browse inventory list
4. **Adjust quantities** if needed
5. **Review total**
6. **Click**: "Submit Order" (allocates inventory)
7. **Process payment** (cash/card)
8. **Click**: "Mark as Ready" → "Mark as Picked Up"
9. **Print receipt** (if printer configured)

### Accepting Pre-Orders

1. **Navigate to**: Pre-orders
2. **Click**: Pre-order item (e.g., "Foundations Booster Box")
3. **Click**: "Accept Pre-Order"
4. **Select customer**
5. **Enter quantity**
6. **Take payment** (optional)
7. **Click**: "Submit"

**Automatic allocation**: When stock arrives, pre-orders are filled automatically in the order they were received (FIFO).

### Receiving Pre-Ordered Stock

1. **Navigate to**: Inventory
2. **Find the product** that was pre-ordered
3. **Click**: "Receive Stock"
4. **Enter quantity** received
5. **Click**: "Receive"

**System automatically**:
- Fills pre-orders in order (FIFO)
- Updates quantities
- Marks pre-orders as "Ready for pickup"
- Sends notifications (if configured)

### Closing Checklist (End of Day)

At closing, complete the checklist:
- [ ] Count cash drawer
- [ ] Balance register
- [ ] Clean counters
- [ ] Review pre-orders for tomorrow
- [ ] Lock up inventory
- [ ] Set alarm

All completed items are stored with your name and timestamp for accountability.

---

## Backup Setup

### Why Backups Matter

Your database contains:
- All sales transactions
- Customer information
- Inventory levels
- Pre-order commitments
- Financial data

**Losing this data could be catastrophic for your business.**

### Quick Setup (5 Minutes)

1. **Test the backup script:**
   ```bash
   cd "/home/baxterkrug/Documents/Card Catalog POS"
   ./scripts/backup_database.sh
   ```

   You should see:
   ```
   ✅ Backup completed successfully!
   ```

   Backups are saved in `db_backups/` folder.

2. **Schedule automatic backups:**
   ```bash
   crontab -e
   ```

   Add this line (backs up 4 times daily):
   ```cron
   0 8,12,18,23 * * * /home/baxterkrug/Documents/Card\ Catalog\ POS/scripts/backup_database.sh >> /home/baxterkrug/Documents/Card\ Catalog\ POS/db_backups/backup.log 2>&1
   ```

   Save and exit (Ctrl+X, then Y, then Enter).

3. **Verify it's scheduled:**
   ```bash
   crontab -l | grep backup_database
   ```

**That's it!** Your database is now backed up automatically:
- 8 AM (opening)
- 12 PM (lunch)
- 6 PM (evening)
- 11 PM (closing)

### What Gets Backed Up

- **Timestamped backups**: `checkoutdesignator_20260302_080000.db`
- **Daily backups**: `checkoutdesignator_20260302.db` (one per day)
- **Latest link**: `latest.db` (always points to newest)

### Backup Retention

- Backups older than 7 days are automatically compressed (gzipped)
- Backups older than 30 days are automatically deleted
- You can change these in `scripts/backup_database.sh`

### Restoring from Backup

**If something goes wrong:**

1. **Stop the application** (Ctrl+C in terminal)
2. **Restore from backup:**
   ```bash
   cp db_backups/latest.db checkoutdesignator.db
   ```
3. **Restart the application:**
   ```bash
   ./start.sh
   ```

**Restore from specific date:**
```bash
# List available backups
ls -lh db_backups/daily/

# Restore specific day
cp db_backups/daily/checkoutdesignator_20260301.db checkoutdesignator.db
```

### Network/Cloud Backup (Recommended)

**Copy to network drive:**

1. Mount network share:
   ```bash
   sudo mount -t cifs //192.168.1.100/backups /mnt/network_backup \
     -o username=your_user,password=your_pass
   ```

2. The backup script automatically copies there if `/mnt/network_backup` exists

**Copy to external USB:**
```bash
# After mounting USB drive:
cp -r db_backups/* /media/usb/cardcatalog_backups/
```

**Sync to cloud** (Dropbox, Google Drive, etc.):
```bash
# Install rclone
sudo apt install rclone

# Configure cloud storage
rclone config

# Add to cron to sync daily
0 1 * * * rclone sync /home/baxterkrug/Documents/Card\ Catalog\ POS/db_backups/ gdrive:cardcatalog-backups/
```

See `docs/DATABASE_BACKUP.md` for complete backup documentation.

---

## Troubleshooting

### Application Won't Start

**Issue**: `./start.sh` fails or servers don't start

**Solutions**:

1. **Check if virtual environment is activated:**
   ```bash
   source .venv/bin/activate
   ```

2. **Check if ports are already in use:**
   ```bash
   lsof -i :8000  # Check backend
   lsof -i :5173  # Check frontend
   
   # Kill process if needed:
   kill -9 <PID>
   ```

3. **Reinstall dependencies:**
   ```bash
   pip install -e ".[dev]"
   cd frontend && npm install && cd ..
   ```

4. **Check start script permissions:**
   ```bash
   chmod +x start.sh
   ```

### Can't Log In

**Issue**: Invalid username/password

**Solutions**:

1. **Verify user exists:**
   ```bash
   source .venv/bin/activate
   checkout-designator users list
   ```

2. **Reset password:**
   ```bash
   # Via command line (if you have access to another admin account)
   # Or create a reset script
   ```

3. **Create new admin user:**
   ```bash
   python scripts/seed_staff.py
   # Then log in with: cayle / dev123
   ```

### Database Errors

**Issue**: "Database locked" or "unable to open database"

**Solutions**:

1. **Check file permissions:**
   ```bash
   ls -l checkoutdesignator.db
   chmod 664 checkoutdesignator.db
   ```

2. **Restart the application:**
   ```bash
   # Press Ctrl+C to stop
   ./start.sh
   ```

3. **Restore from backup:**
   ```bash
   cp db_backups/latest.db checkoutdesignator.db
   ```

### Network Access Issues

**Issue**: Can't access from other computers

**Solutions**:

1. **Check IP address:**
   ```bash
   hostname -I
   ```

2. **Verify servers are listening on 0.0.0.0:**
   ```bash
   netstat -tuln | grep -E '8000|5173'
   ```

3. **Check firewall:**
   ```bash
   sudo ufw status
   sudo ufw allow 8000/tcp
   sudo ufw allow 5173/tcp
   ```

4. **Test from other computer:**
   ```bash
   # On the other computer:
   curl http://192.168.1.100:8000/api/health
   ```

### Inventory Not Updating

**Issue**: Changes don't save or quantities are wrong

**Solutions**:

1. **Check for allocation locks** (pre-orders holding inventory):
   - Go to Inventory
   - Check "Allocated" column
   - View pre-orders to see what's reserved

2. **Check adjustment log**:
   - Inventory → Select item → View History
   - See all changes and who made them

3. **Manual adjustment:**
   ```bash
   source .venv/bin/activate
   checkout-designator inventory adjust --item-id 5 --quantity 10 --reason "Inventory recount"
   ```

### Slow Performance

**Issue**: System is slow or unresponsive

**Solutions**:

1. **Check database size:**
   ```bash
   du -h checkoutdesignator.db
   # If > 1GB, consider archiving old data
   ```

2. **Restart the application:**
   ```bash
   # Ctrl+C to stop
   ./start.sh
   ```

3. **Check system resources:**
   ```bash
   htop  # Or: top
   # Look for high CPU/memory usage
   ```

4. **Optimize database:**
   ```bash
   sqlite3 checkoutdesignator.db "VACUUM;"
   ```

### Barcode Scanner Not Working

**Issue**: Scanner doesn't input data

**Solutions**:

1. **Check USB connection**: Unplug and replug scanner

2. **Test in text editor**: Open text editor, scan a barcode
   - Should type the barcode number and press Enter
   - If not, scanner needs configuration

3. **Check scanner mode**: Must be in "HID keyboard" mode (not "serial" or "USB storage")

4. **Configure suffix**: Scanner should send "Enter" after each scan
   - Refer to scanner manual for programming barcodes

---

## Additional Resources

### Documentation

- **[CHECKLIST_SYSTEM.md](CHECKLIST_SYSTEM.md)** - Daily checklist system guide
- **[DATABASE_BACKUP.md](DATABASE_BACKUP.md)** - Complete backup documentation
- **[PREORDER_SYSTEM.md](PREORDER_SYSTEM.md)** - Pre-order workflow guide
- **[ORDER_SYSTEM.md](ORDER_SYSTEM.md)** - Order processing guide
- **[BARCODE_SCANNER.md](BARCODE_SCANNER.md)** - Barcode scanner setup
- **[DATA_ACCESS.md](DATA_ACCESS.md)** - Exporting and accessing data

### API Documentation

- Interactive API docs: http://localhost:8000/api/docs
- Alternative docs: http://localhost:8000/api/redoc

### Support

- GitHub Issues: https://github.com/BaxterKrug/Card-Catalog-POS/issues
- Email: [Your support email]

### Development

To contribute or modify the system, see:
- `docs/architecture.md` - System architecture
- `README.md` - Developer guide

---

## Quick Reference Card

**Starting the system:**
```bash
cd "/home/baxterkrug/Documents/Card Catalog POS"
source .venv/bin/activate
./start.sh
```

**Access the system:**
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/api/docs

**Default login:**
- Username: `cayle`
- Password: `dev123` (change immediately!)

**Stop the system:**
- Press `Ctrl+C` in the terminal

**Backup now:**
```bash
./scripts/backup_database.sh
```

**View logs:**
```bash
tail -f db_backups/backup.log
```

**Emergency restore:**
```bash
cp db_backups/latest.db checkoutdesignator.db
./start.sh
```

---

**Last Updated**: March 2, 2026
**Version**: 1.0.0
**Built by**: SK R&D for SK Games
