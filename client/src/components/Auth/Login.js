import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Auth.css';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', username: 'admin', password: 'admin123', color: '#7C3AED' },
  { label: 'Admin', username: 'admin', password: 'admin123', color: '#2563EB' },
  { label: 'Inventory Mgr', username: 'inventory_mgr', password: 'admin123', color: '#059669' },
  { label: 'Sales', username: 'sales_rep', password: 'admin123', color: '#D97706' },
];

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData.username, formData.password);
      navigate('/');
    } catch (error) {
      // toast shown in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setFormData({ username: account.username, password: account.password });
  };

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      {/* Theme toggle */}
      <button className="auth-theme-btn" onClick={toggleTheme} title="Toggle theme">
        <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'} />
      </button>

      <div className="auth-card">
        {/* Header */}
        <div className="auth-card-header">
          <div className="auth-logo">
            <i className="ri-store-3-line" style={{ color: '#fff', fontSize: '28px' }} />
          </div>
          <h1>StockMaster</h1>
          <p>Inventory Management System</p>
        </div>

        {/* Body */}
        <div className="auth-card-body">
          <div className="auth-form-title">
            <h2>Sign in</h2>
            <p>Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="login-username">Username or Email</label>
              <div className="auth-input-wrap">
                <i className="ri-user-3-line auth-input-icon" />
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter username or email"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-wrap">
                <i className="ri-lock-line auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-show-pass"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <><i className="ri-loader-4-line auth-spin" /> Signing in...</>
              ) : (
                <><i className="ri-login-box-line" /> Sign in</>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>Quick Demo Sign-In</span>
          </div>

          <div className="auth-demo-grid">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.label}
                type="button"
                className="auth-demo-btn"
                style={{ '--demo-color': acc.color }}
                onClick={() => fillDemo(acc)}
                title={`Click to fill: ${acc.username} / ${acc.password}`}
              >
                <span className="auth-demo-dot" style={{ background: acc.color }} />
                <span>{acc.label}</span>
              </button>
            ))}
          </div>

          <p className="auth-footer-text">
            No account yet?{' '}
            <Link to="/register">Request access</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
