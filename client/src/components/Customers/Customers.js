import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';

const fmtCurrency = (v) => `NPR ${(Number(v) || 0).toLocaleString('en-IN')}`;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    customer_type: 'retail',
    tax_number: '',
    credit_limit: '0',
    notes: ''
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('search')) setSearch(params.get('search'));
  }, [location.search]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType !== 'all') params.set('type', filterType);

      const res = await axios.get(`/api/customers?${params}`);
      setCustomers(res.data || []);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, filterType]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      customer_type: 'retail',
      tax_number: '',
      credit_limit: '0',
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (cust) => {
    setEditingCustomer(cust);
    setForm({
      name: cust.name || '',
      email: cust.email || '',
      phone: cust.phone || '',
      address: cust.address || '',
      customer_type: cust.customer_type || 'retail',
      tax_number: cust.tax_number || '',
      credit_limit: cust.credit_limit || '0',
      notes: cust.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      const payload = {
        ...form,
        credit_limit: Number(form.credit_limit) || 0
      };

      if (editingCustomer) {
        await axios.put(`/api/customers/${editingCustomer._id || editingCustomer.id}`, payload);
        toast.success('Customer updated');
      } else {
        await axios.post('/api/customers', payload);
        toast.success('Customer created');
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save customer');
    }
  };

  const handleDelete = async (cust) => {
    if (!window.confirm(`Archive customer "${cust.name}"?`)) return;
    try {
      await axios.delete(`/api/customers/${cust._id || cust.id}`);
      toast.success('Customer archived');
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const viewDetails = async (cust) => {
    try {
      const res = await axios.get(`/api/customers/${cust._id || cust.id}`);
      setSelectedCustomer(res.data);
    } catch {
      toast.error('Failed to load customer profile');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Customers</h1>
          <p>Manage customer profiles, credit limits, and purchase history</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            ➕ Add Customer
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-filters">
            <div className="table-search">
              <span className="table-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search name, phone, email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="distributor">Distributor</option>
            </select>
          </div>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            {customers.length} customers
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : customers.length === 0 ? (
          <div className="table-empty">
            <span className="table-empty-icon">👥</span>
            <div className="table-empty-text">No customers found</div>
            <div className="table-empty-sub">Add retail or wholesale accounts to track orders</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Credit Limit</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c._id || c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{c.customer_code}</div>
                  </td>
                  <td>
                    <span className={`badge ${c.customer_type === 'wholesale' ? 'badge-primary' : c.customer_type === 'distributor' ? 'badge-purple' : 'badge-neutral'}`}>
                      {c.customer_type ? c.customer_type.toUpperCase() : 'RETAIL'}
                    </span>
                  </td>
                  <td>
                    <div>{c.phone || '—'}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{c.email || ''}</div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{c.address || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{fmtCurrency(c.credit_limit)}</td>
                  <td style={{ fontWeight: 600, color: (c.outstanding_balance || 0) > 0 ? '#DC2626' : '#059669' }}>
                    {fmtCurrency(c.outstanding_balance)}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="row-action-btn" title="View details" onClick={() => viewDetails(c)}>
                        👁️
                      </button>
                      <button className="row-action-btn" title="Edit" onClick={() => openEditModal(c)}>
                        ✏️
                      </button>
                      <button className="row-action-btn danger" title="Archive" onClick={() => handleDelete(c)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div className="modal-title">{editingCustomer ? '✏️ Edit Customer' : '➕ Add Customer'}</div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label form-label-required">Customer Name</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Company or Individual Name"
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="98XXXXXXXX"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Customer Type</label>
                    <select
                      className="form-control"
                      value={form.customer_type}
                      onChange={e => setForm(p => ({ ...p, customer_type: e.target.value }))}
                    >
                      <option value="retail">Retail</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="distributor">Distributor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Credit Limit (NPR)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.credit_limit}
                      onChange={e => setForm(p => ({ ...p, credit_limit: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="Delivery / Billing Address"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN / Tax Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.tax_number}
                    onChange={e => setForm(p => ({ ...p, tax_number: e.target.value }))}
                    placeholder="PAN # (if applicable)"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? '✔ Update Customer' : '✔ Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedCustomer(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">👥 {selectedCustomer.name}</div>
                <div className="modal-subtitle">Customer Code: {selectedCustomer.customer_code}</div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCustomer(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="stats-grid mb-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card">
                  <div className="stat-card-label">Total Orders</div>
                  <div className="stat-card-value">{selectedCustomer.orders_count || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Lifetime Spend</div>
                  <div className="stat-card-value">{fmtCurrency(selectedCustomer.total_purchased)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Outstanding Balance</div>
                  <div className="stat-card-value" style={{ color: selectedCustomer.outstanding_balance > 0 ? '#DC2626' : '#059669' }}>
                    {fmtCurrency(selectedCustomer.outstanding_balance)}
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 600, marginBottom: '8px' }}>Recent Sales Orders</div>
              {selectedCustomer.recent_orders?.length === 0 ? (
                <p style={{ color: '#6B7280', fontSize: '13px' }}>No orders placed yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.recent_orders?.map(o => (
                      <tr key={o._id}>
                        <td style={{ fontWeight: 600 }}>{o.order_number}</td>
                        <td style={{ fontSize: '12px', color: '#6B7280' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 600 }}>{fmtCurrency(o.total_amount)}</td>
                        <td><span className="badge badge-success">{o.status}</span></td>
                        <td><span className="badge badge-neutral">{o.payment_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => {
                navigate(`/sales-orders?customer=${encodeURIComponent(selectedCustomer.name)}`);
              }}>
                Go to Orders
              </button>
              <button className="btn btn-outline" onClick={() => setSelectedCustomer(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
