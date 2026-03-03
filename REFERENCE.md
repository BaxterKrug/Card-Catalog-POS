# Card Catalog POS - Quick Reference Card

**Keep this handy for daily operations!**

---

## 🚀 Starting/Stopping the System

### Start
```bash
cd "/home/baxterkrug/Documents/Card Catalog POS"
source .venv/bin/activate
./start.sh
```

**Access**: http://localhost:5173

### Stop
- Press `Ctrl+C` in the terminal

---

## 👤 Default Login

**Username**: `cayle`  
**Password**: `dev123`

⚠️ **Change password immediately!**

**Other default accounts**: cayle, baxter, ian, brendan, rick, tony, taft, gabriel

---

## 💰 Daily Checklist

### Opening (8 AM)
- [ ] Log in to system
- [ ] Complete opening checklist items
- [ ] Check pre-orders ready for pickup
- [ ] Verify cash drawer
- [ ] Test barcode scanner

### Closing (11 PM)
- [ ] Complete closing checklist items
- [ ] Count cash drawer
- [ ] Balance register
- [ ] Review tomorrow's pre-orders

---

## 🛒 Processing a Sale

1. Click "New Order"
2. Select customer (or "Walk-in Customer")
3. Add items (scan barcode or search)
4. Click "Submit Order"
5. Process payment
6. Click "Mark as Ready" → "Mark as Picked Up"
7. Print receipt (if configured)

---

## 📦 Accepting a Pre-Order

1. Go to "Pre-orders" page
2. Click the pre-order item
3. Click "Accept Pre-Order"
4. Select customer
5. Enter quantity
6. Click "Submit"

---

## 📥 Receiving Stock

1. Go to "Inventory" page
2. Find the product
3. Click "Receive Stock"
4. Enter quantity received
5. Click "Receive"

**Note**: Pre-orders are automatically filled!

---

## 👥 Quick User Management

### Add User (CLI)
```bash
source .venv/bin/activate
checkout-designator users add \
  --name "Name" \
  --username "user" \
  --password "temp123" \
  --role employee
```

**Roles**: `employee`, `manager`, `owner`

---

## 📦 Quick Inventory Management

### Add Product (CLI)
```bash
checkout-designator inventory upsert \
  --sku "SKU" \
  --name "Product Name" \
  --physical-quantity 10 \
  --unit-price-cents 1999
```

**Note**: Prices are in cents (multiply by 100)

---

## 💾 Backup & Recovery

### Manual Backup
```bash
./scripts/backup_database.sh
```

**Location**: `db_backups/` folder

### Emergency Restore
```bash
# Stop the system first (Ctrl+C)
cp db_backups/latest.db checkoutdesignator.db
./start.sh
```

### Check Backup Log
```bash
tail -f db_backups/backup.log
```

---

## 🔧 Troubleshooting

### System Won't Start
```bash
# Kill existing processes
lsof -i :8000  # Note the PID
kill -9 <PID>

# Try starting again
./start.sh
```

### Can't Log In
```bash
# Recreate default staff
python scripts/seed_staff.py
```

### Database Locked
```bash
# Restart the system
# Press Ctrl+C
./start.sh
```

### Forgot Password
- Ask another owner to reset via Settings → Users
- Or recreate user accounts with `seed_staff.py`

---

## 📊 User Permissions

### Employee Can:
- ✅ Process sales
- ✅ Accept pre-orders
- ✅ Look up customers
- ✅ Complete checklist items
- ❌ Add products
- ❌ View financials
- ❌ Create users

### Manager Can:
- ✅ Everything employees can do
- ✅ Add/edit products
- ✅ Receive stock
- ✅ Adjust inventory
- ✅ View checklist history
- ❌ View certain financials
- ❌ Create users

### Owner Can:
- ✅ Everything managers can do
- ✅ Create/manage users
- ✅ View all financial reports
- ✅ Export database
- ✅ Configure system settings

---

## 🌐 Network Access

**From other computers on the network:**

http://YOUR_IP:5173

**Find your IP:**
```bash
hostname -I
```

**Example**: http://192.168.1.100:5173

---

## 📱 Important URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **API Docs** | http://localhost:8000/api/docs |
| **Health Check** | http://localhost:8000/api/health |

---

## 📞 Help & Support

### Documentation
- **Quick Start**: `QUICKSTART.md`
- **Complete Setup**: `docs/SETUP.md`
- **Find Anything**: `docs/INDEX.md`
- **Troubleshooting**: `docs/SETUP.md#troubleshooting`

### Common Issues
- System won't start → See SETUP.md - Troubleshooting
- Can't log in → Run `python scripts/seed_staff.py`
- Database errors → Restore from `db_backups/latest.db`
- Network access → Check firewall, use IP address

### Technical Support
- **GitHub**: https://github.com/BaxterKrug/Card-Catalog-POS/issues
- **In-person**: Ask Baxter, Cayle, or Ian

---

## 🔑 Essential Commands

### Python Environment
```bash
# Activate
source .venv/bin/activate

# Deactivate
deactivate
```

### CLI Commands
```bash
# List users
checkout-designator users list

# List customers
checkout-designator customers list

# List inventory
checkout-designator inventory list

# View order
checkout-designator orders status --order-id 1
```

### Database
```bash
# Check database
sqlite3 checkoutdesignator.db "SELECT COUNT(*) FROM inventoryitem;"

# Vacuum (optimize)
sqlite3 checkoutdesignator.db "VACUUM;"
```

---

## 📅 Maintenance Schedule

### Daily
- ✅ Complete opening/closing checklist
- ✅ Process orders and pre-orders
- ✅ Automatic backups (4x daily if configured)

### Weekly
- ✅ Review backup logs
- ✅ Check system health
- ✅ Update pre-order status

### Monthly
- ✅ Test restore from backup
- ✅ Review user accounts
- ✅ Check disk space
- ✅ Update passwords (if needed)

---

## 🎯 Quick Tips

### Speed Tips
- Use barcode scanner for faster checkout
- Press Tab to move between fields
- Use "Walk-in Customer" for quick sales
- Keyboard shortcuts in search fields

### Best Practices
- Complete checklists daily (accountability!)
- Always verify backups are running
- Change default passwords immediately
- Use descriptive SKUs for easy searching
- Add customer emails for notifications

### Common Mistakes
- ❌ Not setting up backups
- ❌ Using "Walk-in Customer" for regulars
- ❌ Forgetting to receive stock (pre-orders stay pending)
- ❌ Not completing daily checklists
- ❌ Giving everyone Owner access

---

## 🆘 Emergency Contacts

**System Issues:**
- Baxter (Owner)
- Cayle (Owner)
- Ian (Owner)

**Training Questions:**
- Ask any Manager or Owner

**Hardware Issues:**
- Check `docs/BARCODE_SCANNER.md`
- Or ask technical staff

---

**Version**: 1.0.0  
**Last Updated**: March 2, 2026  
**Built by SK R&D for SK Games** 🎮

---

**📖 For complete documentation, see `docs/INDEX.md`**
