import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSidebarCounts } from '../../context/SidebarCountsContext';
import { useAuth } from '../../context/AuthContext';
import ActionMenu from '../Common/ActionMenu';
import ConfirmDialog from '../Common/ConfirmDialog';
import './Suppliers.css';

const Suppliers = () => {
  const { user } = useAuth();
  const { refreshCounts } = useSidebarCounts();
  const rawRole = (user?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const isAdmin = rawRole === 'super_admin' || rawRole === 'superadmin' || rawRole === 'admin';

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'active'
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await axios.get(`/api/suppliers?${params}`);
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error('Error loading suppliers');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const hasActiveFilters = Boolean(search || (statusFilter && statusFilter !== 'all'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await axios.put(`/api/suppliers/${editingSupplier.id || editingSupplier._id}`, formData);
        toast.success('Supplier updated successfully');
      } else {
        await axios.post('/api/suppliers', formData);
        toast.success('Supplier created successfully');
      }
      setShowModal(false);
      setEditingSupplier(null);
      resetForm();
      fetchSuppliers();
      refreshCounts();
    } catch (error) {
      const errMsg = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Error saving supplier';
      toast.error(errMsg);
    }
  };

  const handleToggleStatus = async (supplier) => {
    const newStatus = supplier.status === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(`/api/suppliers/${supplier.id || supplier._id}/status`, { status: newStatus });
      toast.success(`Supplier marked as ${newStatus}`);
      fetchSuppliers();
      refreshCounts();
    } catch (error) {
      toast.error('Failed to update supplier status');
    }
  };

  const handleDelete = (supplier) => {
    setDeleteTarget(supplier);
  };

  const confirmDeleteSupplier = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const supplierId = deleteTarget.id || deleteTarget._id;
      await axios.delete(`/api/suppliers/${supplierId}`);
      toast.success('Supplier deleted successfully');
      setDeleteTarget(null);
      fetchSuppliers();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error deleting supplier');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      status: supplier.status || 'active'
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      status: 'active'
    });
    setEditingSupplier(null);
  };

  const getRowActions = (supplier) => {
    const isAct = supplier.status === 'active';
    const actions = [
      {
        label: 'Edit',
        icon: 'ri-edit-line',
        onClick: () => handleEdit(supplier)
      },
      {
        label: isAct ? 'Deactivate' : 'Activate',
        icon: isAct ? 'ri-indeterminate-circle-line' : 'ri-checkbox-circle-line',
        warning: isAct,
        success: !isAct,
        onClick: () => handleToggleStatus(supplier)
      }
    ];

    if (isAdmin) {
      actions.push({
        label: 'Delete',
        icon: 'ri-delete-bin-line',
        danger: true,
        onClick: () => handleDelete(supplier)
      });
    }

    return actions;
  };

  return (
    <div className="suppliers">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Suppliers</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--gray-500)', fontSize: '13.5px' }}>
            Manage vendors, procurement contacts, and vendor catalogs
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="ri-user-add-line" /> Add Supplier
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <div className="table-filters" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <div className="table-search">
            <i className="ri-search-line table-search-icon" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--gray-500)' }}>
          {suppliers.length} suppliers
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : suppliers.length === 0 ? (
        <div className="table-empty">
          <i className="ri-building-line table-empty-icon" style={{ fontSize: '32px', color: 'var(--gray-300)' }} />
          <div className="table-empty-text">No suppliers found</div>
          <div className="table-empty-sub">
            {hasActiveFilters ? 'Try adjusting your filters or click "Clear Filters"' : 'Add your first supplier to get started'}
          </div>
          {hasActiveFilters && (
            <button className="btn btn-outline btn-sm" style={{ marginTop: '12px' }} onClick={handleClearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Status</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(supplier => {
                const sStatus = supplier.status || 'active';
                return (
                  <tr key={supplier.id || supplier._id}>
                    <td style={{ fontWeight: 600 }}>{supplier.name}</td>
                    <td>{supplier.contact_person || '—'}</td>
                    <td>{supplier.email || '—'}</td>
                    <td>{supplier.phone || '—'}</td>
                    <td>{supplier.address || '—'}</td>
                    <td>
                      <span className={`status-badge status-${sStatus}`}>
                        <i className={sStatus === 'active' ? 'ri-checkbox-circle-line' : 'ri-indeterminate-circle-line'} />
                        {sStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <ActionMenu actions={getRowActions(supplier)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {editingSupplier ? <><i className="ri-edit-line" /> Edit Supplier</> : <><i className="ri-user-add-line" /> Add Supplier</>}
              </div>
              <button className="modal-close-btn" type="button" onClick={() => { setShowModal(false); resetForm(); }}>
                <i className="ri-close-line" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label form-label-required">Supplier Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Kathmandu Distributing Co."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Rajesh Maharjan"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., +977-9841234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g., info@vendor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="e.g., Ward 4, New Road, Kathmandu"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Supplier?"
        message={`Are you sure you want to delete supplier "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Supplier"
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteSupplier}
      />
    </div>
  );
};

export default Suppliers;
