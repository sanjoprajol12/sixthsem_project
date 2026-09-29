import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BarcodeScanner from '../Products/BarcodeScanner';
import BarcodeGenerator from '../Products/BarcodeGenerator';

const fmtCurrency = (v) => `NPR ${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const STOCK_STATUS_META = {
  OUT_OF_STOCK: { label: 'Out of Stock', badgeClass: 'badge badge-danger', color: '#DC2626' },
  CRITICAL:     { label: 'Critical',     badgeClass: 'badge stock-badge-critical', color: '#EA580C' },
  LOW_STOCK:    { label: 'Low Stock',    badgeClass: 'badge stock-badge-low', color: '#D97706' },
  HEALTHY:      { label: 'Healthy',      badgeClass: 'badge stock-badge-healthy', color: '#059669' },
  OVERSTOCKED:  { label: 'Overstocked', badgeClass: 'badge stock-badge-overstocked', color: '#7C3AED' }
};

const StatCard = ({ label, value, icon, iconBg, iconColor, accentColor, change, changeDir, onClick }) => (
  <div className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    <div className="stat-card-accent" style={{ background: accentColor || '#2563EB' }} />
    <div className="stat-card-top">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-icon" style={{ background: iconBg || '#EFF6FF', color: iconColor || '#2563EB' }}>
        <i className={icon} />
      </div>
    </div>
    <div className="stat-card-value">{value}</div>
    {change !== undefined && (
      <div className={`stat-card-change ${changeDir || 'neutral'}`}>
        {changeDir === 'up' ? <i className="ri-arrow-up-line" style={{ marginRight: '2px' }} /> : changeDir === 'down' ? <i className="ri-arrow-down-line" style={{ marginRight: '2px' }} /> : <i className="ri-arrow-right-line" style={{ marginRight: '2px' }} />} {change}
      </div>
    )}
  </div>
);

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const navigate = useNavigate();

  const handleBarcodeScanned = async (scannedCode) => {
    setShowScanner(false);
    try {
      const res = await axios.get(`/api/products/barcode/${encodeURIComponent(scannedCode)}`);
      if (res.data) {
        toast.success(`Found product: ${res.data.name}`);
        setScannedProduct(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || `No product found for barcode "${scannedCode}"`);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [sumRes, lowRes, topRes, poRes, trendRes] = await Promise.all([
        axios.get('/api/reports/executive-summary?days=30'),
        axios.get('/api/reports/low-stock-alerts'),
        axios.get('/api/reports/top-selling?limit=5&days=30'),
        axios.get('/api/purchase-orders?status=submitted'),
        axios.get('/api/reports/sales-trends?days=7')
      ]);
      setSummary(sumRes.data);
      setLowStockAlerts(lowRes.data.slice(0, 6));
      setTopSelling(topRes.data.slice(0, 5));
      setPendingPOs(poRes.data.slice(0, 5));
      setSalesTrend(trendRes.data);
    } catch (err) {
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  const fin = summary?.financials || {};
  const inv = summary?.inventory || {};
  const ops = summary?.operations || {};

  const attentionItems = [
    inv.out_of_stock_count > 0 && {
      iconCls: 'ri-close-circle-line', iconBg: '#FEF2F2', iconColor: '#DC2626',
      title: `${inv.out_of_stock_count} product${inv.out_of_stock_count > 1 ? 's' : ''} out of stock`,
      sub: 'Requires immediate reorder',
      path: '/inventory?stockStatus=OUT_OF_STOCK'
    },
    inv.critical_stock_count > 0 && {
      iconCls: 'ri-error-warning-line', iconBg: '#FFF7ED', iconColor: '#EA580C',
      title: `${inv.critical_stock_count} product${inv.critical_stock_count > 1 ? 's' : ''} at critical level`,
      sub: 'Below minimum stock threshold',
      path: '/inventory?stockStatus=CRITICAL'
    },
    inv.low_stock_count > 0 && {
      iconCls: 'ri-arrow-down-line', iconBg: '#FFFBEB', iconColor: '#D97706',
      title: `${inv.low_stock_count} product${inv.low_stock_count > 1 ? 's' : ''} at low stock`,
      sub: 'At or below reorder level',
      path: '/algorithms'
    },
    ops.pending_purchase_orders > 0 && {
      iconCls: 'ri-file-list-3-line', iconBg: '#EFF6FF', iconColor: '#2563EB',
      title: `${ops.pending_purchase_orders} purchase order${ops.pending_purchase_orders > 1 ? 's' : ''} pending approval`,
      sub: 'Review and approve in Purchase Orders',
      path: '/purchase-orders?status=submitted'
    }
  ].filter(Boolean);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Business Overview</h1>
          <p>Last 30 days performance & inventory health at a glance</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setShowScanner(true)}>
            <i className="ri-barcode-box-line" /> Scan Barcode
          </button>
          <button className="btn btn-outline btn-sm" onClick={fetchAll}><i className="ri-refresh-line" /> Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/sales-orders')}>+ New Sale</button>
        </div>
      </div>

      {/* Attention Required Banner */}
      {attentionItems.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
          <i className="ri-error-warning-line alert-icon" />
          <div>
            <strong>{attentionItems.length} item{attentionItems.length > 1 ? 's' : ''} need your attention</strong>
            <div style={{ marginTop: '4px', fontSize: '13px' }}>
              {attentionItems.map((a, i) => (
                <span key={i} style={{ marginRight: '16px' }}>
                  <i className={a.iconCls} style={{ color: a.iconColor }} /> {a.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard
          label="Revenue (30 days)"
          value={fmtCurrency(fin.total_revenue)}
          icon="ri-money-dollar-circle-line"
          iconBg="#ECFDF5"
          iconColor="#059669"
          accentColor="#059669"
          onClick={() => navigate('/reports')}
        />
        <StatCard
          label="Gross Profit"
          value={fmtCurrency(fin.gross_profit)}
          icon="ri-bar-chart-line"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          accentColor="#2563EB"
          change={`${fin.gross_margin_percent || 0}% margin`}
          changeDir="neutral"
        />
        <StatCard
          label="Inventory Value"
          value={fmtCurrency(fin.inventory_valuation)}
          icon="ri-price-tag-3-line"
          iconBg="#EDE9FE"
          iconColor="#7C3AED"
          accentColor="#7C3AED"
          onClick={() => navigate('/inventory?view=valuation')}
        />
        <StatCard
          label="Total Products"
          value={inv.total_products}
          icon="ri-box-3-line"
          iconBg="#F0FDF4"
          iconColor="#059669"
          accentColor="#059669"
          onClick={() => navigate('/products')}
        />
        <StatCard
          label="Out of Stock"
          value={inv.out_of_stock_count}
          icon="ri-close-circle-line"
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          accentColor="#DC2626"
          onClick={() => navigate('/algorithms')}
        />
        <StatCard
          label="Sales Orders (30d)"
          value={ops.total_sales_orders}
          icon="ri-file-list-3-line"
          iconBg="#ECFDF5"
          iconColor="#059669"
          accentColor="#059669"
          onClick={() => navigate('/sales-orders')}
        />
        <StatCard
          label="Damage Loss (30d)"
          value={fmtCurrency(fin.damage_loss)}
          icon="ri-error-warning-fill"
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          accentColor="#DC2626"
          onClick={() => navigate('/damages')}
        />
        <StatCard
          label="Pending POs"
          value={ops.pending_purchase_orders}
          icon="ri-shopping-cart-2-line"
          iconBg="#FFFBEB"
          iconColor="#D97706"
          accentColor="#D97706"
          onClick={() => navigate('/purchase-orders')}
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-col">
          {/* Low Stock Alerts */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><i className="ri-error-warning-line" /> Low Stock Alerts</div>
                <div className="card-subtitle">Products at or below reorder level</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/algorithms')}>
                View All
              </button>
            </div>
            {lowStockAlerts.length === 0 ? (
              <div className="table-empty">
                <i className="ri-checkbox-circle-line" style={{ fontSize: '28px', color: 'var(--gray-300)' }} />
                <div className="table-empty-text">All stock levels healthy</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Reorder</th>
                    <th>Status</th>
                    <th>Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockAlerts.map(item => {
                    const meta = STOCK_STATUS_META[item.stock_status] || STOCK_STATUS_META['LOW_STOCK'];
                    return (
                      <tr key={item._id} style={{ cursor: 'pointer' }} onClick={() => navigate('/products')}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>{item.sku}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: meta.color }}>{item.quantity}</span>
                          <span style={{ color: '#6B7280', fontSize: '11px' }}> {item.unit_of_measure || 'pcs'}</span>
                        </td>
                        <td style={{ color: '#6B7280' }}>{item.reorder_level}</td>
                        <td><span className={meta.badgeClass}>{meta.label}</span></td>
                        <td style={{ fontSize: '12px', color: '#6B7280' }}>{item.supplier_name || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pending Purchase Orders */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><i className="ri-shopping-cart-2-line" /> Pending Purchase Orders</div>
                <div className="card-subtitle">Awaiting approval or processing</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/purchase-orders')}>
                View All
              </button>
            </div>
            {pendingPOs.length === 0 ? (
              <div className="table-empty">
                <i className="ri-checkbox-circle-line" style={{ fontSize: '28px', color: 'var(--gray-300)' }} />
                <div className="table-empty-text">No pending purchase orders</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Supplier</th>
                    <th>Amount</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPOs.map(po => (
                    <tr key={po._id} style={{ cursor: 'pointer' }} onClick={() => navigate('/purchase-orders')}>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#2563EB' }}>{po.order_number}</span>
                      </td>
                      <td style={{ fontSize: '13px' }}>{po.supplier_name}</td>
                      <td style={{ fontWeight: 600 }}>{fmtCurrency(po.total_amount)}</td>
                      <td style={{ fontSize: '12px', color: '#6B7280' }}>
                        {new Date(po.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="dashboard-col">
          {/* Action Required */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><i className="ri-alert-line" /> Action Required</div>
                <div className="card-subtitle">Items needing your attention</div>
              </div>
              <span className="badge badge-danger">{attentionItems.length}</span>
            </div>
            {attentionItems.length === 0 ? (
              <div className="table-empty" style={{ padding: '24px 20px' }}>
                <i className="ri-checkbox-circle-line" style={{ fontSize: '28px', color: 'var(--gray-300)' }} />
                <div className="table-empty-text">All systems healthy</div>
                <div className="table-empty-sub">No immediate action required</div>
              </div>
            ) : (
              <div className="action-required-list">
                {attentionItems.map((item, i) => (
                  <div key={i} className="action-required-item" onClick={() => navigate(item.path)}>
                    <div className="action-required-icon" style={{ background: item.iconBg, color: item.iconColor }}>
                      <i className={item.iconCls} style={{ fontSize: '16px' }} />
                    </div>
                    <div className="action-required-content">
                      <div className="action-required-title">{item.title}</div>
                      <div className="action-required-sub">{item.sub}</div>
                    </div>
                    <i className="ri-arrow-right-s-line" style={{ color: '#9CA3AF' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Selling Products */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title"><i className="ri-trophy-line" /> Top Selling (30 days)</div>
                <div className="card-subtitle">By units sold</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/reports')}>Reports</button>
            </div>
            {topSelling.length === 0 ? (
              <div className="table-empty" style={{ padding: '24px' }}>
                <i className="ri-bar-chart-grouped-line" style={{ fontSize: '28px', color: 'var(--gray-300)' }} />
                <div className="table-empty-text">No sales data yet</div>
              </div>
            ) : (
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {topSelling.map((p, i) => {
                  const maxSold = topSelling[0]?.total_sold || 1;
                  const pct = Math.round((p.total_sold / maxSold) * 100);
                  return (
                    <div key={p._id || i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', marginRight: '8px' }}>
                            #{i + 1}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                          {p.total_sold} units
                        </span>
                      </div>
                      <div className="stock-bar-track">
                        <div
                          className="stock-bar-fill"
                          style={{ width: `${pct}%`, background: i === 0 ? '#059669' : i === 1 ? '#2563EB' : '#D97706' }}
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                        Revenue: {fmtCurrency(p.total_revenue)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stock Health Donut */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><i className="ri-heart-pulse-line" /> Inventory Health</div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Healthy',     value: inv.healthy_count || 0,   color: '#059669', bg: '#ECFDF5' },
                { label: 'Low Stock',   value: inv.low_stock_count || 0, color: '#D97706', bg: '#FFFBEB' },
                { label: 'Critical',    value: inv.critical_stock_count || 0, color: '#EA580C', bg: '#FFF7ED' },
                { label: 'Out of Stock', value: inv.out_of_stock_count || 0, color: '#DC2626', bg: '#FEF2F2' }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0
                  }} />
                  <div style={{ flex: 1, fontSize: '13px', color: '#374151' }}>{item.label}</div>
                  <div style={{
                    padding: '2px 10px', borderRadius: '999px', background: item.bg,
                    color: item.color, fontSize: '12px', fontWeight: 700
                  }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7-Day Velocity Activity */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><i className="ri-bar-chart-line" /> 7-Day Sales Trend</div>
              <div className="card-subtitle">{salesTrend.length} days recorded</div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {salesTrend.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#6B7280' }}>No recent sales activity</div>
              ) : (
                salesTrend.slice(-5).map(day => (
                  <div key={day.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                    <span style={{ color: '#4B5563' }}>{day.date}</span>
                    <span style={{ fontWeight: 600 }}>{fmtCurrency(day.revenue)} ({day.orders_count} orders)</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          title="Scan Product Barcode"
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Scanned Product Modal (Identical to Product Details) */}
      {scannedProduct && (() => {
        const costVal = Number(scannedProduct.cost !== undefined ? scannedProduct.cost : scannedProduct.cost_price) || 0;
        const priceVal = Number(scannedProduct.price !== undefined ? scannedProduct.price : scannedProduct.unit_price) || 0;
        const margin = priceVal > 0 ? ((1 - costVal / priceVal) * 100).toFixed(1) + '%' : '—';
        const pStatus = scannedProduct.status || 'approved';

        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setScannedProduct(null)}>
            <div className="modal modal-md">
              <div className="modal-header">
                <div>
                  <div className="modal-title"><i className="ri-eye-line" /> Product Details</div>
                  <div className="modal-subtitle">{scannedProduct.name} (SKU: {scannedProduct.sku})</div>
                </div>
                <button className="modal-close-btn" onClick={() => setScannedProduct(null)}><i className="ri-close-line" /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Status Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Current Status:</span>
                  <span className={`status-badge status-${pStatus}`}>
                    <i className={
                      pStatus === 'approved' || pStatus === 'active' ? 'ri-checkbox-circle-line' :
                      pStatus === 'pending' ? 'ri-time-line' :
                      pStatus === 'disapproved' ? 'ri-close-circle-line' : 'ri-indeterminate-circle-line'
                    } />
                    {pStatus}
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
                    onClick={() => {
                      setScannedProduct(null);
                      navigate('/sales-orders');
                    }}
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
                    onClick={() => {
                      setScannedProduct(null);
                      navigate('/purchase-orders');
                    }}
                  >
                    <i className="ri-truck-line" /> New Purchase
                  </button>
                </div>

                {scannedProduct.disapproval_reason && (
                  <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                    <span className="alert-icon"><i className="ri-error-warning-line" /></span>
                    <div>
                      <strong>Disapproval Reason:</strong>
                      <div>{scannedProduct.disapproval_reason}</div>
                    </div>
                  </div>
                )}

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--gray-100)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Category</div>
                    <div style={{ fontWeight: 600 }}>{scannedProduct.category?.name || scannedProduct.category || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Supplier</div>
                    <div style={{ fontWeight: 600 }}>{scannedProduct.supplier_id?.name || scannedProduct.supplier?.name || scannedProduct.supplier_name || '—'}</div>
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
                    <div style={{ fontWeight: 600, color: scannedProduct.quantity <= 0 ? '#DC2626' : undefined }}>
                      {scannedProduct.quantity} {scannedProduct.unit_of_measure || 'pcs'}
                    </div>
                  </div>
                </div>

                {scannedProduct.description && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Description</div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>{scannedProduct.description}</div>
                  </div>
                )}

                {/* Barcode Preview & Print in Details */}
                {scannedProduct.barcode ? (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                      <i className="ri-barcode-line" style={{ marginRight: '4px' }} /> Barcode Label
                    </div>
                    <BarcodeGenerator
                      value={scannedProduct.barcode}
                      productName={scannedProduct.name}
                      productSku={scannedProduct.sku}
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ri-barcode-line" /> No barcode registered for this product
                  </div>
                )}

                {scannedProduct.approved_by && (
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                    Approved by: {scannedProduct.approved_by?.full_name || scannedProduct.approved_by?.username || 'Admin'}
                    {scannedProduct.approved_at && ` on ${new Date(scannedProduct.approved_at).toLocaleDateString()}`}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setScannedProduct(null);
                    navigate(`/products?search=${encodeURIComponent(scannedProduct.sku)}`);
                  }}
                >
                  <i className="ri-box-3-line" /> View in Products Catalog
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setScannedProduct(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Dashboard;
