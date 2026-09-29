import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebarCounts } from '../../context/SidebarCountsContext';
import { useAuth } from '../../context/AuthContext';
import ActionMenu from '../Common/ActionMenu';
import ConfirmDialog from '../Common/ConfirmDialog';

const fmtCurrency = (v) => `NPR ${(Number(v) || 0).toLocaleString('en-IN')}`;

const Customers = () => {
  const { user } = useAuth();
  const { refreshCounts } = useSidebarCounts();
  const rawRole = (user?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const isAdmin = rawRole === 'super_admin' || rawRole === 'superadmin' || rawRole === 'admin';

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    customer_type: 'retail',
    tax_number: '',
    credit_limit: '0',
    notes: '',
    status: 'active'
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
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await axios.get(`/api/customers?${params}`);
      setCustomers(res.data || []);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterType('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = Boolean(
    search ||
    (filterType && filterType !== 'all') ||
    (statusFilter && statusFilter !== 'all')
  );

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
      notes: '',
      status: 'active'
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
      notes: cust.notes || '',
      status: cust.status || 'active'
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
        toast.success('Customer updated successfully');
      } else {
        await axios.post('/api/customers', payload);
        toast.success('Customer created successfully');
      }

      setShowModal(false);
      fetchCustomers();
      refreshCounts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save customer');
    }
  };

  const handleToggleStatus = async (cust) => {
    const newStatus = cust.status === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(`/api/customers/${cust._id || cust.id}/status`, { status: newStatus });
      toast.success(`Customer status updated to ${newStatus}`);
      fetchCustomers();
      refreshCounts();
    } catch (error) {
      toast.error('Failed to update customer status');
    }
  };

  const handleDelete = (cust) => {
    setDeleteTarget(cust);
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await axios.delete(`/api/customers/${deleteTarget._id || deleteTarget.id}`);
      toast.success('Customer deactivated');
      setDeleteTarget(null);
      fetchCustomers();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to deactivate customer');
    } finally {
      setIsDeleting(false);
    }
  };

  const viewDetails = async (cust) => {
    try {
      const res = await axios.get(`/api/customers/${cust._id || cust.id}`);
      setSelectedCustomer(res.data);
    } catch {
      setSelectedCustomer(cust);
    }
  };

  const getRowActions = (c) => {
    const isAct = c.status === 'active';
    const actions = [
      {
        label: 'View Details',
        icon: 'ri-eye-line',
        onClick: () => viewDetails(c)
      },
      {
        label: 'Edit',
        icon: 'ri-edit-line',
        onClick: () => openEditModal(c)
      },
      {
        label: isAct ? 'Deactivate' : 'Activate',
        icon: isAct ? 'ri-indeterminate-circle-line' : 'ri-checkbox-circle-line',
        warning: isAct,
        success: !isAct,
        onClick: () => handleToggleStatus(c)
      }
    ];

    if (isAdmin) {
      actions.push({
        label: 'Deactivate / Archive',
        icon: 'ri-delete-bin-line',
        danger: true,
        onClick: () => handleDelete(c)
      });
    }

    return actions;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Customers</h1>
          <p>Client database, retail/wholesale categorizations, and credit terms</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <i className="ri-user-add-line" /> Add Customer
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <div className="table-filters" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <div className="table-search">
              <i className="ri-search-line table-search-icon" />
              <input
                type="text"
                placeholder="Search by name, phone, PAN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              className="filter-select"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All Customer Types</option>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="distributor">Distributor</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleClearFilters}
                title="Clear all filters"
              >
                <i className="ri-filter-off-line" style={{ marginRight: '4px' }} />
                Clear Filters
              </button>
            )}
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#6B7280' }}>
            {customers.length} accounts
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : customers.length === 0 ? (
          <div className="table-empty">
            <i className="ri-team-line table-empty-icon" style={{ fontSize: '32px', color: 'var(--gray-300)' }} />
            <div className="table-empty-text">No customers found</div>
            <div className="table-empty-sub">
              {hasActiveFilters ? 'Try adjusting your filters or click "Clear Filters"' : 'Add retail or wholesale accounts to track orders'}
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
                <th>Customer</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Credit Limit</th>
                <th>Balance</th>
                <th>Status</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const cStatus = c.status || 'active';
                return (
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
                      <span className={`status-badge status-${cStatus}`}>
                        <i className={cStatus === 'active' ? 'ri-checkbox-circle-line' : 'ri-indeterminate-circle-line'} />
                        {cStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <ActionMenu actions={getRowActions(c)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div className="modal-title">{editingCustomer ? <><i className="ri-edit-line" /> Edit Customer</> : <><i className="ri-user-add-line" /> Add Customer</>}</div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><i className="ri-close-line" /></button>
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
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <i className="ri-check-line" /> {editingCustomer ? 'Update Customer' : 'Save Customer'}
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
                <div className="modal-title"><i className="ri-team-line" style={{ marginRight: '8px', color: 'var(--primary)' }} />{selectedCustomer.name}</div>
                <div className="modal-subtitle">Customer Code: {selectedCustomer.customer_code}</div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCustomer(null)}><i className="ri-close-line" /></button>
            </div>
            <div className="modal-body">
              <div className="stats-grid mb-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card">
                  <div className="stat-card-label">Total Orders</div>
                  <div className="stat-card-value">{selectedCustomer.orders_count || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Total Purchased</div>
                  <div className="stat-card-value">{fmtCurrency(selectedCustomer.total_purchased)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Outstanding Balance</div>
                  <div className="stat-card-value" style={{ color: (selectedCustomer.outstanding_balance || 0) > 0 ? '#DC2626' : '#059669' }}>
                    {fmtCurrency(selectedCustomer.outstanding_balance)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--gray-100)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                <div><strong>Phone:</strong> {selectedCustomer.phone || '—'}</div>
                <div><strong>Email:</strong> {selectedCustomer.email || '—'}</div>
                <div><strong>Address:</strong> {selectedCustomer.address || '—'}</div>
                <div><strong>PAN / Tax:</strong> {selectedCustomer.tax_number || '—'}</div>
                <div><strong>Account Status:</strong> <span className={`status-badge status-${selectedCustomer.status || 'active'}`}>{selectedCustomer.status || 'active'}</span></div>
                <div><strong>Credit Limit:</strong> {fmtCurrency(selectedCustomer.credit_limit)}</div>
              </div>

              <h4 style={{ margin: '16px 0 8px' }}>Recent Sales Orders</h4>
              {selectedCustomer.recent_orders && selectedCustomer.recent_orders.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Payment Status</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.recent_orders.map(o => (
                      <tr key={o._id}>
                        <td style={{ fontWeight: 600 }}>{o.order_number}</td>
                        <td>{new Date(o.order_date).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 600 }}>{fmtCurrency(o.total_amount)}</td>
                        <td>
                          <span className={`badge ${o.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                            {o.payment_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${o.status === 'fulfilled' ? 'badge-success' : o.status === 'confirmed' ? 'badge-primary' : 'badge-neutral'}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#6B7280', fontSize: '13px' }}>No order history available for this customer.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedCustomer(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setSelectedCustomer(null); navigate(`/sales-orders?customer=${selectedCustomer._id || selectedCustomer.id}`); }}>
                View All Sales
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Deactivate Customer?"
        message={`Are you sure you want to deactivate customer "${deleteTarget?.name}"? They will no longer appear in active customer lists.`}
        confirmLabel="Deactivate Customer"
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteCustomer}
      />
    </div>
  );
};

export default Customers;
