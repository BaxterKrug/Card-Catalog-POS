# Barcode Scanner Feature

## Overview

The Card Catalog POS system includes webcam-based barcode scanning functionality to streamline inventory intake. This feature allows staff to quickly scan product barcodes instead of manually typing SKUs.

## Technology

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

### In the Inventory Page

1. Navigate to the **Inventory** page
2. Scroll to the "Quick add a SKU" form
3. Click the **scan icon** button next to the SKU field
4. Allow browser access to your webcam when prompted
5. Position the barcode within the frame overlay
6. The scanner will automatically detect and read the barcode
7. The scanned value will populate the SKU field
8. Press ESC or click the X button to close the scanner

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
