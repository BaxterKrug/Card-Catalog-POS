# Card Catalog POS - Documentation Index

**Complete documentation for the SK Games Point-of-Sale System**

---

## 🚀 Getting Started

### New Users Start Here

| Document | Purpose | Who Should Read |
|----------|---------|-----------------|
| **[QUICKSTART.md](../QUICKSTART.md)** | Get running in 10 minutes | Everyone (first time setup) |
| **[SETUP.md](SETUP.md)** | Complete setup guide with all details | Store managers, system administrators |
| **[README.md](../README.md)** | Project overview and quick reference | Developers, technical users |

**Recommended order:**
1. Read [QUICKSTART.md](../QUICKSTART.md) to install and run the system
2. Follow [SETUP.md](SETUP.md) to configure for your store
3. Set up backups using [DATABASE_BACKUP.md](DATABASE_BACKUP.md)

---

## 📋 Operational Guides

### Daily Operations

| Document | Purpose | Who Should Read |
|----------|---------|-----------------|
| **[CHECKLIST_SYSTEM.md](CHECKLIST_SYSTEM.md)** | Daily opening/closing checklists | All staff |
| **[ORDER_SYSTEM.md](ORDER_SYSTEM.md)** | Processing sales and orders | Cashiers, sales staff |
| **[PREORDER_SYSTEM.md](PREORDER_SYSTEM.md)** | Managing pre-orders and reservations | Sales staff, managers |

### Data Management

| Document | Purpose | Who Should Read |
|----------|---------|-----------------|
| **[DATABASE_BACKUP.md](DATABASE_BACKUP.md)** | Backup and disaster recovery | Managers, owners |
| **[DATA_ACCESS.md](DATA_ACCESS.md)** | Exporting data for reports | Managers, owners |
| **[BACKUP_SETUP.md](BACKUP_SETUP.md)** | ⚠️ Deprecated - See DATABASE_BACKUP.md | - |

### Hardware Integration

| Document | Purpose | Who Should Read |
|----------|---------|-----------------|
| **[BARCODE_SCANNER.md](BARCODE_SCANNER.md)** | Setting up barcode scanners | System administrators |

---

## 🛠️ Technical Documentation

### For Developers

| Document | Purpose | Who Should Read |
|----------|---------|-----------------|
| **[architecture.md](architecture.md)** | System architecture and design | Developers |
| **[gui.md](gui.md)** | Frontend interface documentation | Frontend developers |
| **[PREORDER_SET.md](PREORDER_SET.md)** | Technical pre-order implementation | Backend developers |

### API Documentation

**Interactive API Documentation:**
- Swagger UI: http://localhost:8000/api/docs (when system is running)
- ReDoc: http://localhost:8000/api/redoc (alternative format)

**API Endpoints:**
- **Authentication**: `/api/auth/login`, `/api/auth/me`
- **Users**: `/api/users/*` (staff management)
- **Customers**: `/api/customers/*` (customer accounts)
- **Inventory**: `/api/inventory/*` (products and stock)
- **Orders**: `/api/orders/*` (sales transactions)
- **Pre-orders**: `/api/preorders/*` (reservations)
- **Checklist**: `/api/checklist/*` (daily tasks)
- **Backup**: `/api/backup/*` (data exports)
- **Health**: `/api/health` (system status)

---

## 📖 By User Role

### For Store Staff (Employees)

**You should read:**
1. [QUICKSTART.md](../QUICKSTART.md) - First-time login
2. [ORDER_SYSTEM.md](ORDER_SYSTEM.md) - Processing sales
3. [PREORDER_SYSTEM.md](PREORDER_SYSTEM.md) - Taking pre-orders
4. [CHECKLIST_SYSTEM.md](CHECKLIST_SYSTEM.md) - Daily tasks
5. [BARCODE_SCANNER.md](BARCODE_SCANNER.md) - Using scanners

**You can:**
- Process sales and orders
- Accept pre-orders from customers
- Look up customer information
- Complete daily checklist items
- Search and view inventory

