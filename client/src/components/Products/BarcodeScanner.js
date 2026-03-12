import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import './BarcodeScanner.css';

const BarcodeScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState(null);
  const [lastCode, setLastCode] = useState('');
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (scanning && scannerRef.current && !html5QrCodeRef.current) {
      const html5QrCode = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            // Explicitly enable 1D barcodes like UPC / EAN / Code128
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.ITF,
            ],
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
          },
          (decodedText) => {
            setLastCode(decodedText);
            try {
              onScan(decodedText);
            } catch (e) {
              console.error('onScan handler error', e);
            }
            stopScanning();
          },
          () => {
            // ignore scan errors
          }
        )
        .catch((err) => {
          console.error('Error starting scanner:', err);
          setError(
            'Unable to access camera. Make sure your browser has camera permission and you are using a device with a camera.'
          );
          setScanning(false);
          html5QrCodeRef.current = null;
        });
    }

    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const stopScanning = () => {
    if (!html5QrCodeRef.current) {
      setScanning(false);
      return;
    }

    try {
      html5QrCodeRef.current
        .stop()
        .then(() => {
          html5QrCodeRef.current
            .clear()
            .catch((err) => console.error('Error clearing scanner:', err))
            .finally(() => {
              html5QrCodeRef.current = null;
              setScanning(false);
            });
        })
        .catch((err) => {
          // Library throws if scanner is not running; we can safely ignore this.
          console.warn('Scanner already stopped:', err);
          html5QrCodeRef.current = null;
          setScanning(false);
        });
    } catch (err) {
      console.warn('Scanner stop error (ignored):', err);
      html5QrCodeRef.current = null;
      setScanning(false);
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <div className="scanner-header">
          <h3>Barcode Scanner</h3>
          <button onClick={handleClose}>×</button>
        </div>
        <div className="scanner-content">
          {error && <p className="scanner-error">{error}</p>}
          {lastCode && !error && (
            <p className="scanner-info">Detected code: {lastCode}</p>
          )}
          <div id="scanner" ref={scannerRef} className="scanner-view"></div>
          {scanning && (
            <button className="btn-secondary" onClick={stopScanning} style={{ marginTop: '10px' }}>
              Stop Scanner
            </button>
          )}
        </div>
        <div className="scanner-footer">
          <p>
            For best results, open this app directly on your phone&apos;s browser and point the phone
            camera at the barcode.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;

