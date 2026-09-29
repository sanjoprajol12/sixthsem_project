import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { toast } from 'react-toastify';
import './BarcodeScanner.css';

const BarcodeScanner = ({ onScan, onClose, title = 'Barcode Scanner' }) => {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload' | 'manual'
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState(null);
  const [lastCode, setLastCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [uploadProcessing, setUploadProcessing] = useState(false);

  const scannerContainerId = useRef(`barcode-scanner-${Math.random().toString(36).substring(2, 9)}`).current;
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopScanning = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        // Safe to ignore library cleanup throws
      } finally {
        html5QrCodeRef.current = null;
      }
    }
    setScanning(false);
  }, []);

  const handleDetected = useCallback((code) => {
    const trimmed = (code || '').trim();
    if (!trimmed) return;
    setLastCode(trimmed);
    stopScanning();
    onScan(trimmed);
  }, [onScan, stopScanning]);

  // Start live camera
  useEffect(() => {
    if (activeTab !== 'camera' || !scanning) {
      stopScanning();
      return;
    }

    let isMounted = true;
    setError(null);

    const timer = setTimeout(() => {
      const container = document.getElementById(scannerContainerId);
      if (!container || !isMounted) return;

      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = html5QrCode;

        html5QrCode
          .start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 260, height: 180 },
              formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.ITF
              ],
              experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
              }
            },
            (decodedText) => {
              if (isMounted) {
                handleDetected(decodedText);
              }
            },
            () => {
              // scanning frame with no barcode
            }
          )
          .catch((err) => {
            console.warn('Camera start error:', err);
            if (isMounted) {
              setError('Camera access unavailable. Make sure your browser has camera permission or try the "Upload Image" or "Manual Entry" tab.');
              setScanning(false);
              html5QrCodeRef.current = null;
            }
          });
      } catch (err) {
        console.warn('Scanner init error:', err);
        if (isMounted) {
          setError('Failed to initialize camera scanner.');
          setScanning(false);
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanning();
    };
  }, [activeTab, scanning, scannerContainerId, handleDetected, stopScanning]);

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  // Image file scan
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProcessing(true);
    setError(null);

    try {
      // Use temp scanner instance to read file
      const tempId = `temp-scanner-file-${Date.now()}`;
      const tempEl = document.createElement('div');
      tempEl.id = tempId;
      tempEl.style.display = 'none';
      document.body.appendChild(tempEl);

      const html5QrCode = new Html5Qrcode(tempId);
      const decodedText = await html5QrCode.scanFile(file, true);
      
      try {
        await html5QrCode.clear();
      } catch {}
      tempEl.remove();

      if (decodedText) {
        toast.success(`Barcode detected: ${decodedText}`);
        handleDetected(decodedText);
      }
    } catch (err) {
      console.warn('Scan file error:', err);
      setError('Could not detect a clear barcode in this image. Try another photo or enter the code manually.');
    } finally {
      setUploadProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      toast.warning('Please enter a barcode number');
      return;
    }
    handleDetected(manualCode.trim());
  };

  return (
    <div className="scanner-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="scanner-modal">
        {/* Header */}
        <div className="scanner-header">
          <h3>
            <i className="ri-barcode-box-line" style={{ color: '#2563EB', fontSize: '18px' }} />
            {title}
          </h3>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            title="Close"
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: '#6B7280' }}
          >
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="scanner-tabs">
          <button
            type="button"
            className={`scanner-tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => { setActiveTab('camera'); setScanning(true); setError(null); }}
          >
            <i className="ri-camera-lens-line" /> Live Camera
          </button>
          <button
            type="button"
            className={`scanner-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => { setActiveTab('upload'); stopScanning(); setError(null); }}
          >
            <i className="ri-image-line" /> Upload Image
          </button>
          <button
            type="button"
            className={`scanner-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => { setActiveTab('manual'); stopScanning(); setError(null); }}
          >
            <i className="ri-keyboard-line" /> Manual Entry
          </button>
        </div>

        {/* Content Body */}
        <div className="scanner-content">
          {error && (
            <div className="scanner-error-card">
              <i className="ri-error-warning-line" style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Notice:</strong>
                <div>{error}</div>
              </div>
            </div>
          )}

          {lastCode && (
            <div className="scanner-info-card">
              <i className="ri-check-line" />
              <span>Detected Code: <strong>{lastCode}</strong></span>
            </div>
          )}

          {/* TAB 1: LIVE CAMERA */}
          {activeTab === 'camera' && (
            <div>
              <div className="scanner-view-wrapper">
                <div id={scannerContainerId} className="scanner-view" />
              </div>
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  Point camera at any 1D barcode or QR code
                </span>
                {scanning ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={stopScanning}
                  >
                    <i className="ri-pause-line" /> Pause Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => { setScanning(true); setError(null); }}
                  >
                    <i className="ri-play-line" /> Resume Camera
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeTab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <div
                className="scanner-upload-box"
                onClick={() => !uploadProcessing && fileInputRef.current?.click()}
              >
                <div style={{ fontSize: '36px', color: '#2563EB', marginBottom: '8px' }}>
                  <i className={uploadProcessing ? 'ri-loader-4-line ri-spin' : 'ri-upload-cloud-line'} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827', marginBottom: '4px' }}>
                  {uploadProcessing ? 'Analyzing barcode in image...' : 'Click to select or capture a barcode image'}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Supports PNG, JPG, WEBP with clear barcode visibility
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL INPUT */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Enter Barcode / SKU / UPC Number
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., 8901030364923 or PROD-001"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!manualCode.trim()}
                >
                  <i className="ri-search-line" /> Search Barcode
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="scanner-footer">
          <p>
            Supports CODE128, EAN-13, UPC, Code 39 & QR codes.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