**You cannot:**
- Add or edit products
- View financial reports
- Create user accounts
- Export data

### For Managers

**You should read:**
- Everything employees should read, plus:
1. [SETUP.md](SETUP.md) - System configuration
2. [DATABASE_BACKUP.md](DATABASE_BACKUP.md) - Backup procedures
3. [DATA_ACCESS.md](DATA_ACCESS.md) - Exporting reports

**You can:**
- Everything employees can do, plus:
- Add and edit products
- Receive stock shipments
- Adjust inventory quantities
- View checklist history (employee accountability)
- Manage customer accounts

**You cannot:**
- Create user accounts (ask owners)
- View certain financial reports
- Export complete database

### For Owners

**You should read:**
- Everything above, plus:
1. [architecture.md](architecture.md) - Understanding the system
2. All API documentation
3. Developer guides (if customizing)

**You can:**
- Everything managers and employees can do, plus:
- Create and manage user accounts
- View all financial reports and analytics
- Export complete database
- Configure system settings
- Access all administrative functions

---

## 🎯 By Task

### Setting Up the System

1. **[QUICKSTART.md](../QUICKSTART.md)** - Initial installation
2. **[SETUP.md](SETUP.md)** - Complete configuration
3. **[SETUP.md - Adding Staff Users](SETUP.md#adding-staff-users)** - Create accounts
4. **[SETUP.md - Adding Products](SETUP.md#adding-products-inventory)** - Add inventory
5. **[SETUP.md - Adding Customers](SETUP.md#adding-customers)** - Customer database
6. **[DATABASE_BACKUP.md](DATABASE_BACKUP.md)** - Set up backups

### Daily Operations

1. **[CHECKLIST_SYSTEM.md - Opening](CHECKLIST_SYSTEM.md)** - Morning checklist
2. **[ORDER_SYSTEM.md - Processing Sales](ORDER_SYSTEM.md)** - Checkout process
3. **[PREORDER_SYSTEM.md - Accepting Pre-orders](PREORDER_SYSTEM.md)** - Taking reservations
4. **[SETUP.md - Receiving Stock](SETUP.md#receiving-stock)** - New inventory
5. **[CHECKLIST_SYSTEM.md - Closing](CHECKLIST_SYSTEM.md)** - Evening checklist

### Inventory Management

1. **[SETUP.md - Adding Products](SETUP.md#adding-products-inventory)** - New items
2. **[SETUP.md - Receiving Stock](SETUP.md#receiving-stock)** - Shipments
3. **[PREORDER_SYSTEM.md - Allocation](PREORDER_SYSTEM.md)** - Automatic fulfillment
4. **[ORDER_SYSTEM.md - Stock Levels](ORDER_SYSTEM.md)** - Tracking quantities

### Customer Management

1. **[SETUP.md - Adding Customers](SETUP.md#adding-customers)** - New accounts
2. **[ORDER_SYSTEM.md - Customer Orders](ORDER_SYSTEM.md)** - Purchase history
3. **[PREORDER_SYSTEM.md - Customer Pre-orders](PREORDER_SYSTEM.md)** - Reservations
4. **Store Credit** - Managing balances (see web interface)

### Pre-Order Workflow

1. **[PREORDER_SYSTEM.md - Creating Sets](PREORDER_SYSTEM.md)** - New pre-order items
2. **[PREORDER_SYSTEM.md - Accepting Claims](PREORDER_SYSTEM.md)** - Customer reservations
3. **[PREORDER_SYSTEM.md - Receiving Stock](PREORDER_SYSTEM.md)** - Automatic allocation
4. **[PREORDER_SYSTEM.md - Fulfillment](PREORDER_SYSTEM.md)** - Customer pickup

### Backup and Recovery

1. **[DATABASE_BACKUP.md - Quick Setup](DATABASE_BACKUP.md#quick-setup-5-minutes)** - Enable backups
2. **[DATABASE_BACKUP.md - Restoring](DATABASE_BACKUP.md#restoring-from-backup)** - Recovery
3. **[DATA_ACCESS.md - Exports](DATA_ACCESS.md)** - Manual data export
4. **[DATABASE_BACKUP.md - Network Backup](DATABASE_BACKUP.md#network-backup-optional)** - Off-site copies

### Troubleshooting

1. **[SETUP.md - Troubleshooting](SETUP.md#troubleshooting)** - Common issues
2. **[DATABASE_BACKUP.md - Restoring](DATABASE_BACKUP.md#restoring-from-backup)** - Data recovery
3. **API Docs** - http://localhost:8000/api/docs (test endpoints)
4. **System Logs** - Check `db_backups/backup.log` for backup issues

---

## 🔍 Quick Find

### I want to...

**Set up the system for the first time**
→ [QUICKSTART.md](../QUICKSTART.md) → [SETUP.md](SETUP.md)

**Create staff accounts**
→ [SETUP.md - Adding Staff Users](SETUP.md#adding-staff-users)

**Add products to inventory**
→ [SETUP.md - Adding Products](SETUP.md#adding-products-inventory)

**Process a sale**
→ [ORDER_SYSTEM.md](ORDER_SYSTEM.md)

**Accept a pre-order**
→ [PREORDER_SYSTEM.md](PREORDER_SYSTEM.md)

**Set up automatic backups**
→ [DATABASE_BACKUP.md](DATABASE_BACKUP.md)

**Recover from a disaster**
→ [DATABASE_BACKUP.md - Disaster Recovery](DATABASE_BACKUP.md#disaster-recovery)

**Export data for reports**
→ [DATA_ACCESS.md](DATA_ACCESS.md)

**Configure a barcode scanner**
→ [BARCODE_SCANNER.md](BARCODE_SCANNER.md)

**Access the system from another computer**
→ [SETUP.md - Network Access](SETUP.md#network-access-multi-register-setup)

**Understand the system architecture**
→ [architecture.md](architecture.md)

**Troubleshoot issues**
→ [SETUP.md - Troubleshooting](SETUP.md#troubleshooting)

---

## 📝 Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| QUICKSTART.md | ✅ Current | March 2, 2026 |
| SETUP.md | ✅ Current | March 2, 2026 |
| README.md | ✅ Current | March 2, 2026 |
| DATABASE_BACKUP.md | ✅ Current | March 2, 2026 |
| CHECKLIST_SYSTEM.md | ✅ Current | March 2, 2026 |
| ORDER_SYSTEM.md | ✅ Current | 2026 |
| PREORDER_SYSTEM.md | ✅ Current | 2026 |
| DATA_ACCESS.md | ✅ Current | March 2, 2026 |
| BARCODE_SCANNER.md | ✅ Current | 2026 |
| BACKUP_SETUP.md | ⚠️ Deprecated | - |
| architecture.md | ✅ Current | 2026 |
| gui.md | ✅ Current | 2026 |
| PREORDER_SET.md | ✅ Current | 2026 |

---

## 🤝 Contributing to Documentation

Found an error or want to improve the docs?

1. **Report issues**: https://github.com/BaxterKrug/Card-Catalog-POS/issues
2. **Suggest changes**: Create a pull request
3. **Ask questions**: Contact Baxter, Cayle, or Ian

**Documentation guidelines:**
- Use clear, simple language
- Include code examples
- Add screenshots when helpful
- Test all commands before documenting
- Update this index when adding new docs

---

## 📞 Support

**Need help?**
- Check the relevant documentation above
- Review [SETUP.md - Troubleshooting](SETUP.md#troubleshooting)
- Visit API docs: http://localhost:8000/api/docs
- GitHub Issues: https://github.com/BaxterKrug/Card-Catalog-POS/issues
- In-person: Ask at SK Games

---

**Built by SK R&D for SK Games** 🎮

**System Version**: 1.0.0  
**Last Updated**: March 2, 2026
