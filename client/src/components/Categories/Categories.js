import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSidebarCounts } from '../../context/SidebarCountsContext';
import { useAuth } from '../../context/AuthContext';
import ActionMenu from '../Common/ActionMenu';
import ConfirmDialog from '../Common/ConfirmDialog';
import './Categories.css';

const Categories = () => {
  const { user } = useAuth();
  const { refreshCounts } = useSidebarCounts();
  const rawRole = (user?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const isAdmin = rawRole === 'super_admin' || rawRole === 'superadmin' || rawRole === 'admin';

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({ id: null, name: '', description: '', status: 'active' });

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await axios.get(`/api/categories?${params}`);
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error('Error loading categories');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const hasActiveFilters = Boolean(search || (statusFilter && statusFilter !== 'all'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await axios.put(`/api/categories/${formData.id}`, {
          name: formData.name,
          description: formData.description,
          status: formData.status
        });
        toast.success('Category updated successfully');
      } else {
        await axios.post('/api/categories', {
          name: formData.name,
          description: formData.description,
          status: formData.status
        });
        toast.success('Category created successfully');
      }
      setFormData({ id: null, name: '', description: '', status: 'active' });
      fetchCategories();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error saving category');
    }
  };

  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === 'active' ? 'inactive' : 'active';
    try {
      await axios.put(`/api/categories/${cat.id || cat._id}/status`, { status: newStatus });
      toast.success(`Category status updated to ${newStatus}`);
      fetchCategories();
      refreshCounts();
    } catch (error) {
      toast.error('Failed to update category status');
    }
  };

  const handleEdit = (cat) => {
    setFormData({
      id: cat.id || cat._id,
      name: cat.name,
      description: cat.description || '',
      status: cat.status || 'active'
    });
  };

  const handleDelete = (cat) => {
    setDeleteTarget(cat);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const catId = deleteTarget.id || deleteTarget._id;
      await axios.delete(`/api/categories/${catId}`);
      toast.success('Category deleted');
      setDeleteTarget(null);
      fetchCategories();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error deleting category');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRowActions = (cat) => {
    const isAct = cat.status === 'active';
    const actions = [
      {
        label: 'Edit',
        icon: 'ri-edit-line',
        onClick: () => handleEdit(cat)
      },
      {
        label: isAct ? 'Deactivate' : 'Activate',
        icon: isAct ? 'ri-indeterminate-circle-line' : 'ri-checkbox-circle-line',
        warning: isAct,
        success: !isAct,
        onClick: () => handleToggleStatus(cat)
      }
    ];

    if (isAdmin) {
      actions.push({
        label: 'Delete',
        icon: 'ri-delete-bin-line',
        danger: true,
        onClick: () => handleDelete(cat)
      });
    }

    return actions;
  };

  return (
    <div className="categories">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Categories</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--gray-500)', fontSize: '13.5px' }}>
            Organize products into classification groups and categories
          </p>
        </div>
      </div>

      <div className="categories-layout">
        <form className="category-form" onSubmit={handleSubmit}>
          <h3>{formData.id ? 'Edit Category' : 'Add Category'}</h3>
          <div className="form-group">
            <label className="form-label form-label-required">Name</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Beverages"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Category description..."
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
          <div className="modal-actions" style={{ borderTop: 'none', paddingTop: '10px' }}>
            <button type="submit" className="btn btn-primary">
              <i className="ri-check-line" /> {formData.id ? 'Update Category' : 'Save Category'}
            </button>
            {formData.id && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFormData({ id: null, name: '', description: '', status: 'active' })}
              >
                <i className="ri-close-line" /> Cancel
              </button>
            )}
          </div>
        </form>

        <div className="category-list">
          {/* Filters */}
          <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <div className="table-search">
              <i className="ri-search-line table-search-icon" />
              <input
                type="text"
                placeholder="Search categories..."
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
                Clear
              </button>
            )}
          </div>

          <h3>Existing Categories ({categories.length})</h3>
          {loading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : categories.length === 0 ? (
            <div className="table-empty">
              <i className="ri-folder-3-line table-empty-icon" style={{ fontSize: '32px', color: 'var(--gray-300)' }} />
              <div className="table-empty-text">No categories found</div>
              {hasActiveFilters && (
                <button className="btn btn-outline btn-sm" style={{ marginTop: '8px' }} onClick={handleClearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const cStatus = cat.status || 'active';
                  return (
                    <tr key={cat.id || cat._id}>
                      <td style={{ fontWeight: 600 }}>{cat.name}</td>
                      <td>{cat.description || '—'}</td>
                      <td>
                        <span className={`status-badge status-${cStatus}`}>
                          <i className={cStatus === 'active' ? 'ri-checkbox-circle-line' : 'ri-indeterminate-circle-line'} />
                          {cStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <ActionMenu actions={getRowActions(cat)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Category?"
        message={`Are you sure you want to delete category "${deleteTarget?.name}"? Any products assigned to this category may need to be updated.`}
        confirmLabel="Delete Category"
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteCategory}
      />
    </div>
  );
};

export default Categories;
