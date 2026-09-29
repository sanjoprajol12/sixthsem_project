import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';

const fmtCurrency = (v) => `NPR ${(Number(v) || 0).toLocaleString('en-IN')}`;

const TX_TYPES = [
  { value: 'all', label: 'All Transactions' },
  { value: 'PURCHASE_RECEIVE', label: '🛒 Purchase Receive' },
  { value: 'SALE_DEDUCT', label: '🧾 Sale Deduct' },
  { value: 'SALE_RETURN', label: '↩️ Customer Return' },
  { value: 'DAMAGE', label: '🔴 Damage / Loss' },
  { value: 'ADJUSTMENT_IN', label: '➕ Stock In Adjustment' },
  { value: 'ADJUSTMENT_OUT', label: '➖ Stock Out Adjustment' }
];

const TX_BADGE_META = {
  PURCHASE_RECEIVE: { cls: 'badge badge-success', label: 'Purchase In', sign: '+' },
  SALE_DEDUCT:      { cls: 'badge badge-primary', label: 'Sale Out', sign: '-' },
  SALE_RETURN:      { cls: 'badge badge-info',    label: 'Return In', sign: '+' },
  DAMAGE:           { cls: 'badge badge-danger',  label: 'Damage Out', sign: '-' },
  ADJUSTMENT_IN:    { cls: 'badge badge-success', label: 'Adjust In', sign: '+' },
  ADJUSTMENT_OUT:   { cls: 'badge badge-warning', label: 'Adjust Out', sign: '-' }
};

