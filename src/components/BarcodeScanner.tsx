"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const REGION_ID = "barcode-scanner-region";

export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const scanner = new Html5Qrcode(REGION_ID, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ],
      verbose: false,
    });

    let cancelled = false;

    const startPromise = scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 260, height: 140 } },
      (decodedText) => {
        if (cancelled) return;
        cancelled = true;
        onDetectedRef.current(decodedText);
      },
      undefined
    );

    startPromise.catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't access the camera.");
    });

    return () => {
      cancelled = true;
      // Only a scanner whose start() actually resolved is safe to stop —
      // calling stop() before that (e.g. camera permission denied) throws.
      startPromise
        .then(() => scanner.stop().then(() => scanner.clear()))
        .catch(() => {});
    };
  }, []);

  return (
    <div>
      <div id={REGION_ID} className="rounded-xl overflow-hidden bg-ink/90 min-h-[200px]" />
      {error && <p className="font-mono text-xs text-rust mt-2">{error}</p>}
      <p className="font-mono text-[0.68rem] text-ink/50 mt-2 text-center">
        Point the camera at the barcode on the sleeve or label.
      </p>
      <button
        onClick={onClose}
        className="w-full mt-3 rounded-full border-[1.5px] border-teal-deep text-teal-deep font-semibold text-sm py-2.5"
      >
        Cancel scan
      </button>
    </div>
  );
}
