import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Barcode, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerInputProps {
  onScan: (code: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const BarcodeScannerInput = ({
  onScan,
  placeholder = "امسح الباركود أو اكتبه هنا...",
  className = "",
  autoFocus = false,
}: BarcodeScannerInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      onScan(inputValue.trim());
      setInputValue("");
      // Keep focus for continuous scanning
      inputRef.current?.focus();
    }
  };

  const startCameraScanner = async () => {
    setIsCameraOpen(true);
    setIsScanning(true);

    try {
      // Wait for dialog to render
      await new Promise((resolve) => setTimeout(resolve, 100));

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const qrCodeSuccessCallback = (decodedText: string) => {
        onScan(decodedText);
        toast.success(`تم مسح الباركود: ${decodedText}`);
        stopCameraScanner();
      };

      const config = { fps: 10, qrbox: { width: 250, height: 150 } };

      await scanner.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        () => {} // Ignore errors during scanning
      );
    } catch (error: any) {
      console.error("Error starting scanner:", error);
      toast.error("فشل تشغيل الكاميرا: " + error.message);
      setIsCameraOpen(false);
      setIsScanning(false);
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setIsCameraOpen(false);
    setIsScanning(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pr-10"
            dir="ltr"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={startCameraScanner}
          title="مسح بالكاميرا"
        >
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && stopCameraScanner()}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>مسح الباركود</span>
              <Button variant="ghost" size="icon" onClick={stopCameraScanner}>
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              id="qr-reader"
              className="w-full min-h-[300px] bg-muted rounded-lg overflow-hidden"
            />
            <p className="text-sm text-muted-foreground text-center">
              وجّه الكاميرا نحو الباركود أو رمز QR
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
