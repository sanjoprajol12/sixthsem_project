import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

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
        {icon}
      </div>
    </div>
    <div className="stat-card-value">{value}</div>
    {change !== undefined && (
      <div className={`stat-card-change ${changeDir || 'neutral'}`}>
        {changeDir === 'up' ? '↑' : changeDir === 'down' ? '↓' : '→'} {change}
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
  const navigate = useNavigate();

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
      icon: '🚫', iconBg: '#FEF2F2', iconColor: '#DC2626',
      title: `${inv.out_of_stock_count} product${inv.out_of_stock_count > 1 ? 's' : ''} out of stock`,
      sub: 'Requires immediate reorder',
      path: '/inventory?stockStatus=OUT_OF_STOCK'
    },
    inv.critical_stock_count > 0 && {
      icon: '⚠️', iconBg: '#FFF7ED', iconColor: '#EA580C',
      title: `${inv.critical_stock_count} product${inv.critical_stock_count > 1 ? 's' : ''} at critical level`,
      sub: 'Below minimum stock threshold',
      path: '/inventory?stockStatus=CRITICAL'
    },
    inv.low_stock_count > 0 && {
      icon: '📉', iconBg: '#FFFBEB', iconColor: '#D97706',
      title: `${inv.low_stock_count} product${inv.low_stock_count > 1 ? 's' : ''} at low stock`,
      sub: 'At or below reorder level',
      path: '/algorithms'
    },
    ops.pending_purchase_orders > 0 && {
      icon: '📋', iconBg: '#EFF6FF', iconColor: '#2563EB',
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
          <button className="btn btn-outline btn-sm" onClick={fetchAll}>🔄 Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/sales-orders')}>+ New Sale</button>
        </div>
      </div>

      {/* Attention Required Banner */}
      {attentionItems.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          <div>
            <strong>{attentionItems.length} item{attentionItems.length > 1 ? 's' : ''} need your attention</strong>
            <div style={{ marginTop: '4px', fontSize: '13px' }}>
              {attentionItems.map((a, i) => (
                <span key={i} style={{ marginRight: '16px' }}>
                  {a.icon} {a.title}
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
          icon="💰"
          iconBg="#ECFDF5"
          iconColor="#059669"
          accentColor="#059669"
          onClick={() => navigate('/reports')}
        />
        <StatCard
          label="Gross Profit"
          value={fmtCurrency(fin.gross_profit)}
          icon="📈"
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          accentColor="#2563EB"
          change={`${fin.gross_margin_percent || 0}% margin`}
          changeDir="neutral"
        />
        <StatCard
          label="Inventory Value"
          value={fmtCurrency(fin.inventory_valuation)}
          icon="🏷️"
          iconBg="#EDE9FE"
          iconColor="#7C3AED"
          accentColor="#7C3AED"
          onClick={() => navigate('/inventory?view=valuation')}
        />
        <StatCard
          label="Total Products"
          value={inv.total_products}
          icon="📦"
          iconBg="#F0FDF4"
          iconColor="#059669"
          accentColor="#059669"
          onClick={() => navigate('/products')}
        />
        <StatCard
          label="Out of Stock"
          value={inv.out_of_stock_count}
          icon="🚫"
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          accentColor="#DC2626"
          onClick={() => navigate('/algorithms')}
        />
        <StatCard
          label="Sales Orders (30d)"
          value={ops.total_sales_orders}
          icon="🧾"
          iconBg="#ECFDF5"
          iconColor="#059669"
          accentColor="#059669"
          onClick={() => navigate('/sales-orders')}
        />
        <StatCard
          label="Damage Loss (30d)"
          value={fmtCurrency(fin.damage_loss)}
          icon="🔴"
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          accentColor="#DC2626"
          onClick={() => navigate('/damages')}
        />
        <StatCard
          label="Pending POs"
          value={ops.pending_purchase_orders}
          icon="🛒"
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
                <div className="card-title">⚠️ Low Stock Alerts</div>
                <div className="card-subtitle">Products at or below reorder level</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/algorithms')}>
                View All
              </button>
            </div>
            {lowStockAlerts.length === 0 ? (
              <div className="table-empty">
                <span className="table-empty-icon">✅</span>
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
                <div className="card-title">📋 Pending Purchase Orders</div>
                <div className="card-subtitle">Awaiting approval or processing</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/purchase-orders')}>
                View All
              </button>
            </div>
            {pendingPOs.length === 0 ? (
              <div className="table-empty">
                <span className="table-empty-icon">✅</span>
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
                <div className="card-title">🎯 Action Required</div>
                <div className="card-subtitle">Items needing your attention</div>
              </div>
              <span className="badge badge-danger">{attentionItems.length}</span>
            </div>
            {attentionItems.length === 0 ? (
              <div className="table-empty" style={{ padding: '24px 20px' }}>
                <span className="table-empty-icon">✅</span>
                <div className="table-empty-text">All systems healthy</div>
                <div className="table-empty-sub">No immediate action required</div>
              </div>
            ) : (
              <div className="action-required-list">
                {attentionItems.map((item, i) => (
                  <div key={i} className="action-required-item" onClick={() => navigate(item.path)}>
                    <div className="action-required-icon" style={{ background: item.iconBg }}>
                      {item.icon}
                    </div>
                    <div className="action-required-content">
                      <div className="action-required-title">{item.title}</div>
                      <div className="action-required-sub">{item.sub}</div>
                    </div>
                    <span style={{ color: '#9CA3AF' }}>→</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Selling Products */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">🏆 Top Selling (30 days)</div>
                <div className="card-subtitle">By units sold</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/reports')}>Reports</button>
            </div>
            {topSelling.length === 0 ? (
              <div className="table-empty" style={{ padding: '24px' }}>
                <span className="table-empty-icon">📊</span>
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
              <div className="card-title">🏥 Inventory Health</div>
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
