import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Auth.css';

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const toggleShow = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }
    setLoading(true);
    try {
      await axios.put('/api/users/me/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      toast.success('Password updated successfully');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card">
        {/* Header */}
        <div className="auth-card-header">
          <div className="auth-logo">
            <i className="ri-lock-password-line" style={{ color: '#fff', fontSize: '28px' }} />
          </div>
          <h1>StockMaster</h1>
          <p>Security Settings</p>
        </div>

        {/* Body */}
        <div className="auth-card-body">
          <div className="auth-form-title">
            <h2>Change Password</h2>
            <p>Please enter your current password and choose a new one</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Current Password */}
            <div className="auth-input-group">
              <label htmlFor="current-password">Current Password</label>
              <div className="auth-input-wrap">
                <i className="ri-lock-line auth-input-icon" />
                <input
                  id="current-password"
                  type={showPasswords.current ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-show-pass"
                  onClick={() => toggleShow('current')}
                  tabIndex={-1}
                >
                  <i className={showPasswords.current ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="auth-input-group">
              <label htmlFor="new-password">New Password</label>
              <div className="auth-input-wrap">
                <i className="ri-shield-keyhole-line auth-input-icon" />
                <input
                  id="new-password"
                  type={showPasswords.new ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-show-pass"
                  onClick={() => toggleShow('new')}
                  tabIndex={-1}
                >
                  <i className={showPasswords.new ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="auth-input-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <div className="auth-input-wrap">
                <i className="ri-check-double-line auth-input-icon" />
                <input
                  id="confirm-password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-show-pass"
                  onClick={() => toggleShow('confirm')}
                  tabIndex={-1}
                >
                  <i className={showPasswords.confirm ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <><i className="ri-loader-4-line auth-spin" /> Updating...</>
              ) : (
                <><i className="ri-save-3-line" /> Update Password</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;