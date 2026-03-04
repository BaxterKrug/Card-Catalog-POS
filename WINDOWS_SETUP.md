# Windows Setup Guide

## Step 1: Install Python 3.11+

1. Go to https://www.python.org/downloads/
2. Download Python 3.11 or later (e.g., Python 3.11.8 or 3.12.x)
3. Run the installer
4. **IMPORTANT**: Check "Add Python to PATH" at the bottom of the installer
5. Click "Install Now"
6. Verify installation:
   ```powershell
   python --version
   ```

## Step 2: Install Node.js 18+

1. Go to https://nodejs.org/
2. Download the LTS version (18.x or 20.x)
3. Run the installer
4. Follow the installation wizard (default options are fine)
5. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

## Step 3: Set Up the Project

After installing Python and Node.js, **restart your terminal** and run:

```powershell
cd "c:\Users\skgames\Documents\Card-Catalog-POS"

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -e ".[dev]"

# Install frontend dependencies
cd frontend
npm install
cd ..

# Initialize database
checkout-designator init-db

# Run migrations
python scripts/migrate_add_checklist.py
python scripts/migrate_add_customer_fields.py
python scripts/migrate_add_payments.py
python scripts/migrate_add_preorder_orders.py
python scripts/migrate_preorder_enhancements.py

# Seed initial data
python scripts/seed_default_customer.py
python scripts/seed_singles_item.py
python scripts/seed_staff.py
```

## Step 4: Start the System

```powershell
.\start.ps1
```

This will start both the backend and frontend servers in separate windows.

## Troubleshooting

### PowerShell Execution Policy Error

If you get an error about execution policies when running `.ps1` scripts:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Python or Node Not Found After Installation

- Close and reopen your terminal
- Verify the installation added to PATH
- You may need to restart your computer