const Inventory = () => {
  const [tab, setTab] = useState('ledger'); // 'ledger' | 'valuation' | 'reconciliation'
  const location = useLocation();

  // Ledger state
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedTxType, setSelectedTxType] = useState('all');

  // Valuation state
  const [valuationMethod, setValuationMethod] = useState('weighted_average');
  const [valuationData, setValuationData] = useState(null);
  const [valuationLoading, setValuationLoading] = useState(false);

  // Reconciliation state
  const [adjustments, setAdjustments] = useState([]);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [countItems, setCountItems] = useState([]);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Pre-fill product from query string
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prodParam = params.get('product');
    if (prodParam) setSelectedProductId(prodParam);
  }, [location.search]);

  // Load products list for dropdown
  useEffect(() => {
    axios.get('/api/products')
      .then(res => setProducts(Array.isArray(res.data) ? res.data : res.data.products || []))
      .catch(() => {});
  }, []);

  // Fetch Ledger
  const fetchLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProductId) params.set('productId', selectedProductId);
      if (selectedTxType !== 'all') params.set('type', selectedTxType);
      params.set('limit', '100');

      const res = await axios.get(`/api/inventory/ledger?${params}`);
      setLedger(res.data || []);
    } catch {
      toast.error('Failed to load stock ledger');
    } finally {
      setLedgerLoading(false);
    }
  }, [selectedProductId, selectedTxType]);

  // Fetch Valuation
  const fetchValuation = useCallback(async () => {
    setValuationLoading(true);
    try {
      const res = await axios.get(`/api/inventory/valuation?method=${valuationMethod}`);
      setValuationData(res.data);
    } catch {
      toast.error('Failed to calculate valuation');
    } finally {
      setValuationLoading(false);
    }
  }, [valuationMethod]);

  // Fetch Adjustments History
  const fetchAdjustments = useCallback(async () => {
    setReconcileLoading(true);
    try {
      const res = await axios.get('/api/inventory/adjustments');
      setAdjustments(res.data || []);
    } catch {
      toast.error('Failed to load adjustments');
    } finally {
      setReconcileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'ledger') fetchLedger();
    if (tab === 'valuation') fetchValuation();
    if (tab === 'reconciliation') fetchAdjustments();
  }, [tab, fetchLedger, fetchValuation, fetchAdjustments]);

  // Prepare reconciliation items
  const openReconcileModal = () => {
    setCountItems(products.map(p => ({
      productId: p._id,
      name: p.name,
      sku: p.sku,
      systemQty: p.quantity || 0,
      physicalQty: p.quantity || 0,
      unitCost: p.cost || 0
    })));
    setAdjustReason('Periodic Physical Inventory Count');
    setAdjustNotes('');
    setShowAdjustModal(true);
  };

  const handleApplyReconciliation = async () => {
    const varianceItems = countItems.filter(item => item.physicalQty !== item.systemQty);
    if (varianceItems.length === 0) {
      toast.info('No variances detected between system counts and physical counts');
      return;
    }

    if (!adjustReason.trim()) {
      toast.error('Please provide a reason for reconciliation');
      return;
    }

    try {
      await axios.post('/api/inventory/adjust', {
        reason: adjustReason,
        notes: adjustNotes,
        items: varianceItems.map(it => ({
          productId: it.productId,
          physicalQuantity: Number(it.physicalQty)
        }))
      });
      toast.success('Inventory reconciliation applied and ledger updated');
      setShowAdjustModal(false);
      fetchAdjustments();
      // refresh products
      axios.get('/api/products').then(res => setProducts(Array.isArray(res.data) ? res.data : []));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reconciliation failed');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Stock & Ledger</h1>
          <p>Real-time inventory movements, audit trail, and valuation</p>
        </div>
        <div className="page-header-actions">
          {tab === 'reconciliation' && (
            <button className="btn btn-primary btn-sm" onClick={openReconcileModal}>
              ➕ New Stock Count
            </button>
          )}
          {tab === 'valuation' && (
            <button className="btn btn-outline btn-sm" onClick={fetchValuation}>
              🔄 Recalculate
            </button>
          )}
          {tab === 'ledger' && (
            <button className="btn btn-outline btn-sm" onClick={fetchLedger}>
              🔄 Refresh
            </button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="tabs" style={{ marginBottom: '20px' }}>
        <button
          className={tab === 'ledger' ? 'active' : ''}
          onClick={() => setTab('ledger')}
        >
          📜 Transaction Ledger
        </button>
        <button
          className={tab === 'valuation' ? 'active' : ''}
          onClick={() => setTab('valuation')}
        >
          💰 Inventory Valuation
        </button>
        <button
          className={tab === 'reconciliation' ? 'active' : ''}
          onClick={() => setTab('reconciliation')}
        >
          ⚖️ Physical Reconciliation
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: TRANSACTION LEDGER
          ───────────────────────────────────────────────────────────────────────────── */}
      {tab === 'ledger' && (
        <div className="table-container">
          <div className="table-toolbar">
            <div className="table-filters">
              <select
                className="filter-select"
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
              >
                <option value="">All Products</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={selectedTxType}
                onChange={e => setSelectedTxType(e.target.value)}
              >
                {TX_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              Showing {ledger.length} transactions
            </div>
          </div>

          {ledgerLoading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : ledger.length === 0 ? (
            <div className="table-empty">
              <span className="table-empty-icon">📜</span>
              <div className="table-empty-text">No ledger transactions found</div>
              <div className="table-empty-sub">Stock movements from purchases, sales, and adjustments appear here</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Reference #</th>
                  <th>Product</th>
                  <th>Movement Type</th>
                  <th>Change</th>
                  <th>Stock Balance</th>
                  <th>Unit Cost</th>
                  <th>Total Value</th>
                  <th>Actor</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(tx => {
                  const meta = TX_BADGE_META[tx.transaction_type] || {
                    cls: 'badge',
                    label: tx.transaction_type,
                    sign: ''
                  };
                  const isPositive = ['PURCHASE_RECEIVE', 'SALE_RETURN', 'ADJUSTMENT_IN'].includes(tx.transaction_type);

                  return (
                    <tr key={tx._id || tx.id}>
                      <td style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px' }}>
                        {tx.reference_number || '—'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{tx.product_name}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>SKU: {tx.product_sku}</div>
                      </td>
                      <td>
                        <span className={meta.cls}>{meta.label}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: isPositive ? '#059669' : '#DC2626' }}>
                        {isPositive ? `+${tx.quantity}` : `-${tx.quantity}`} {tx.unit_of_measure}
                      </td>
                      <td>
                        <span style={{ color: '#6B7280' }}>{tx.previous_quantity}</span>
                        <span style={{ margin: '0 4px', color: '#9CA3AF' }}>→</span>
                        <strong>{tx.new_quantity}</strong>
                      </td>
                      <td>{fmtCurrency(tx.unit_cost)}</td>
                      <td style={{ fontWeight: 500 }}>
                        {fmtCurrency((tx.unit_cost || 0) * (tx.quantity || 0))}
                      </td>
                      <td style={{ fontSize: '12.5px' }}>
                        {tx.performed_by_name || 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: INVENTORY VALUATION
          ───────────────────────────────────────────────────────────────────────────── */}
      {tab === 'valuation' && (
        <div>
          {/* Method Selector & Stats */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Costing Method:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'weighted_average', label: 'Weighted Average' },
                  { id: 'fifo', label: 'FIFO (First-In, First-Out)' },
                  { id: 'lifo', label: 'LIFO (Last-In, First-Out)' }
                ].map(m => (
                  <button
                    key={m.id}
                    className={`btn btn-sm ${valuationMethod === m.id ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setValuationMethod(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {valuationData && (
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="badge badge-primary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                  Total Units: <strong>{valuationData.totalUnits?.toLocaleString()}</strong>
                </div>
                <div className="badge badge-success" style={{ padding: '6px 14px', fontSize: '13px' }}>
                  Total Valuation: <strong>{fmtCurrency(valuationData.totalValuation)}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="table-container">
            {valuationLoading ? (
              <div className="loading-screen"><div className="spinner" /></div>
            ) : !valuationData?.items?.length ? (
              <div className="table-empty">
                <span className="table-empty-icon">💰</span>
                <div className="table-empty-text">No inventory valuation data available</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th>Stock Units</th>
                    <th>Effective Unit Cost</th>
                    <th>Valuation</th>
                    <th>Cost Calculation Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {valuationData.items.map(item => (
                    <tr key={item.productId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>SKU: {item.sku}</div>
                      </td>
                      <td style={{ fontSize: '13px' }}>{item.category || 'General'}</td>
                      <td style={{ fontSize: '13px' }}>{item.supplierName}</td>
                      <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                      <td style={{ fontWeight: 500 }}>{fmtCurrency(item.unitCost)}</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>{fmtCurrency(item.inventoryValue)}</td>
                      <td style={{ fontSize: '12px', color: '#6B7280' }}>{item.calculationDetails}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: PHYSICAL RECONCILIATION
          ───────────────────────────────────────────────────────────────────────────── */}
      {tab === 'reconciliation' && (
        <div className="table-container">
          <div className="table-toolbar">
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Stock Adjustment History</span>
            <button className="btn btn-primary btn-sm" onClick={openReconcileModal}>
              ➕ New Stock Count Reconciliation
            </button>
          </div>

          {reconcileLoading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : adjustments.length === 0 ? (
            <div className="table-empty">
              <span className="table-empty-icon">⚖️</span>
              <div className="table-empty-text">No physical count adjustments recorded</div>
              <div className="table-empty-sub">Reconcile differences between your warehouse shelf counts and system counts</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Adjustment #</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Items Counted</th>
                  <th>Conducted By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map(adj => (
                  <tr key={adj._id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {adj.adjustment_number}
                    </td>
                    <td style={{ fontSize: '12px', color: '#6B7280' }}>
                      {new Date(adj.created_at).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{adj.reason}</div>
                      {adj.notes && <div style={{ fontSize: '11px', color: '#6B7280' }}>{adj.notes}</div>}
                    </td>
                    <td>
                      <span className="badge badge-info">{adj.items?.length || 0} items</span>
                    </td>
                    <td>{adj.performed_by?.username || 'Staff'}</td>
                    <td>
                      <span className="badge badge-success">Applied</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          RECONCILIATION MODAL
          ───────────────────────────────────────────────────────────────────────────── */}
      {showAdjustModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdjustModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">⚖️ Physical Inventory Count Reconciliation</div>
                <div className="modal-subtitle">Enter actual shelf counts to compute variances and update stock</div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAdjustModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid mb-3">
                <div className="form-group">
                  <label className="form-label form-label-required">Reconciliation Reason</label>
                  <input
                    type="text"
                    className="form-control"
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    placeholder="e.g. End-of-month cycle count"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={adjustNotes}
                    onChange={e => setAdjustNotes(e.target.value)}
                    placeholder="e.g. Shelves A1 through B4 checked"
                  />
                </div>
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>System Stock</th>
                      <th>Physical Count</th>
                      <th>Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countItems.map((item, idx) => {
                      const diff = item.physicalQty - item.systemQty;
                      return (
                        <tr key={item.productId}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>SKU: {item.sku}</div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{item.systemQty}</td>
                          <td style={{ width: '130px' }}>
                            <input
                              type="number"
                              min="0"
                              className="form-control"
                              value={item.physicalQty}
                              onChange={e => {
                                const val = parseInt(e.target.value, 10);
                                setCountItems(prev => {
                                  const copy = [...prev];
                                  copy[idx] = { ...copy[idx], physicalQty: isNaN(val) ? 0 : val };
                                  return copy;
                                });
                              }}
                            />
                          </td>
                          <td style={{
                            fontWeight: 700,
                            color: diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : '#6B7280'
                          }}>
                            {diff > 0 ? `+${diff}` : diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAdjustModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApplyReconciliation}>
                ✔ Post Variance Adjustments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
