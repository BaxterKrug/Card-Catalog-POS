# Barcode Scanner Feature

## Overview

The Card Catalog POS system includes **two types** of barcode scanning functionality:

1. **USB Barcode Scanner** - Physical scanner device (NEW!)
2. **Webcam Scanner** - Camera-based scanning using @zxing/library

Both methods streamline product entry and checkout by eliminating manual SKU typing.

---

## USB Barcode Scanner (Recommended)

### Overview

USB barcode scanners are physical devices that work as keyboard input devices (HID). Simply scan a product and it's instantly added to the cart.

### Features

- **Always Active**: Works automatically in the New Order modal
- **No Setup Required**: Just plug in and scan
- **Fast & Accurate**: Instant product lookup and cart addition
- **Visual Indicator**: Green "USB Scanner Ready" badge shows when active
- **Smart Detection**: Distinguishes barcode scans from manual typing

### How It Works

1. Plug in your USB barcode scanner (no drivers needed for HID scanners)
2. Open the New Order modal
3. Scan any product barcode
4. The product is automatically added to the cart
5. Scan error? Check the SKU in your inventory matches the barcode

### Supported Devices

Any USB barcode scanner that acts as a keyboard (HID) including:
- Standard retail POS scanners
- Handheld wireless scanners
- Fixed-mount scanners
- Wired and wireless USB scanners

### Technical Details

- **Detection Speed**: Differentiates scanner input (< 100ms between keys) from typing
- **Minimum Length**: 3 characters
- **Debounce**: 1 second between duplicate scans
- **Works With**: Search field, product lookup, checkout

### Troubleshooting USB Scanner

**Scanner not working?**
1. Check USB connection
2. Test in a text editor (should type barcode + Enter)
3. Ensure New Order modal is open
4. Check SKU matches barcode in inventory

**Wrong products?**
- Verify your inventory SKUs match the barcodes you're scanning
- Update product SKUs in inventory as needed

---

## Webcam Barcode Scanner

### Overview

Camera-based scanning for situations where no USB scanner is available.

### Technology

- **Library**: [@zxing/library](https://github.com/zxing-js/library) v0.21.3
- **Format Support**: All common barcode formats including:
  - UPC-A, UPC-E
  - EAN-8, EAN-13
  - Code 39, Code 93, Code 128
  - QR Code
  - Data Matrix
  - PDF417
  - And more...

## How to Use

### In the New Order Modal (Checkout)

**USB Scanner** (if available):
1. Open New Order modal
2. Simply scan any product barcode
3. Product is automatically added to cart
4. Look for the green "USB Scanner Ready" indicator

**Camera Scanner** (fallback):
1. Open New Order modal
2. Click the **scan icon** button
3. Allow browser access to your webcam when prompted
4. Position the barcode within the frame
5. Scanner automatically detects and adds the product
6. Press ESC to close the scanner

### In the Inventory Page

1. Navigate to the **Inventory** page
2. Scroll to the "Quick add a SKU" form
3. Click the **scan icon** button next to the SKU field
4. Allow browser access to your webcam when prompted
5. Position the barcode within the frame overlay
6. The scanner will automatically detect and read the barcode
7. The scanned value will populate the SKU field
8. Press ESC or click the X button to close the scanner

## Comparison: USB vs Camera Scanner

| Feature | USB Scanner | Camera Scanner |
|---------|-------------|----------------|
| Speed | ⚡ Instant | 🐌 1-2 seconds |
| Setup | Plug & play | Camera permission |
| Accuracy | ✅ Very high | ⚠️ Lighting dependent |
| Hardware | Requires scanner | Uses built-in camera |
| Cost | $30-200 | Free |
| Checkout | ✅ Best for POS | Backup option |
| Inventory | ✅ Bulk scanning | Single items |

**Recommendation**: Use USB scanner for regular POS checkout operations. Use camera scanner for occasional inventory updates or when USB scanner is unavailable.

## Browser Requirements

- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- HTTPS connection (required for webcam access in production)
- Camera permission granted to the website

## Camera Selection

If multiple cameras are available (e.g., front and back cameras on a laptop):
- The scanner will automatically prefer the back camera if available
- You can manually switch cameras using the dropdown at the bottom of the scanner

## Tips for Best Results

1. **Lighting**: Ensure good lighting conditions for accurate scanning
2. **Focus**: Hold the barcode steady and in focus
3. **Distance**: Position the barcode 6-12 inches from the camera
4. **Orientation**: Barcodes can be scanned in any orientation
5. **Quality**: Damaged or poorly printed barcodes may not scan

## Troubleshooting

### "Failed to access camera" error
- Check browser permissions (click the camera icon in the address bar)
- Ensure no other application is using the camera
- Try refreshing the page

### "No camera devices found" error
- Verify a camera is connected to your device
- Check device settings to ensure the camera is enabled
- Try a different browser

### Scanner not detecting barcode
- Improve lighting conditions
- Move the barcode closer or further from the camera
- Ensure the barcode is clean and not damaged
- Try a different camera if multiple are available

## Development Notes

### Component Location
- Scanner component: `frontend/src/components/BarcodeScanner.tsx`
- Integration: `frontend/src/pages/InventoryPage.tsx`

### Key Features
- Real-time video feed with visual scanning overlay
- Automatic barcode detection (no button press needed)
- Multi-camera support with device selection
- Error handling for camera access and scanning issues
- Keyboard shortcut (ESC) to close scanner
- Mobile-responsive design

### Future Enhancements
- Support for scanning multiple barcodes in succession
- Barcode history/cache
- Manual barcode entry fallback in scanner UI
- Integration with product lookup APIs
- Scanning in other workflows (checkout, returns, etc.)
