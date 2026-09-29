import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './Users.css';

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState({ purchaseOrders: [], salesOrders: [] });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'staff',
  });

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = isSuperAdmin || user?.role === 'admin';

  const fetchUsersWithActivity = useCallback(async () => {
    try {
      const [usersRes, purchaseRes, salesRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/purchase-orders'),
        axios.get('/api/sales-orders'),
      ]);

      setUsers(usersRes.data);

      const activityMap = {};
      purchaseRes.data.forEach((po) => {
        const creatorId = po.created_by?._id || po.created_by?.id || (typeof po.created_by === 'string' ? po.created_by : null);
        if (!creatorId) return;
        if (!activityMap[creatorId]) {
          activityMap[creatorId] = { purchaseOrders: 0, salesOrders: 0 };
        }
        activityMap[creatorId].purchaseOrders += 1;
      });

      salesRes.data.forEach((so) => {
        const creatorId = so.created_by?._id || so.created_by?.id || (typeof so.created_by === 'string' ? so.created_by : null);
        if (!creatorId) return;
        if (!activityMap[creatorId]) {
          activityMap[creatorId] = { purchaseOrders: 0, salesOrders: 0 };
        }
        activityMap[creatorId].salesOrders += 1;
      });

      setActivity(activityMap);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error loading users');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsersWithActivity();
    } else {
      setLoading(false);
    }
  }, [isAdmin, fetchUsersWithActivity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users', formData);
      toast.success('User created successfully');
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'staff',
      });
      fetchUsersWithActivity();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error creating user');
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await axios.put(`/api/users/${id}/role`, { role });
      toast.success('Role updated successfully');
      fetchUsersWithActivity();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error updating role');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await axios.delete(`/api/users/${id}`);
      toast.success('User deleted');
      fetchUsersWithActivity();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error deleting user');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`/api/users/${id}/status`, { status });
      toast.success(`User marked as ${status}`);
      fetchUsersWithActivity();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error updating status');
    }
  };

  const handleViewActivity = async (targetUser) => {
    setSelectedUser(targetUser);
    try {
      const [pos, sos] = await Promise.all([
        axios.get('/api/purchase-orders'),
        axios.get('/api/sales-orders'),
      ]);

      const userPOs = pos.data.filter((po) => {
        const cId = po.created_by?._id || po.created_by?.id || po.created_by;
        return cId === targetUser.id;
      });

      const userSOs = sos.data.filter((so) => {
        const cId = so.created_by?._id || so.created_by?.id || so.created_by;
        return cId === targetUser.id;
      });

      setSelectedActivity({ purchaseOrders: userPOs, salesOrders: userSOs });
    } catch (error) {
      toast.error('Error fetching activity details');
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <div className="page-header">
          <h1>User Management</h1>
        </div>
        <div className="alert alert-warning">
          <i className="ri-error-warning-line"></i>
          You do not have permission to view this page.
        </div>
      </div>
    );
  }

  const canManageTarget = (u) => {
    if (u.id === user.id) return false;
    if (isSuperAdmin) return true;
    if (u.role === 'admin' || u.role === 'super_admin') return false;
    return true;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>User Management</h1>
          <p>Create staff accounts, assign operational permissions, and audit user activity</p>
        </div>
      </div>

      <div className="users-layout">
        {/* Create User Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <i className="ri-user-add-line" style={{ marginRight: '6px', color: 'var(--primary)' }}></i>
              Create New User
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <div className="form-group mb-3">
              <label className="form-label form-label-required">Username</label>
              <input
                type="text"
                className="form-control"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                placeholder="e.g. john_doe"
              />
            </div>
            <div className="form-group mb-3">
              <label className="form-label form-label-required">Email</label>
              <input
                type="email"
                className="form-control"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="john@example.com"
              />
            </div>
            <div className="form-group mb-3">
              <label className="form-label form-label-required">Password</label>
              <input
                type="password"
                className="form-control"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="form-group mb-4">
              <label className="form-label">Role</label>
              <select
                className="form-control"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="staff">Staff</option>
                <option value="inventory_manager">Inventory Manager</option>
                <option value="sales_staff">Sales Staff</option>
                <option value="purchase_staff">Purchase Staff</option>
                <option value="admin">Admin</option>
                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <i className="ri-user-add-line"></i>
              Create User
            </button>
          </form>
        </div>

        {/* Existing Users Table */}
        <div className="table-container">
          <div className="table-toolbar">
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Registered Accounts</span>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {users.length} accounts
            </div>
          </div>

          {loading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="table-empty">
              <i className="ri-team-line table-empty-icon"></i>
              <div className="table-empty-text">No users found</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Activity</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const manageable = canManageTarget(u);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.username}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td>
                        {manageable ? (
                          <select
                            className="filter-select"
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            style={{ padding: '4px 24px 4px 8px', fontSize: '12px' }}
                          >
                            <option value="staff">Staff</option>
                            <option value="inventory_manager">Inventory Manager</option>
                            <option value="sales_staff">Sales Staff</option>
                            <option value="purchase_staff">Purchase Staff</option>
                            <option value="admin">Admin</option>
                            {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                          </select>
                        ) : (
                          <span className="badge badge-primary">{u.role}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'badge-success' : u.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12.5px' }}>
                        <div>PO: <strong>{activity[u.id]?.purchaseOrders || 0}</strong></div>
                        <div>SO: <strong>{activity[u.id]?.salesOrders || 0}</strong></div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => handleViewActivity(u)}
                            title="View Activity"
                          >
                            <i className="ri-eye-line"></i>
                          </button>

                          {manageable && u.status === 'pending' && (
                            <button
                              className="btn btn-success btn-xs"
                              onClick={() => handleStatusChange(u.id, 'active')}
                              title="Approve"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                          )}

                          {manageable && u.status === 'active' && (
                            <button
                              className="btn btn-warning btn-xs"
                              onClick={() => handleStatusChange(u.id, 'disabled')}
                              title="Disable"
                            >
                              <i className="ri-pause-line"></i>
                            </button>
                          )}

                          {manageable && u.status === 'disabled' && (
                            <button
                              className="btn btn-primary btn-xs"
                              onClick={() => handleStatusChange(u.id, 'active')}
                              title="Activate"
                            >
                              <i className="ri-play-line"></i>
                            </button>
                          )}

                          {manageable && (
                            <button
                              className="btn btn-danger btn-xs"
                              onClick={() => handleDelete(u.id)}
                              title="Delete User"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* User Activity Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedUser(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">
                  <i className="ri-user-line" style={{ marginRight: '6px' }}></i>
                  Activity for {selectedUser.username}
                </div>
                <div className="modal-subtitle">{selectedUser.email} · Role: {selectedUser.role}</div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedUser(null)}>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Purchase Orders Created ({selectedActivity.purchaseOrders.length})
                </h4>
                {selectedActivity.purchaseOrders.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No purchase orders created.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Supplier</th>
                        <th>Status</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedActivity.purchaseOrders.map(po => (
                        <tr key={po._id}>
                          <td style={{ fontWeight: 600 }}>{po.order_number}</td>
                          <td>{po.supplier_name || 'N/A'}</td>
                          <td><span className="badge badge-info">{po.status}</span></td>
                          <td style={{ fontWeight: 600 }}>NPR {Number(po.total_amount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Sales Orders Handled ({selectedActivity.salesOrders.length})
                </h4>
                {selectedActivity.salesOrders.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No sales orders handled.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedActivity.salesOrders.map(so => (
                        <tr key={so._id}>
                          <td style={{ fontWeight: 600 }}>{so.order_number}</td>
                          <td>{so.customer_name || 'Walk-in'}</td>
                          <td><span className="badge badge-success">{so.status}</span></td>
                          <td style={{ fontWeight: 600 }}>NPR {Number(so.total_amount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
