import React, { useEffect, useState } from 'react';
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
  const [activityLoading, setActivityLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'staff',
  });

  useEffect(() => {
    fetchUsersWithActivity();
  }, []);

  const fetchUsersWithActivity = async () => {
    try {
      const [usersRes, purchaseRes, salesRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/purchase-orders'),
        axios.get('/api/sales-orders'),
      ]);

      setUsers(usersRes.data);

      const activityMap = {};
      purchaseRes.data.forEach((po) => {
        if (!po.created_by) return;
        if (!activityMap[po.created_by]) {
          activityMap[po.created_by] = { purchaseOrders: 0, salesOrders: 0 };
        }
        activityMap[po.created_by].purchaseOrders += 1;
      });

      salesRes.data.forEach((so) => {
        if (!so.created_by) return;
        if (!activityMap[so.created_by]) {
          activityMap[so.created_by] = { purchaseOrders: 0, salesOrders: 0 };
        }
        activityMap[so.created_by].salesOrders += 1;
      });

      setActivity(activityMap);
      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error loading users');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users', formData);
      toast.success('User created');
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
      toast.success('Role updated');
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
      toast.success('Status updated');
      fetchUsersWithActivity();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error updating status');
    }
  };

  const handleViewActivity = async (u) => {
    setSelectedUser(u);
    setActivityLoading(true);
    try {
      const [purchaseRes, salesRes] = await Promise.all([
        axios.get('/api/purchase-orders'),
        axios.get('/api/sales-orders'),
      ]);

      const userPurchase = purchaseRes.data.filter((po) => po.created_by === u.id);
      const userSales = salesRes.data.filter((so) => so.created_by === u.id);

      setSelectedActivity({
        purchaseOrders: userPurchase,
        salesOrders: userSales,
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error loading user activity');
    } finally {
      setActivityLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="users"><p>You do not have permission to view this page.</p></div>;
  }

  return (
    <div className="users">
      <div className="page-header">
        <h1>User Management</h1>
      </div>

      <div className="users-layout">
        <form className="user-form" onSubmit={handleSubmit}>
          <h3>Create New User</h3>
          <div className="form-group">
            <label>Username *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="staff">Staff</option>
              
            </select>
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">
              Create User
            </button>
          </div>
        </form>

        <div className="users-list">
          <h3>Existing Users</h3>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : users.length === 0 ? (
            <p>No users found.</p>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Purchase Orders</th>
                    <th>Sales Orders</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin" disabled>
                            Admin
                          </option>
                        </select>
                      </td>
                      <td>{u.status}</td>
                      <td>{activity[u.id]?.purchaseOrders || 0}</td>
                      <td>{activity[u.id]?.salesOrders || 0}</td>
                      <td>{new Date(u.created_at).toLocaleString()}</td>
                      <td>
                        <button
                          className="btn-secondary"
                          style={{ marginRight: '6px' }}
                          onClick={() => handleViewActivity(u)}
                        >
                          View Activity
                        </button>
                        {u.role !== 'admin' && (
                          <>
                            {u.status === 'pending' && (
                              <>
                                <button
                                  className="btn-primary"
                                  onClick={() => handleStatusChange(u.id, 'active')}
                                  style={{ marginRight: '6px' }}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-secondary"
                                  onClick={() => handleStatusChange(u.id, 'disabled')}
                                  style={{ marginRight: '6px' }}
                                >
                                  Disapprove
                                </button>
                              </>
                            )}
                            {u.status === 'active' && (
                              <button
                                className="btn-secondary"
                                onClick={() => handleStatusChange(u.id, 'disabled')}
                                style={{ marginRight: '6px' }}
                              >
                                Disable
                              </button>
                            )}
                            {u.status === 'disabled' && (
                              <button
                                className="btn-primary"
                                onClick={() => handleStatusChange(u.id, 'active')}
                                style={{ marginRight: '6px' }}
                              >
                                Activate
                              </button>
                            )}
                          </>
                        )}
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(u.id)}
                          disabled={u.id === user.id || u.role === 'admin'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedUser && (
                <div className="user-activity">
                  <h3>
                    Activity for {selectedUser.username} ({selectedUser.email})
                  </h3>
                  {activityLoading ? (
                    <div className="loading">Loading activity...</div>
                  ) : (
                    <>
                      <h4>Purchase Orders</h4>
                      {selectedActivity.purchaseOrders.length === 0 ? (
                        <p>No purchase orders.</p>
                      ) : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Order #</th>
                              <th>Supplier</th>
                              <th>Status</th>
                              <th>Total</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedActivity.purchaseOrders.map((po) => (
                              <tr key={po.id}>
                                <td>{po.order_number}</td>
                                <td>{po.supplier_name || 'N/A'}</td>
                                <td>{po.status}</td>
                                <td>Rs. {po.total_amount.toFixed(2)}</td>
                                <td>{new Date(po.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      <h4>Sales Orders</h4>
                      {selectedActivity.salesOrders.length === 0 ? (
                        <p>No sales orders.</p>
                      ) : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Order #</th>
                              <th>Customer</th>
                              <th>Status</th>
                              <th>Total</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedActivity.salesOrders.map((so) => (
                              <tr key={so.id}>
                                <td>{so.order_number}</td>
                                <td>{so.customer_name || 'N/A'}</td>
                                <td>{so.status}</td>
                                <td>Rs. {so.total_amount.toFixed(2)}</td>
                                <td>{new Date(so.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Users;

