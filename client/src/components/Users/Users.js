import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './Users.css';

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'staff',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
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
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error creating user');
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await axios.put(`/api/users/${id}/role`, { role });
      toast.success('Role updated');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error updating role');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await axios.delete(`/api/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error deleting user');
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
              <option value="admin">Admin</option>
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
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
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>{new Date(u.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === user.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Users;

