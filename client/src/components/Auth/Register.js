import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'sales_staff'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      navigate('/login');
    } catch (error) {
      // toast shown in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <button className="auth-theme-btn" onClick={toggleTheme} title="Toggle theme">
        <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'} />
      </button>

      <div className="auth-card auth-card-wide">
        <div className="auth-card-header">
          <div className="auth-logo">
            <i className="ri-store-3-line" style={{ color: '#fff', fontSize: '28px' }} />
          </div>
          <h1>StockMaster</h1>
          <p>Request an account to get started</p>
        </div>

        <div className="auth-card-body">
          <div className="auth-form-title">
            <h2>Create account</h2>
            <p>Your account will need admin approval before you can sign in</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-row">
              <div className="auth-input-group">
                <label htmlFor="reg-username">Username</label>
                <div className="auth-input-wrap">
                  <i className="ri-at-line auth-input-icon" />
                  <input
                    id="reg-username"
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="reg-fullname">Full Name</label>
                <div className="auth-input-wrap">
                  <i className="ri-user-3-line auth-input-icon" />
                  <input
                    id="reg-fullname"
                    type="text"
                    placeholder="Your full name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    autoComplete="name"
                  />
                </div>
              </div>
            </div>

            <div className="auth-input-group">
              <label htmlFor="reg-email">Email</label>
              <div className="auth-input-wrap">
                <i className="ri-mail-line auth-input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-form-row">
              <div className="auth-input-group">
                <label htmlFor="reg-password">Password</label>
                <div className="auth-input-wrap">
                  <i className="ri-lock-line auth-input-icon" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
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

              <div className="auth-input-group">
                <label htmlFor="reg-confirm">Confirm Password</label>
                <div className="auth-input-wrap">
                  <i className="ri-lock-2-line auth-input-icon" />
                  <input
                    id="reg-confirm"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <div className="auth-input-group">
              <label htmlFor="reg-role">Requested Role</label>
              <div className="auth-input-wrap">
                <i className="ri-shield-user-line auth-input-icon" />
                <select
                  id="reg-role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="sales_staff">Sales Staff</option>
                  <option value="purchase_staff">Purchase Staff</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>

            <div className="auth-notice">
              <i className="ri-information-line" />
              <span>Account creation requires admin approval. You'll receive access once approved.</span>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <><i className="ri-loader-4-line auth-spin" /> Submitting request...</>
              ) : (
                <><i className="ri-user-add-line" /> Create account</>
              )}
            </button>
          </form>

          <p className="auth-footer-text">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
