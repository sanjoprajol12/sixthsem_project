import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import './BarcodeScanner.css';

const BarcodeScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (scanning && scannerRef.current) {
      const html5QrCode = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Ignore errors
        }
      ).catch((err) => {
        console.error('Error starting scanner:', err);
        setScanning(false);
      });
    }

    return () => {
      stopScanning();
    };
  }, [scanning]);

  const stopScanning = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        setScanning(false);
      }).catch((err) => {
        console.error('Error stopping scanner:', err);
      });
    }
  };

  const startScanning = () => {
    setScanning(true);
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
          {!scanning ? (
            <div className="scanner-placeholder">
              <p>Click the button below to start scanning</p>
              <button className="btn-primary" onClick={startScanning}>
                Start Scanner
              </button>
            </div>
          ) : (
            <div id="scanner" ref={scannerRef} className="scanner-view"></div>
          )}
          {scanning && (
            <button className="btn-secondary" onClick={stopScanning} style={{ marginTop: '10px' }}>
              Stop Scanner
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;

