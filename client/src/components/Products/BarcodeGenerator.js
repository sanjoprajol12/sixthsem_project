import React, { useRef, useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { toast } from 'react-toastify';

export const generateRandomBarcode = () => {
  // Generate standard 12-digit numeric barcode
  let code = '';
  for (let i = 0; i < 12; i += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
};

const BarcodeGenerator = ({ value, onChange, productName, productSku }) => {
  const svgRef = useRef(null);
  const [renderError, setRenderError] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayCode = value?.trim();

  useEffect(() => {
    if (!svgRef.current) return;
    if (!displayCode) {
      setRenderError(false);
      return;
    }

    try {
      JsBarcode(svgRef.current, displayCode, {
        format: 'CODE128',
        displayValue: true,
        font: 'monospace',
        fontSize: 14,
        textMargin: 4,
        lineColor: '#1F2937',
        width: 1.8,
        height: 52,
        margin: 8,
        background: '#FFFFFF'
      });
      setRenderError(false);
    } catch (e) {
      console.warn('Barcode render error:', e);
      setRenderError(true);
    }
  }, [displayCode]);

  const handleGenerate = () => {
    const newCode = generateRandomBarcode();
    if (onChange) {
      onChange(newCode);
    }
  };

  const handleCopy = () => {
    if (!displayCode) return;
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    toast.success('Barcode copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!displayCode || !svgRef.current) return;

    const printWin = window.open('', '_blank', 'width=450,height=400');
    if (!printWin) {
      toast.info('Please allow popups to print barcode labels');
      return;
    }

    const svgContent = svgRef.current.outerHTML;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${displayCode}</title>
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
              margin: 0;
              background: #fff;
            }
            .label-card {
              border: 1.5px dashed #9CA3AF;
              padding: 16px 24px;
              border-radius: 8px;
              text-align: center;
              background: #fff;
              display: inline-block;
            }
            .item-title {
              font-size: 15px;
              font-weight: 700;
              margin-bottom: 4px;
              color: #111827;
            }
            .item-sku {
              font-size: 12px;
              color: #4B5563;
              margin-bottom: 10px;
            }
            @media print {
              .label-card {
                border: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            ${productName ? `<div class="item-title">${productName}</div>` : ''}
            ${productSku ? `<div class="item-sku">SKU: ${productSku}</div>` : ''}
            <div>${svgContent}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div style={{
      marginTop: '8px',
      padding: '12px 14px',
      background: '#F9FAFB',
      border: '1px solid #E5E7EB',
      borderRadius: '8px'
    }}>
      {displayCode ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            maxWidth: '100%',
            overflowX: 'auto'
          }}>
            {renderError ? (
              <div style={{ padding: '10px', color: '#DC2626', fontSize: '13px' }}>
                <i className="ri-error-warning-line" /> Invalid code for CODE128 barcode
              </div>
            ) : (
              <svg ref={svgRef} style={{ display: 'block', margin: '0 auto', maxWidth: '100%', height: 'auto' }} />
            )}
          </div>

          <div style={{
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            {onChange && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleGenerate}
                title="Generate a new random 12-digit barcode"
              >
                <i className="ri-refresh-line" /> New Code
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCopy}
              title="Copy barcode number"
            >
              <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'} />
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handlePrint}
              title="Print barcode label"
            >
              <i className="ri-printer-line" /> Print Label
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            <i className="ri-barcode-line" style={{ marginRight: '6px' }} />
            No barcode set for this product.
          </div>
          {onChange && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleGenerate}
            >
              <i className="ri-magic-line" /> Auto-Generate
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BarcodeGenerator;
