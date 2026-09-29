import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCounts } from '../../context/SidebarCountsContext';
import ActionMenu from '../Common/ActionMenu';
import BarcodeScanner from './BarcodeScanner';
import BarcodeGenerator from './BarcodeGenerator';

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmtCurrency = (v) => `NPR ${(Number(v) || 0).toLocaleString('en-IN')}`;

const STOCK_STATUS_META = {
  OUT_OF_STOCK:  { label: 'Out of Stock',  cls: 'badge badge-danger',           icon: 'ri-close-circle-line' },
  CRITICAL:      { label: 'Critical',      cls: 'badge stock-badge-critical',   icon: 'ri-error-warning-line' },
  LOW_STOCK:     { label: 'Low Stock',     cls: 'badge stock-badge-low',        icon: 'ri-arrow-down-line' },
  HEALTHY:       { label: 'Healthy',       cls: 'badge stock-badge-healthy',    icon: 'ri-checkbox-circle-line' },
  OVERSTOCKED:   { label: 'Overstocked',   cls: 'badge stock-badge-overstocked',icon: 'ri-stack-line' }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Product Form Modal
// ─────────────────────────────────────────────────────────────────────────────
const ProductModal = ({ open, onClose, product, onSaved, categories, suppliers, isSuperAdmin }) => {
  const [form, setForm] = useState({
    name: '', sku: '', category: '', description: '',
    unit_price: '', cost_price: '', quantity: '', min_stock: '', reorder_level: '', max_stock: '',
    unit_of_measure: 'pcs', status: 'pending', supplier: '', brand: '', location: '',
    initial_quantity: '',
    barcode: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showFormScanner, setShowFormScanner] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category?.name || product.category || '',
        description: product.description || '',
        unit_price: product.price !== undefined ? product.price : (product.unit_price ?? ''),
        cost_price: product.cost !== undefined ? product.cost : (product.cost_price ?? ''),
        quantity: product.quantity ?? 0,
        min_stock: product.minimum_stock !== undefined ? product.minimum_stock : (product.min_stock ?? '5'),
        reorder_level: product.reorder_level !== undefined ? product.reorder_level : '10',
        max_stock: product.maximum_stock !== undefined ? product.maximum_stock : (product.max_stock ?? '200'),
        unit_of_measure: product.unit_of_measure || 'pcs',
        status: product.status || (isSuperAdmin ? 'approved' : 'pending'),
        supplier: product.supplier_id?._id || product.supplier_id || product.supplier?._id || product.supplier || '',
        brand: product.brand || '',
        location: product.location || '',
        initial_quantity: ''
      });
    } else {
      setForm({
        name: '', sku: '', barcode: '', category: '', description: '',
        unit_price: '', cost_price: '', quantity: '0', min_stock: '5', reorder_level: '10', max_stock: '200',
        unit_of_measure: 'pcs', status: isSuperAdmin ? 'approved' : 'pending', supplier: '', brand: '', location: '',
        initial_quantity: '0'
      });
    }
    setErrors({});
  }, [product, open, isSuperAdmin]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name = 'Name is required';
    if (!form.sku.trim())    e.sku = 'SKU is required';
    if (form.unit_price === '' || isNaN(form.unit_price) || Number(form.unit_price) < 0) e.unit_price = 'Valid selling price required';
    if (form.cost_price === '' || isNaN(form.cost_price) || Number(form.cost_price) < 0) e.cost_price = 'Valid cost price required';
    if (Number(form.cost_price) > Number(form.unit_price)) e.cost_price = 'Cost price cannot exceed selling price';
    if (form.reorder_level && Number(form.reorder_level) < 0) e.reorder_level = 'Must be ≥ 0';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        barcode: form.barcode ? form.barcode.trim() : null,
        category: form.category || 'General',
        description: form.description || '',
        price: Number(form.unit_price) || 0,
        cost: Number(form.cost_price) || 0,
        unit_of_measure: form.unit_of_measure || 'pcs',
        reorder_level: Number(form.reorder_level) || 10,
        minimum_stock: Number(form.min_stock) || 5,
        maximum_stock: Number(form.max_stock) || 200,
        brand: form.brand || '',
        status: form.status || (isSuperAdmin ? 'approved' : 'pending')
      };

      if (form.supplier) {
        payload.supplier_id = form.supplier;
      }
      if (!product) {
        payload.quantity = Number(form.initial_quantity) || 0;
      }

      if (product) {
        await axios.put(`/api/products/${product._id}`, payload);
        toast.success('Product updated');
      } else {
        await axios.post('/api/products', payload);
        toast.success(isSuperAdmin ? 'Product created' : 'Product created and submitted for approval');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const field = (name, label, opts = {}) => (
    <div className="form-group">
      <label className={`form-label${opts.required ? ' form-label-required' : ''}`}>{label}</label>
      {opts.type === 'select' ? (
        <select
          className={`form-control${errors[name] ? ' error' : ''}`}
          value={form[name]}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        >
          <option value="">-- Select {label} --</option>
          {opts.options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : opts.type === 'textarea' ? (
        <textarea
          className={`form-control${errors[name] ? ' error' : ''}`}
          rows={3}
          placeholder={opts.placeholder}
          value={form[name]}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        />
      ) : (
        <input
          type={opts.type || 'text'}
          className={`form-control${errors[name] ? ' error' : ''}`}
          placeholder={opts.placeholder}
          value={form[name]}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          disabled={opts.disabled}
        />
      )}
      {errors[name] && <span className="form-error"><i className="ri-error-warning-line" /> {errors[name]}</span>}
      {opts.helper && <span className="form-helper">{opts.helper}</span>}
    </div>
  );

  const unitOptions = ['pcs', 'kg', 'g', 'L', 'mL', 'box', 'pair', 'set', 'pack', 'roll', 'sheet', 'bottle'].map(u => ({ value: u, label: u }));
  const catOptions = categories.map(c => ({ value: c.name, label: c.name }));
  const supOptions = suppliers.map(s => ({ value: s._id || s.id, label: s.name }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">{product ? <><i className="ri-edit-line" /> Edit Product</> : <><i className="ri-add-circle-line" /> Add Product</>}</div>
            <div className="modal-subtitle">
              {product ? `Editing: ${product.name}` : 'Add a new product to inventory'}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><i className="ri-close-line" /></button>
        </div>
        <div className="modal-body">
          {/* Basic Information */}
          <div className="form-section">
            <div className="form-section-title"><i className="ri-file-list-3-line" /> Basic Information</div>
            <div className="form-grid">
              {field('name', 'Product Name', { required: true, placeholder: 'e.g., Basmati Rice 25kg' })}
              {field('sku', 'SKU / Product Code', { required: true, placeholder: 'e.g., RICE-BSMT-25', disabled: !!product, helper: product ? 'SKU cannot be changed after creation' : 'Unique identifier for this product' })}
            </div>
            <div className="form-grid mt-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {field('category', 'Category', { type: 'select', options: catOptions })}
              {field('brand', 'Brand', { placeholder: 'Brand name' })}
              {field('unit_of_measure', 'Unit of Measure', { type: 'select', required: true, options: unitOptions })}
            </div>
            {field('description', 'Description', { type: 'textarea', placeholder: 'Product description...' })}

            {/* Barcode & Device Scan */}
            <div className="form-group" style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  <i className="ri-barcode-line" style={{ marginRight: '4px' }} /> Barcode / UPC / EAN
                </label>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => setShowFormScanner(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="ri-camera-line" /> Scan from Device
                </button>
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="Enter or generate barcode (e.g. 890123456789)"
                value={form.barcode}
                onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))}
              />
              <BarcodeGenerator
                value={form.barcode}
                productName={form.name}
                productSku={form.sku}
                onChange={(code) => setForm(p => ({ ...p, barcode: code }))}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="form-section">
            <div className="form-section-title"><i className="ri-money-dollar-circle-line" /> Pricing</div>
            <div className="form-grid">
              {field('cost_price', 'Cost Price (NPR)', { type: 'number', required: true, placeholder: '0.00', helper: 'Price you pay to supplier' })}
              {field('unit_price', 'Selling Price (NPR)', { type: 'number', required: true, placeholder: '0.00', helper: 'Price you charge customers' })}
            </div>
            {form.cost_price && form.unit_price && Number(form.unit_price) > 0 && (
              <div className="alert alert-info" style={{ marginTop: '8px', marginBottom: 0 }}>
                <span className="alert-icon"><i className="ri-information-line" /></span>
                Profit Margin: {((1 - Number(form.cost_price) / Number(form.unit_price)) * 100).toFixed(1)}%
                ({fmtCurrency(Number(form.unit_price) - Number(form.cost_price))} per {form.unit_of_measure})
              </div>
            )}
          </div>

          {/* Stock Levels */}
          <div className="form-section">
            <div className="form-section-title"><i className="ri-bar-chart-line" /> Stock Configuration</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {!product && field('initial_quantity', 'Opening Stock', { type: 'number', placeholder: '0', helper: 'Initial inventory count' })}
              {field('min_stock', 'Min Stock', { type: 'number', placeholder: '0', helper: 'Minimum safety level' })}
              {field('reorder_level', 'Reorder Level', { type: 'number', placeholder: '10', helper: 'Triggers low stock alert' })}
              {field('max_stock', 'Max Stock', { type: 'number', placeholder: '—', helper: 'Maximum capacity' })}
            </div>
          </div>

          {/* Logistics & Status */}
          <div className="form-section" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
            <div className="form-section-title"><i className="ri-building-line" /> Logistics & Status</div>
            <div className="form-grid">
              {field('supplier', 'Default Supplier', { type: 'select', options: supOptions })}
              {field('location', 'Storage Location', { placeholder: 'e.g., Warehouse A, Shelf B3' })}
            </div>
            {isSuperAdmin ? (
              field('status', 'Approval Status', { type: 'select', options: [
                { value: 'approved',    label: 'Approved' },
                { value: 'pending',     label: 'Pending' },
                { value: 'disapproved', label: 'Disapproved' },
                { value: 'active',      label: 'Active' },
                { value: 'inactive',    label: 'Inactive' }
              ]})
            ) : (
              <div className="form-group">
                <label className="form-label">Status</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.status.toUpperCase()}
                  disabled
                />
                <span className="form-helper">New products require Super Admin approval</span>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>

      {showFormScanner && (
        <BarcodeScanner
          title="Scan Product Barcode"
          onScan={(code) => {
            setForm(p => ({ ...p, barcode: code }));
            setShowFormScanner(false);
            toast.success(`Barcode captured: ${code}`);
          }}
          onClose={() => setShowFormScanner(false)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Adjust Stock Modal
// ─────────────────────────────────────────────────────────────────────────────
const AdjustStockModal = ({ open, onClose, product, onSaved }) => {
  const [form, setForm] = useState({ adjustment_type: 'manual_add', quantity: '', reason: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const TYPES = [
    { value: 'manual_add',    label: 'Manual Addition',    dir: 'increase', desc: 'Add stock not from PO' },
    { value: 'manual_remove', label: 'Manual Removal',     dir: 'decrease', desc: 'Remove stock manually' },
    { value: 'found',         label: 'Stock Found',        dir: 'increase', desc: 'Previously missing stock found' },
    { value: 'expired',       label: 'Expired',            dir: 'decrease', desc: 'Write off expired goods' },
    { value: 'return_in',     label: 'Customer Return',    dir: 'increase', desc: 'Returned by customer' },
    { value: 'return_out',    label: 'Supplier Return',    dir: 'decrease', desc: 'Returned to supplier' },
    { value: 'cycle_count',   label: 'Cycle Count',        dir: 'neutral',  desc: 'Physical count correction' }
  ];

  const handleSubmit = async () => {
    if (!form.quantity || Number(form.quantity) <= 0) {
      toast.error('Enter a valid quantity > 0'); return;
    }
    if (!form.reason.trim()) { toast.error('Reason is required'); return; }

    setLoading(true);
    try {
      await axios.post(`/api/inventory/products/${product._id}/adjust`, {
        adjustment_type: form.adjustment_type,
        quantity: Number(form.quantity),
        reason: form.reason,
        notes: form.notes
      });
      toast.success('Stock adjusted');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const selectedType = TYPES.find(t => t.value === form.adjustment_type);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div>
            <div className="modal-title"><i className="ri-scales-line" /> Adjust Stock</div>
            <div className="modal-subtitle">{product?.name} — Current: {product?.quantity} {product?.unit_of_measure || 'pcs'}</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><i className="ri-close-line" /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label form-label-required">Adjustment Type</label>
            <select className="form-control" value={form.adjustment_type}
              onChange={e => setForm(p => ({ ...p, adjustment_type: e.target.value }))}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
            </select>
          </div>
          {selectedType && (
            <div className={`alert ${selectedType.dir === 'increase' ? 'alert-success' : selectedType.dir === 'decrease' ? 'alert-warning' : 'alert-info'}`}
              style={{ marginBottom: 0 }}>
              <span className="alert-icon"><i className="ri-information-line" /></span>
              <div>
                <strong>{selectedType.label}</strong>
                <div style={{ marginTop: '2px', fontSize: '12px' }}>{selectedType.desc}</div>
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label form-label-required">Quantity</label>
            <input type="number" className="form-control" placeholder="0"
              value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
              min="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label form-label-required">Reason</label>
            <input type="text" className="form-control" placeholder="Brief reason for adjustment..."
              value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-control" rows={2} placeholder="Additional details..."
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Applying...' : 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  View Product Details Modal
// ─────────────────────────────────────────────────────────────────────────────
const ViewProductModal = ({ open, onClose, product, onNewSale, onNewPurchase }) => {
  if (!open || !product) return null;

  const costVal = Number(product.cost !== undefined ? product.cost : product.cost_price) || 0;
  const priceVal = Number(product.price !== undefined ? product.price : product.unit_price) || 0;
  const margin = priceVal > 0 ? ((1 - costVal / priceVal) * 100).toFixed(1) + '%' : '—';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div>
            <div className="modal-title"><i className="ri-eye-line" /> Product Details</div>
            <div className="modal-subtitle">{product.name} (SKU: {product.sku})</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><i className="ri-close-line" /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Current Status:</span>
            <span className={`status-badge status-${product.status || 'approved'}`}>
              <i className={
                product.status === 'approved' || product.status === 'active' ? 'ri-checkbox-circle-line' :
                product.status === 'pending' ? 'ri-time-line' :
                product.status === 'disapproved' ? 'ri-close-circle-line' : 'ri-indeterminate-circle-line'
              } />
              {product.status || 'Approved'}
            </span>
          </div>

          {/* Quick Action Buttons inside Details Modal */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: '#059669',
                borderColor: '#059669'
              }}
              onClick={() => { onClose(); onNewSale && onNewSale(product); }}
            >
              <i className="ri-shopping-cart-line" /> New Sale
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={() => { onClose(); onNewPurchase && onNewPurchase(product); }}
            >
              <i className="ri-truck-line" /> New Purchase
            </button>
          </div>

          {product.disapproval_reason && (
            <div className="alert alert-danger" style={{ marginBottom: 0 }}>
              <span className="alert-icon"><i className="ri-error-warning-line" /></span>
              <div>
                <strong>Disapproval Reason:</strong>
                <div>{product.disapproval_reason}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--gray-100)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Category</div>
              <div style={{ fontWeight: 600 }}>{product.category?.name || product.category || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Supplier</div>
              <div style={{ fontWeight: 600 }}>{product.supplier_id?.name || product.supplier?.name || product.supplier_name || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Cost Price</div>
              <div style={{ fontWeight: 600 }}>{fmtCurrency(costVal)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Selling Price</div>
              <div style={{ fontWeight: 600 }}>{fmtCurrency(priceVal)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Profit Margin</div>
              <div style={{ fontWeight: 600, color: '#059669' }}>{margin}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Current Stock</div>
              <div style={{ fontWeight: 600 }}>{product.quantity} {product.unit_of_measure}</div>
            </div>
          </div>

          {product.description && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Description</div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>{product.description}</div>
            </div>
          )}

          {/* Barcode Preview & Print in Details */}
          {product.barcode ? (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                <i className="ri-barcode-line" style={{ marginRight: '4px' }} /> Barcode Label
              </div>
              <BarcodeGenerator
                value={product.barcode}
                productName={product.name}
                productSku={product.sku}
              />
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="ri-barcode-line" /> No barcode registered for this product
            </div>
          )}

          {product.approved_by && (
            <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
              Approved by: {product.approved_by?.full_name || product.approved_by?.username || 'Admin'}
              {product.approved_at && ` on ${new Date(product.approved_at).toLocaleDateString()}`}
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => { onClose(); onNewSale && onNewSale(product); }}
            >
              <i className="ri-shopping-cart-line" /> New Sale
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => { onClose(); onNewPurchase && onNewPurchase(product); }}
            >
              <i className="ri-truck-line" /> New Purchase
            </button>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Quick Sale Modal
// ─────────────────────────────────────────────────────────────────────────────
const QuickSaleModal = ({ open, onClose, product, onSaved }) => {
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setUnitPrice(product.price !== undefined ? product.price : (product.unit_price ?? 0));
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setPaymentMethod('cash');
      setNotes('');
    }
  }, [product, open]);

  if (!open || !product) return null;

  const maxStock = Number(product.quantity) || 0;
  const numQty = parseInt(quantity, 10) || 0;
  const numPrice = parseFloat(unitPrice) || 0;
  const grandTotal = numQty * numPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numQty <= 0) {
      toast.warning('Quantity must be greater than 0');
      return;
    }
    if (numQty > maxStock) {
      toast.error(`Cannot sell more than available stock (${maxStock} ${product.unit_of_measure || 'pcs'})`);
      return;
    }
    if (numPrice < 0) {
      toast.warning('Price cannot be negative');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim(),
        payment_method: paymentMethod,
        payment_status: 'paid',
        status: 'completed',
        notes: notes ? `Quick Sale: ${notes}` : `Quick Sale for ${product.name}`,
        items: [
          {
            product_id: product._id || product.id,
            quantity: numQty,
            unit_price: numPrice,
            discount: 0
          }
        ]
      };

      await axios.post('/api/sales-orders', payload);
      toast.success(`Sale completed! ${numQty} ${product.unit_of_measure || 'pcs'} sold for ${fmtCurrency(grandTotal)}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div>
            <div className="modal-title"><i className="ri-shopping-cart-line" style={{ color: '#059669' }} /> New Sale</div>
            <div className="modal-subtitle">{product.name} (SKU: {product.sku})</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><i className="ri-close-line" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#F0FDF4', padding: '12px 14px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Available Stock</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: maxStock <= 0 ? '#DC2626' : '#15803D' }}>
                  {maxStock} {product.unit_of_measure || 'pcs'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Standard Price</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803D' }}>
                  {fmtCurrency(product.price !== undefined ? product.price : product.unit_price)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label form-label-required">Quantity to Sell</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max={maxStock > 0 ? maxStock : undefined}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Unit Price (NPR)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  min="0"
                  value={unitPrice}
                  onChange={e => setUnitPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Walk-in Customer"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Customer Phone (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 98XXXXXXXX"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card / POS</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="qr_code">QR Payment / Fonepay</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Total Amount</label>
                <div style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#059669'
                }}>
                  {fmtCurrency(grandTotal)}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Order Notes (optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Optional notes or remarks..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: '#059669', borderColor: '#059669' }}
              disabled={loading || maxStock <= 0}
            >
              {loading ? 'Processing...' : `Confirm Sale (${fmtCurrency(grandTotal)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Quick Purchase Order Modal
// ─────────────────────────────────────────────────────────────────────────────
const QuickPurchaseModal = ({ open, onClose, product, suppliers = [], onSaved }) => {
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [unitCost, setUnitCost] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      const defSup = product.supplier_id?._id || product.supplier_id || product.supplier?._id || product.supplier || (suppliers[0]?._id || suppliers[0]?.id || '');
      setSupplierId(defSup || '');
      setQuantity(product.reorder_level || 10);
      setUnitCost(product.cost !== undefined ? product.cost : (product.cost_price ?? 0));
      setExpectedDate('');
      setNotes('');
    }
  }, [product, suppliers, open]);

  if (!open || !product) return null;

  const numQty = parseInt(quantity, 10) || 0;
  const numCost = parseFloat(unitCost) || 0;
  const totalCost = numQty * numCost;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) {
      toast.warning('Please select a supplier for this purchase order');
      return;
    }
    if (numQty <= 0) {
      toast.warning('Quantity must be greater than 0');
      return;
    }
    if (numCost < 0) {
      toast.warning('Cost price cannot be negative');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        supplier_id: supplierId,
        status: 'submitted',
        expected_delivery_date: expectedDate || null,
        notes: notes ? `Quick PO: ${notes}` : `Restock order for ${product.name}`,
        items: [
          {
            product_id: product._id || product.id,
            quantity: numQty,
            unit_price: numCost,
            discount: 0
          }
        ]
      };

      await axios.post('/api/purchase-orders', payload);
      toast.success(`Purchase order created for ${numQty} ${product.unit_of_measure || 'pcs'} of "${product.name}"`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div>
            <div className="modal-title"><i className="ri-truck-line" style={{ color: '#2563EB' }} /> New Purchase Order</div>
            <div className="modal-subtitle">{product.name} (SKU: {product.sku})</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><i className="ri-close-line" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#EFF6FF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#1E40AF', textTransform: 'uppercase', fontWeight: 600 }}>Current Stock</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1D4ED8' }}>
                  {product.quantity || 0} {product.unit_of_measure || 'pcs'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#1E40AF', textTransform: 'uppercase', fontWeight: 600 }}>Reorder Level</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#D97706' }}>
                  {product.reorder_level || 10} {product.unit_of_measure || 'pcs'}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">Supplier</label>
              <select
                className="form-control"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                required
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name} {s.contact_person ? `(${s.contact_person})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label form-label-required">Quantity to Order</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Unit Cost (NPR)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  min="0"
                  value={unitCost}
                  onChange={e => setUnitCost(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Expected Delivery Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={expectedDate}
                  onChange={e => setExpectedDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Total Estimated Cost</label>
                <div style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#2563EB'
                }}>
                  {fmtCurrency(totalCost)}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="PO reference or instructions..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !supplierId}
            >
              {loading ? 'Submitting...' : `Create Order (${fmtCurrency(totalCost)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Barcode Label View & Print Modal
// ─────────────────────────────────────────────────────────────────────────────
const BarcodeViewModal = ({ open, onClose, product }) => {
  if (!open || !product) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <div>
            <div className="modal-title"><i className="ri-barcode-box-line" /> Barcode Label</div>
            <div className="modal-subtitle">{product.name} (SKU: {product.sku})</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><i className="ri-close-line" /></button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <BarcodeGenerator
            value={product.barcode || product.sku}
            productName={product.name}
            productSku={product.sku}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Main Products Component
// ─────────────────────────────────────────────────────────────────────────────
const Products = () => {
  const { user } = useAuth();
  const { refreshCounts } = useSidebarCounts();
  const navigate = useNavigate();
  const location = useLocation();

  const rawRole = (user?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const isSuperAdmin = rawRole === 'super_admin' || rawRole === 'superadmin';
  const isAdmin = isSuperAdmin || rawRole === 'admin';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterProductStatus, setFilterProductStatus] = useState('all');
  const [filterStockStatus, setFilterStockStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  // Modals & Action Targets
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [saleModalProduct, setSaleModalProduct] = useState(null);
  const [purchaseModalProduct, setPurchaseModalProduct] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [disapproveTarget, setDisapproveTarget] = useState(null);
  const [disapproveReason, setDisapproveReason] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState(null);

  // Sync URL search params with filter states
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlStatus = params.get('status');
    if (urlStatus) {
      setFilterProductStatus(urlStatus);
    } else {
      setFilterProductStatus('all');
    }
    if (params.get('search')) setSearch(params.get('search'));
    if (params.get('category')) setFilterCategory(params.get('category'));
  }, [location.search]);

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterProductStatus && filterProductStatus !== 'all') params.set('status', filterProductStatus);
      if (filterStockStatus && filterStockStatus !== 'All') params.set('stockStatus', filterStockStatus);
      if (filterCategory) params.set('category', filterCategory);
      if (filterSupplier) params.set('supplier', filterSupplier);
      params.set('page', page);
      params.set('limit', LIMIT);

      const res = await axios.get(`/api/products?${params}`);
      if (Array.isArray(res.data)) {
        setProducts(res.data);
        setTotal(res.data.length);
      } else {
        setProducts(res.data.products || res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, filterProductStatus, filterStockStatus, filterCategory, filterSupplier, page]);

  const fetchMeta = async () => {
    const [catRes, supRes] = await Promise.all([
      axios.get('/api/categories').catch(() => ({ data: [] })),
      axios.get('/api/suppliers').catch(() => ({ data: [] }))
    ]);
    setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.categories || []);
    setSuppliers(Array.isArray(supRes.data) ? supRes.data : supRes.data.suppliers || []);
  };

  useEffect(() => { fetchMeta(); }, []);
  useEffect(() => { setLoading(true); fetchProducts(); }, [fetchProducts]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterProductStatus('all');
    setFilterStockStatus('All');
    setFilterCategory('');
    setFilterSupplier('');
    setPage(1);
    navigate('/products');
  };

  const hasActiveFilters = Boolean(
    search ||
    (filterProductStatus && filterProductStatus !== 'all') ||
    (filterStockStatus && filterStockStatus !== 'All') ||
    filterCategory ||
    filterSupplier
  );

  // Approval handlers
  const handleApprove = async (product) => {
    try {
      await axios.put(`/api/products/${product._id}/approve`);
      toast.success(`"${product.name}" approved successfully!`);
      setApproveTarget(null);
      fetchProducts();
      refreshCounts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve product');
    }
  };

  const handleDisapprove = async (product, reason) => {
    try {
      await axios.put(`/api/products/${product._id}/disapprove`, { reason });
      toast.success(`"${product.name}" marked as disapproved.`);
      setDisapproveTarget(null);
      setDisapproveReason('');
      fetchProducts();
      refreshCounts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to disapprove product');
    }
  };

  const handleDelete = async (product) => {
    try {
      await axios.delete(`/api/products/${product._id}`);
      toast.success('Product archived');
      setConfirmDelete(null);
      fetchProducts();
      refreshCounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Row Action Menu builder based on user role + product status
  const getRowActions = (p) => {
    const actions = [
      {
        label: 'View Details',
        icon: 'ri-eye-line',
        onClick: () => setViewProduct(p)
      },
      {
        label: 'New Sale',
        icon: 'ri-shopping-cart-line',
        onClick: () => setSaleModalProduct(p)
      },
      {
        label: 'New Purchase',
        icon: 'ri-truck-line',
        onClick: () => setPurchaseModalProduct(p)
      },
      {
        label: 'Print Barcode',
        icon: 'ri-barcode-line',
        onClick: () => setBarcodeModalProduct(p)
      },
      {
        label: 'Edit',
        icon: 'ri-edit-line',
        onClick: () => { setEditProduct(p); setShowModal(true); }
      },
      {
        label: 'Adjust Stock',
        icon: 'ri-scales-line',
        onClick: () => setAdjustProduct(p)
      },
      {
        label: 'View Ledger',
        icon: 'ri-file-list-3-line',
        onClick: () => navigate(`/inventory?product=${p._id}`)
      }
    ];

    // Super Admin approval actions
    if (isSuperAdmin) {
      if (p.status === 'pending') {
        actions.push({
          label: 'Approve',
          icon: 'ri-checkbox-circle-line',
          success: true,
          onClick: () => setApproveTarget(p)
        });
        actions.push({
          label: 'Disapprove',
          icon: 'ri-close-circle-line',
          warning: true,
          onClick: () => { setDisapproveTarget(p); setDisapproveReason(''); }
        });
      } else if (p.status === 'approved' || p.status === 'active') {
        actions.push({
          label: 'Disapprove',
          icon: 'ri-close-circle-line',
          warning: true,
          onClick: () => { setDisapproveTarget(p); setDisapproveReason(''); }
        });
      } else if (p.status === 'disapproved') {
        actions.push({
          label: 'Approve',
          icon: 'ri-checkbox-circle-line',
          success: true,
          onClick: () => setApproveTarget(p)
        });
      }
    }

    // Delete / Archive
    if (isAdmin) {
      actions.push({
        label: 'Archive Product',
        icon: 'ri-archive-line',
        danger: true,
        onClick: () => setConfirmDelete(p)
      });
    }

    return actions;
  };

  // Stats
  const outCount  = products.filter(p => p.stock_status === 'OUT_OF_STOCK').length;
  const lowCount  = products.filter(p => p.stock_status === 'LOW_STOCK' || p.stock_status === 'CRITICAL').length;
  const totalVal  = products.reduce((a, p) => {
    const costVal = Number(p.cost !== undefined ? p.cost : p.cost_price) || 0;
    return a + ((p.quantity || 0) * costVal);
  }, 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Products</h1>
          <p>Manage your product catalog, stock levels, and approval status</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setShowScanner(true)}>
            <i className="ri-barcode-box-line" /> Scan Barcode
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/inventory')}>
            <i className="ri-file-list-3-line" /> Stock Ledger
          </button>
          <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowModal(true); }}>
            <i className="ri-add-circle-line" /> Add Product
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        {[
          { label: 'Total Products', value: total,    icon: 'ri-box-3-line',              color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Out of Stock',   value: outCount, icon: 'ri-close-circle-line',        color: '#DC2626', bg: '#FEF2F2' },
          { label: 'Need Reorder',   value: lowCount, icon: 'ri-arrow-down-line',           color: '#D97706', bg: '#FFFBEB' },
          { label: 'Inventory Value', value: `NPR ${(totalVal/1000).toFixed(0)}K`, icon: 'ri-money-dollar-circle-line', color: '#059669', bg: '#ECFDF5' }
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-accent" style={{ background: s.color }} />
            <div className="stat-card-top">
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-icon" style={{ background: s.bg, color: s.color }}>
                <i className={s.icon} />
              </div>
            </div>
            <div className="stat-card-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table & Filtering */}
      <div className="table-container">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div className="table-filters" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <div className="table-search" style={{ position: 'relative' }}>
              <i className="ri-search-line table-search-icon" />
              <input
                type="text"
                placeholder="Search products or barcode..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingRight: '36px' }}
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                title="Scan barcode with camera or file"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#4B5563',
                  fontSize: '16px',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <i className="ri-barcode-line" />
              </button>
            </div>

            {/* Approval / Record Status Filter */}
            <select
              className="filter-select"
              value={filterProductStatus}
              onChange={e => {
                setFilterProductStatus(e.target.value);
                setPage(1);
                const sp = new URLSearchParams(location.search);
                if (e.target.value && e.target.value !== 'all') {
                  sp.set('status', e.target.value);
                } else {
                  sp.delete('status');
                }
                navigate(`/products?${sp.toString()}`);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="disapproved">Disapproved</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Category Filter */}
            <select
              className="filter-select"
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c._id || c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* Supplier Filter */}
            <select
              className="filter-select"
              value={filterSupplier}
              onChange={e => { setFilterSupplier(e.target.value); setPage(1); }}
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
              ))}
            </select>

            {/* Stock Level Filter */}
            <select
              className="filter-select"
              value={filterStockStatus}
              onChange={e => { setFilterStockStatus(e.target.value); setPage(1); }}
            >
              <option value="All">All Stock Levels</option>
              <option value="HEALTHY">Healthy</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="CRITICAL">Critical</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="OVERSTOCKED">Overstocked</option>
            </select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleClearFilters}
                title="Clear all active filters"
              >
                <i className="ri-filter-off-line" style={{ marginRight: '4px' }} />
                Clear Filters
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>{products.length} products displayed</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div className="table-empty">
            <i className="ri-box-3-line table-empty-icon" style={{ fontSize: '32px', color: 'var(--gray-300)' }} />
            <div className="table-empty-text">No products found</div>
            <div className="table-empty-sub">
              {hasActiveFilters ? 'Try adjusting your filters or click "Clear Filters"' : 'Add your first product to get started'}
            </div>
            {hasActiveFilters && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: '12px' }} onClick={handleClearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Margin</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Supplier</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const stockMeta = STOCK_STATUS_META[p.stock_status] || STOCK_STATUS_META['HEALTHY'];
                const costVal = Number(p.cost !== undefined ? p.cost : p.cost_price) || 0;
                const priceVal = Number(p.price !== undefined ? p.price : p.unit_price) || 0;
                const margin = priceVal > 0
                  ? ((1 - costVal / priceVal) * 100).toFixed(0) + '%'
                  : '—';
                const maxCapacity = p.maximum_stock || p.max_stock || (p.reorder_level ? p.reorder_level * 3 : 100);
                const stockPct = maxCapacity > 0
                  ? Math.min(100, Math.round((p.quantity / maxCapacity) * 100))
                  : null;

                const pStatus = p.status || 'approved';

                return (
                  <tr key={p._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>SKU: {p.sku}</span>
                        {p.barcode && (
                          <span
                            onClick={() => setBarcodeModalProduct(p)}
                            title="Click to view/print barcode"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: '#F3F4F6',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              color: '#374151',
                              cursor: 'pointer'
                            }}
                          >
                            <i className="ri-barcode-line" /> {p.barcode}
                          </span>
                        )}
                        {p.brand && <span>· {p.brand}</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{p.category?.name || p.category || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{fmtCurrency(costVal)}</td>
                    <td style={{ fontWeight: 600 }}>{fmtCurrency(priceVal)}</td>
                    <td>
                      <span style={{
                        color: Number(margin) > 20 ? '#059669' : Number(margin) > 10 ? '#D97706' : '#DC2626',
                        fontWeight: 600, fontSize: '13px'
                      }}>{margin}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>
                        {p.quantity} <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: '11px' }}>{p.unit_of_measure}</span>
                      </div>
                      {stockPct !== null && (
                        <div className="stock-bar-track" style={{ marginTop: '4px', width: '80px' }}>
                          <div className="stock-bar-fill" style={{
                            width: `${stockPct}%`,
                            background: p.stock_status === 'OUT_OF_STOCK' ? '#DC2626'
                              : p.stock_status === 'CRITICAL' ? '#EA580C'
                              : p.stock_status === 'LOW_STOCK' ? '#D97706'
                              : p.stock_status === 'OVERSTOCKED' ? '#7C3AED'
                              : '#059669'
                          }} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span className={`status-badge status-${pStatus}`}>
                          <i className={
                            pStatus === 'approved' || pStatus === 'active' ? 'ri-checkbox-circle-line' :
                            pStatus === 'pending' ? 'ri-time-line' :
                            pStatus === 'disapproved' ? 'ri-close-circle-line' : 'ri-indeterminate-circle-line'
                          } />
                          {pStatus}
                        </span>
                        {p.stock_status && p.stock_status !== 'HEALTHY' && (
                          <span className={stockMeta.cls} style={{ fontSize: '10px', padding: '1px 5px' }}>
                            <i className={stockMeta.icon} /> {stockMeta.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
                      {p.supplier_id?.name || p.supplier_name || p.supplier?.name || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <ActionMenu actions={getRowActions(p)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <ProductModal
        open={showModal}
        onClose={() => setShowModal(false)}
        product={editProduct}
        onSaved={() => { fetchProducts(); refreshCounts(); }}
        categories={categories}
        suppliers={suppliers}
        isSuperAdmin={isSuperAdmin}
      />

      {adjustProduct && (
        <AdjustStockModal
          open={!!adjustProduct}
          onClose={() => setAdjustProduct(null)}
          product={adjustProduct}
          onSaved={() => { fetchProducts(); refreshCounts(); }}
        />
      )}

      {viewProduct && (
        <ViewProductModal
          open={!!viewProduct}
          onClose={() => setViewProduct(null)}
          product={viewProduct}
          onNewSale={(p) => setSaleModalProduct(p)}
          onNewPurchase={(p) => setPurchaseModalProduct(p)}
        />
      )}

      {/* Quick Sale Modal */}
      {saleModalProduct && (
        <QuickSaleModal
          open={!!saleModalProduct}
          product={saleModalProduct}
          onClose={() => setSaleModalProduct(null)}
          onSaved={() => { fetchProducts(); refreshCounts(); }}
        />
      )}

      {/* Quick Purchase Order Modal */}
      {purchaseModalProduct && (
        <QuickPurchaseModal
          open={!!purchaseModalProduct}
          product={purchaseModalProduct}
          suppliers={suppliers}
          onClose={() => setPurchaseModalProduct(null)}
          onSaved={() => { fetchProducts(); refreshCounts(); }}
        />
      )}

      {/* Super Admin Approve Confirmation Modal */}
      {approveTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setApproveTarget(null)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <div className="modal-title"><i className="ri-checkbox-circle-line" style={{ color: 'var(--success)' }} /> Approve Product</div>
              <button className="modal-close-btn" onClick={() => setApproveTarget(null)}><i className="ri-close-line" /></button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '24px' }}>
              <div className="confirm-modal-icon" style={{ margin: '0 auto 16px', background: 'var(--success-light)', color: 'var(--success)' }}>
                <i className="ri-check-line" style={{ fontSize: '24px' }} />
              </div>
              <p style={{ fontWeight: 600, fontSize: '15px' }}>Approve "{approveTarget.name}"?</p>
              <p style={{ color: '#6B7280', fontSize: '13px', marginTop: '8px' }}>
                This product will become approved and accessible across the entire system.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setApproveTarget(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleApprove(approveTarget)}>
                Approve Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Disapprove Confirmation Modal */}
      {disapproveTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDisapproveTarget(null)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <div className="modal-title"><i className="ri-close-circle-line" style={{ color: 'var(--danger)' }} /> Disapprove Product</div>
              <button className="modal-close-btn" onClick={() => setDisapproveTarget(null)}><i className="ri-close-line" /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="confirm-modal-icon danger" style={{ margin: '0 auto 16px' }}>
                <i className="ri-close-line" style={{ fontSize: '24px', color: 'var(--danger)' }} />
              </div>
              <p style={{ fontWeight: 600, fontSize: '15px', textAlign: 'center' }}>Disapprove "{disapproveTarget.name}"?</p>
              <p style={{ color: '#6B7280', fontSize: '13px', marginTop: '6px', textAlign: 'center' }}>
                The product will be marked as disapproved and hidden from active sales.
              </p>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Disapproval Reason (Optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g., Incomplete documentation or incorrect price specifications"
                  value={disapproveReason}
                  onChange={e => setDisapproveReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDisapproveTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDisapprove(disapproveTarget, disapproveReason)}>
                Disapprove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <div className="modal-title"><i className="ri-archive-line" /> Archive Product</div>
              <button className="modal-close-btn" onClick={() => setConfirmDelete(null)}><i className="ri-close-line" /></button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '24px' }}>
              <div className="confirm-modal-icon danger" style={{ margin: '0 auto 16px' }}>
                <i className="ri-archive-line" style={{ fontSize: '24px', color: 'var(--danger)' }} />
              </div>
              <p style={{ fontWeight: 600, fontSize: '15px' }}>Archive "{confirmDelete.name}"?</p>
              <p style={{ color: '#6B7280', fontSize: '13px', marginTop: '8px' }}>
                Products with sales history will be archived (not deleted) to preserve records.
                You can restore them later.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          title="Scan Barcode to Lookup Product"
          onScan={async (scannedCode) => {
            setShowScanner(false);
            try {
              const res = await axios.get(`/api/products/barcode/${encodeURIComponent(scannedCode)}`);
              if (res.data) {
                toast.success(`Product found: ${res.data.name}`);
                setSearch(res.data.sku || res.data.barcode || scannedCode);
                setViewProduct(res.data);
              }
            } catch (err) {
              toast.error(err.response?.data?.error || `No product found for barcode "${scannedCode}"`);
              setSearch(scannedCode);
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Barcode Label Modal */}
      {barcodeModalProduct && (
        <BarcodeViewModal
          open={!!barcodeModalProduct}
          product={barcodeModalProduct}
          onClose={() => setBarcodeModalProduct(null)}
        />
      )}
    </div>
  );
};

export { QuickSaleModal, QuickPurchaseModal, ViewProductModal };
export default Products;
