import { useEffect, useRef, useCallback } from "react";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxTimeBetweenKeys?: number; // milliseconds
}

/**
 * Hook to detect USB barcode scanner input
 * 
 * USB barcode scanners act as keyboard input devices, typing the barcode
 * and pressing Enter. This hook detects this pattern by:
 * 1. Capturing rapid keypresses (typically < 50ms between keys)
 * 2. Detecting Enter key to complete the scan
 * 3. Filtering out normal typing (slower keypresses)
 */
export const useBarcodeScanner = ({
  onScan,
  enabled = true,
  minLength = 3,
  maxTimeBetweenKeys = 100, // Most barcode scanners type within 50ms between keys
}: UseBarcodeScannerOptions) => {
  const barcodeBuffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  const resetBuffer = useCallback(() => {
    barcodeBuffer.current = "";
    lastKeyTime.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = lastKeyTime.current ? now - lastKeyTime.current : 0;

      // Ignore if user is typing in an input field (except for the search field which we want to support)
      const target = event.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const isSearchInput = target.getAttribute("data-barcode-enabled") === "true";
      
      if (isInput && !isSearchInput) {
        resetBuffer();
        return;
      }

      // Handle Enter key - this completes the barcode scan
      if (event.key === "Enter" && barcodeBuffer.current.length >= minLength) {
        event.preventDefault();
        const barcode = barcodeBuffer.current;
        resetBuffer();
        console.log("USB Barcode scanned:", barcode);
        onScan(barcode);
        return;
      }

      // Only accumulate printable characters (letters, numbers, symbols)
      if (event.key.length === 1) {
        // If too much time has passed since last key, this is probably manual typing
        if (lastKeyTime.current && timeSinceLastKey > maxTimeBetweenKeys) {
          resetBuffer();
        }

        barcodeBuffer.current += event.key;
        lastKeyTime.current = now;

        // Clear buffer after a timeout (in case Enter is missed)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(resetBuffer, 500);
      }
    };

    document.addEventListener("keypress", handleKeyPress);

    return () => {
      document.removeEventListener("keypress", handleKeyPress);
      resetBuffer();
    };
  }, [enabled, minLength, maxTimeBetweenKeys, onScan, resetBuffer]);

  return { resetBuffer };
};
