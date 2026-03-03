import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Camera, CameraOff, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // Function to play a beep sound
  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set beep properties
      oscillator.frequency.value = 800; // Hz - nice scanning beep tone
      oscillator.type = "sine";
      
      // Volume control
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      // Play for 100ms
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (err) {
      console.warn("Failed to play beep sound:", err);
    }
  };

  // Cleanup function to stop camera
  const stopCamera = () => {
    console.log("Stopping camera...");
    // Stop all video tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped track:", track.kind);
      });
      videoRef.current.srcObject = null;
    }
    // Reset the reader
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  };

  // Handle close with camera cleanup
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  useEffect(() => {
    console.log("BarcodeScanner mounted");
    // Initialize the barcode reader with hints to reduce CPU usage
    const reader = new BrowserMultiFormatReader();
    
    // Configure reader for better performance
    const hints = new Map();
    hints.set(2, true); // ASSUME_GS1 - helps with retail barcodes
    hints.set(3, true); // TRY_HARDER - more thorough but controlled
    reader.hints = hints;
    
    // Set a reasonable time between decode attempts (reduce from default)
    reader.timeBetweenDecodingAttempts = 300; // milliseconds
    
    readerRef.current = reader;

    // Handle ESC key to close scanner
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Request camera permission first, then get available video devices
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        // Stop the stream immediately - we just needed it to trigger permission
        stream.getTracks().forEach(track => track.stop());
        console.log("Camera permission granted");
        
        // Now list devices with proper labels
        return reader.listVideoInputDevices();
      })
      .then((videoDevices) => {
        console.log("Found video devices:", videoDevices.length);
        console.log("Devices:", videoDevices);
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          // Prefer back camera if available
          const backCamera = videoDevices.find((device) =>
            device.label.toLowerCase().includes("back")
          );
          const deviceId = backCamera?.deviceId || videoDevices[0].deviceId;
          console.log("Selected device:", deviceId, videoDevices[0].label);
          setSelectedDeviceId(deviceId);
        } else {
          console.error("No camera devices found");
          setError("No camera devices found");
        }
      })
      .catch((err) => {
        console.error("Error accessing camera:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("Camera permission denied. Please allow camera access and try again.");
        } else if (err.name === 'NotFoundError') {
          setError("No camera found. Please connect a camera and try again.");
        } else {
          setError("Failed to access camera. Please check permissions and try again.");
        }
      });

    return () => {
      // Cleanup on unmount
      console.log("BarcodeScanner unmounting");
      document.removeEventListener("keydown", handleKeyDown);
      stopCamera();
    };
  }, [onClose]);

  useEffect(() => {
    if (!selectedDeviceId || !videoRef.current || !readerRef.current) {
      console.log("Scanner not ready:", { selectedDeviceId, hasVideo: !!videoRef.current, hasReader: !!readerRef.current });
      return;
    }

    console.log("Starting video decode with device:", selectedDeviceId);
    const reader = readerRef.current;
    setIsScanning(true);
    setError(null);

    reader
      .decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            // Prevent duplicate scans within 1 second
            const now = Date.now();
            if (now - lastScanTimeRef.current < 1000) {
              return;
            }
            
            // Prevent concurrent processing
            if (isProcessingRef.current) {
              return;
            }
            
            isProcessingRef.current = true;
            lastScanTimeRef.current = now;
            
            // Successfully scanned a barcode
            const barcode = result.getText();
            console.log("Barcode scanned:", barcode);
            
            // Play beep sound
            playBeep();
            
            // Call the onScan callback
            onScan(barcode);
            
            // Reset processing flag after a short delay
            setTimeout(() => {
              isProcessingRef.current = false;
            }, 500);
            
            // Note: The parent component (NewOrderModal/InventoryPage) should close the scanner
          }
          // Log other errors for debugging (but ignore NotFoundException which is normal)
          if (error && !(error instanceof NotFoundException)) {
            console.error("Scan error:", error);
          }
        }
      )
      .catch((err) => {
        console.error("Error starting video stream:", err);
        setError("Failed to start camera. Please check permissions.");
        setIsScanning(false);
      });

    return () => {
      console.log("Cleaning up scanner effect...");
      stopCamera();
    };
  }, [selectedDeviceId, onScan]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-indigo-500">
              <Camera size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Barcode Scanner</h2>
              <p className="text-xs text-white/60">
                {isScanning ? "Position barcode in view" : "Initializing camera..."}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-accent hover:text-accent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Feed */}
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
          
          {/* Scanning overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-48 w-48">
                <div className="absolute inset-0 border-2 border-accent opacity-50 animate-pulse" />
                <div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-accent animate-pulse" />
                <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-accent animate-pulse" />
                <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-accent animate-pulse" />
                <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-accent animate-pulse" />
                
                {/* Scanning line animation */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute h-0.5 w-full bg-accent animate-scan" style={{
                    animation: 'scan 2s linear infinite'
                  }} />
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-sm font-medium text-white">Scanning for barcode...</p>
                <p className="mt-1 text-xs text-white/60">Position barcode within the frame</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/10 px-6 py-4 text-center">
                <CameraOff size={32} className="mx-auto mb-3 text-rose-300" />
                <p className="text-sm text-rose-200">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Camera selector */}
        {devices.length > 1 && (
          <div className="border-t border-white/10 px-6 py-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                Camera device
              </span>
              <select
                value={selectedDeviceId || ""}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white focus:border-accent focus:outline-none"
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* Help text */}
        <div className="border-t border-white/10 px-6 py-4">
          <p className="text-xs font-medium text-white/80">
            📷 Scanning Tips:
          </p>
          <ul className="mt-2 space-y-1 text-xs text-white/60">
            <li>• Hold the barcode 4-6 inches from the camera</li>
            <li>• Ensure good lighting on the barcode</li>
            <li>• Keep the barcode flat and steady</li>
            <li>• The scanner will beep when detected</li>
            <li>• Press ESC or click X to close</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
