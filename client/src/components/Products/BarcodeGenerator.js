import React, { useMemo } from 'react';
import JsBarcode from 'jsbarcode';

const generateRandomBarcode = () => {
  // Simple 12-digit numeric code; could be extended to real EAN-13
  let code = '';
  for (let i = 0; i < 12; i += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
};

const BarcodeGenerator = ({ value, onChange }) => {
  const code = useMemo(() => value || generateRandomBarcode(), [value]);

  const svgRef = (node) => {
    if (!node) return;
    try {
      JsBarcode(node, code, {
        format: 'CODE128',
        displayValue: true,
        lineColor: '#000',
        width: 2,
        height: 60,
        margin: 10,
      });
    } catch (e) {
      // ignore rendering errors
    }
  };

  const handleGenerate = () => {
    const newCode = generateRandomBarcode();
    if (onChange) {
      onChange(newCode);
    }
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <svg ref={svgRef} />
      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
        <button type="button" className="btn-secondary" onClick={handleGenerate}>
          Generate New Barcode
        </button>
        {onChange && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => onChange(code)}
          >
            Use This Code
          </button>
        )}
      </div>
    </div>
  );
};

export default BarcodeGenerator;

