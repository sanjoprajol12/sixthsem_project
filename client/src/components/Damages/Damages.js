import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const fmtCurrency = (v) => `NPR ${(Number(v) || 0).toLocaleString('en-IN')}`;

const DAMAGE_TYPES = [
  'Broken / Transit Damage',
  'Water / Moisture Damage',
  'Expired / Rotten',
  'Manufacturing Defect',
  'Warehouse Mishap',
  'Other'
];

const Damages = () => {
  const { user } = useAuth();
  const [damages, setDamages] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    quantity: '1',
    damage_type: DAMAGE_TYPES[0],
    remark: ''
  });

  const userRole = (user?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const canManage = ['super_admin', 'superadmin', 'admin', 'inventory_manager'].includes(userRole);

  const fetchDamages = useCallback(async () => {
    try {
      const res = await axios.get('/api/damages');
      setDamages(res.data || []);
    } catch {
      toast.error('Error loading damage records');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(Array.isArray(res.data) ? res.data : res.data.products || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (canManage) {
      fetchDamages();
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [canManage, fetchDamages, fetchProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id) {
      toast.error('Select a product');
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      toast.error('Enter a valid quantity > 0');
      return;
    }

    try {
      await axios.post('/api/damages', {
        product_id: form.product_id,
        quantity: Number(form.quantity),
        damage_type: form.damage_type,
        remark: form.remark
      });
      toast.success('Damage recorded and stock deducted');
      setShowModal(false);
      setForm({
        product_id: '',
        quantity: '1',
        damage_type: DAMAGE_TYPES[0],
        remark: ''
      });
      fetchDamages();
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record damage');
    }
  };

  if (loading) {
    return (
      <div className="table-loading" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <div className="loading-spinner" />
        <span style={{ color: 'var(--gray-500)', fontSize: '14px' }}>Loading damage records...</span>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div>
        <div className="page-header">
          <h1>Damage & Loss</h1>
        </div>
        <div className="alert alert-warning">
          <span className="alert-icon"><i className="ri-error-warning-line" /></span>
          You do not have permission to view or manage damage records. (Logged in as: {user?.role || 'Guest'})
        </div>
      </div>
    );
  }

  const totalLoss = damages.reduce((acc, d) => acc + (d.total_loss || (d.unit_cost || 0) * (d.quantity || 0)), 0);
  const totalUnits = damages.reduce((acc, d) => acc + (d.quantity || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Damage & Loss</h1>
          <p>Track goods damaged, broken, or expired with automatic inventory deduction</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <i className="ri-add-line" /> Record Damage
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid mb-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Damage Incidents</div>
          <div className="stat-card-value">{damages.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Units Lost</div>
          <div className="stat-card-value" style={{ color: '#DC2626' }}>{totalUnits}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Loss Value</div>
          <div className="stat-card-value" style={{ color: '#DC2626' }}>{fmtCurrency(totalLoss)}</div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <span style={{ fontWeight: 600, fontSize: '15px' }}>Damage Log</span>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            {damages.length} incidents logged
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : damages.length === 0 ? (
          <div className="table-empty">
            <span className="table-empty-icon"><i className="ri-shield-check-line" style={{ fontSize: '32px', color: '#9CA3AF' }} /></span>
            <div className="table-empty-text">No damage or loss incidents recorded</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Category</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Total Loss</th>
                <th>Remark</th>
                <th>Reported By</th>
              </tr>
            </thead>
            <tbody>
              {damages.map((d) => (
                <tr key={d._id || d.id}>
                  <td style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                    {d.created_at ? new Date(d.created_at).toLocaleString() : '-'}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.product_name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>SKU: {d.product_sku}</div>
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {d.product_snapshot?.category || d.product_id?.category || 'General'}
                  </td>
                  <td>
                    <span className="badge badge-warning">{d.damage_type || 'Damage'}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#DC2626' }}>
                    -{d.quantity}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {fmtCurrency(d.total_loss || (d.unit_cost || 0) * (d.quantity || 0))}
                  </td>
                  <td style={{ fontSize: '12.5px', color: '#4B5563' }}>{d.remark || '—'}</td>
                  <td style={{ fontSize: '12.5px' }}>{d.recorded_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Damage Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div className="modal-title"><i className="ri-error-warning-line" style={{ color: '#DC2626', marginRight: '6px' }} /> Record Damage / Loss</div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><i className="ri-close-line" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label form-label-required">Select Product</label>
                  <select
                    className="form-control"
                    value={form.product_id}
                    required
                    onChange={e => setForm(p => ({ ...p, product_id: e.target.value }))}
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} (SKU: {p.sku}) — Stock: {p.quantity} {p.unit_of_measure}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label form-label-required">Quantity Damaged</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={form.quantity}
                      required
                      onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label form-label-required">Damage Type</label>
                    <select
                      className="form-control"
                      value={form.damage_type}
                      onChange={e => setForm(p => ({ ...p, damage_type: e.target.value }))}
                    >
                      {DAMAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Remark / Incident Note</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Describe how the damage occurred..."
                    value={form.remark}
                    onChange={e => setForm(p => ({ ...p, remark: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#DC2626', borderColor: '#DC2626' }}>
                  <i className="ri-check-line" /> Record Damage & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Damages;
