import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSidebarCounts } from '../../context/SidebarCountsContext';

const ROLE_LABELS = {
  super_admin:       'Super Admin',
  admin:             'Admin',
  inventory_manager: 'Inventory Manager',
  sales_staff:       'Sales Staff',
  purchase_staff:    'Purchase Staff',
  staff:             'Staff'
};

const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { counts, loading } = useSidebarCounts();
  const navigate = useNavigate();
  const location = useLocation();

  const rawRole = (user?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const isSuperAdmin = rawRole === 'super_admin' || rawRole === 'superadmin';
  const isAdmin = isSuperAdmin || rawRole === 'admin';

  // Products submenu collapse state (open by default, especially if on /products)
  const [productsOpen, setProductsOpen] = useState(true);

  useEffect(() => {
    if (location.pathname.startsWith('/products')) {
      setProductsOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canView = (roles) => {
    if (!roles) return true;
    if (isAdmin) return true;
    return roles.map(r => r.toLowerCase().trim().replace(/[\s-]+/g, '_')).includes(rawRole);
  };

  const avatarInitials = (user?.full_name || user?.username || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const renderBadge = (val, isPending = false) => {
    if (loading && counts === null) {
      return <span className="sidebar-count">—</span>;
    }
    if (val === undefined || val === null) {
      return null;
    }
    return (
      <span className={`sidebar-count ${isPending && val > 0 ? 'sidebar-count-pending' : ''}`}>
        {val}
      </span>
    );
  };

  // Determine which child of products is active
  const isProductsActive = location.pathname === '/products';
  const searchParams = new URLSearchParams(location.search);
  const statusParam = searchParams.get('status');

  const isAllProductsActive = isProductsActive && (!statusParam || statusParam === 'all');
  const isApprovedActive = isProductsActive && statusParam === 'approved';
  const isPendingActive = isProductsActive && statusParam === 'pending';
  const isDisapprovedActive = isProductsActive && statusParam === 'disapproved';

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99,
            backdropFilter: 'blur(2px)'
          }}
          onClick={onMobileClose}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <div className="sidebar-brand-icon">
              <i className="ri-box-3-fill" style={{ fontSize: '18px', color: '#fff' }}></i>
            </div>
            <div className="sidebar-brand-text">
              <h1>StockMaster</h1>
              <span>Enterprise Inventory</span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">{avatarInitials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name || user?.username}</div>
            <div className="sidebar-user-role">{ROLE_LABELS[rawRole] || user?.role}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* SECTION: Overview */}
          <div>
            <div className="sidebar-section-label">Overview</div>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onMobileClose}
            >
              <i className="ri-dashboard-3-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
              <span>Dashboard</span>
            </NavLink>
          </div>

          {/* SECTION: Inventory */}
          <div>
            <div className="sidebar-section-label">Inventory</div>
            
            {/* Products: Super Admin nested view vs standard view */}
            {isSuperAdmin ? (
              <div className="sidebar-parent-group">
                <button
                  type="button"
                  className={`sidebar-parent-btn ${isProductsActive ? 'active' : ''}`}
                  onClick={() => setProductsOpen(prev => !prev)}
                >
                  <i className="ri-box-3-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
                  <span style={{ flex: 1 }}>Products</span>
                  {renderBadge(counts?.products?.total)}
                  <i className={`ri-arrow-right-s-line sidebar-parent-chevron ${productsOpen ? 'open' : ''}`} />
                </button>

                {productsOpen && (
                  <div className="sidebar-submenu">
                    <Link
                      to="/products"
                      className={`sidebar-sublink ${isAllProductsActive ? 'active' : ''}`}
                      onClick={onMobileClose}
                    >
                      <i className="ri-list-check" style={{ fontSize: '14px' }}></i>
                      <span style={{ flex: 1 }}>All Products</span>
                      {renderBadge(counts?.products?.total)}
                    </Link>

                    <Link
                      to="/products?status=approved"
                      className={`sidebar-sublink ${isApprovedActive ? 'active' : ''}`}
                      onClick={onMobileClose}
                    >
                      <i className="ri-checkbox-circle-line" style={{ fontSize: '14px', color: '#10B981' }}></i>
                      <span style={{ flex: 1 }}>Approved</span>
                      {renderBadge(counts?.products?.approved)}
                    </Link>

                    <Link
                      to="/products?status=pending"
                      className={`sidebar-sublink ${isPendingActive ? 'active' : ''}`}
                      onClick={onMobileClose}
                    >
                      <i className="ri-time-line" style={{ fontSize: '14px', color: '#F59E0B' }}></i>
                      <span style={{ flex: 1 }}>Pending</span>
                      {renderBadge(counts?.products?.pending, true)}
                    </Link>

                    <Link
                      to="/products?status=disapproved"
                      className={`sidebar-sublink ${isDisapprovedActive ? 'active' : ''}`}
                      onClick={onMobileClose}
                    >
                      <i className="ri-close-circle-line" style={{ fontSize: '14px', color: '#EF4444' }}></i>
                      <span style={{ flex: 1 }}>Disapproved</span>
                      {renderBadge(counts?.products?.disapproved)}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to="/products"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={onMobileClose}
              >
                <i className="ri-box-3-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
                <span style={{ flex: 1 }}>Products</span>
                {renderBadge(counts?.products?.total)}
              </NavLink>
            )}

            <NavLink
              to="/inventory"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onMobileClose}
            >
              <i className="ri-database-2-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
              <span style={{ flex: 1 }}>Stock & Ledger</span>
            </NavLink>

            {canView(['super_admin', 'admin', 'inventory_manager']) && (
              <NavLink
                to="/damages"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={onMobileClose}
              >
                <i className="ri-error-warning-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
                <span style={{ flex: 1 }}>Damage & Loss</span>
                {renderBadge(counts?.damages?.total)}
              </NavLink>
            )}
          </div>

          {/* SECTION: Procurement */}
          <div>
            <div className="sidebar-section-label">Procurement</div>
            <NavLink
              to="/purchase-orders"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onMobileClose}
            >
              <i className="ri-shopping-cart-2-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
              <span style={{ flex: 1 }}>Purchase Orders</span>
              {renderBadge(counts?.purchaseOrders?.total)}
            </NavLink>

            {canView(['super_admin', 'admin', 'inventory_manager', 'purchase_staff']) && (
              <NavLink
                to="/suppliers"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={onMobileClose}
              >
                <i className="ri-building-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
                <span style={{ flex: 1 }}>Suppliers</span>
                {renderBadge(counts?.suppliers?.total)}
              </NavLink>
            )}
          </div>

          {/* SECTION: Sales */}
          <div>
            <div className="sidebar-section-label">Sales</div>
            <NavLink
              to="/sales-orders"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onMobileClose}
            >
              <i className="ri-file-list-3-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
              <span style={{ flex: 1 }}>Sales Orders</span>
              {renderBadge(counts?.salesOrders?.total)}
            </NavLink>

            <NavLink
              to="/customers"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onMobileClose}
            >
              <i className="ri-team-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
              <span style={{ flex: 1 }}>Customers</span>
              {renderBadge(counts?.customers?.total)}
            </NavLink>
          </div>

          {/* SECTION: Analytics */}
          <div>
            <div className="sidebar-section-label">Analytics</div>
            <NavLink
              to="/reports"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onMobileClose}
            >
              <i className="ri-bar-chart-grouped-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
              <span>Reports</span>
            </NavLink>

            <NavLink
              to="/algorithms"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onMobileClose}
            >
              <i className="ri-robot-2-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
              <span>Demand & Reorder</span>
            </NavLink>
          </div>

          {/* SECTION: Administration */}
          {canView(['super_admin', 'admin']) && (
            <div>
              <div className="sidebar-section-label">Administration</div>
              <NavLink
                to="/categories"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={onMobileClose}
              >
                <i className="ri-folder-3-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
                <span style={{ flex: 1 }}>Categories</span>
                {renderBadge(counts?.categories?.total)}
              </NavLink>

              <NavLink
                to="/users"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={onMobileClose}
              >
                <i className="ri-user-settings-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
                <span style={{ flex: 1 }}>User Management</span>
                {renderBadge(counts?.users?.total)}
              </NavLink>

              <NavLink
                to="/audit-logs"
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={onMobileClose}
              >
                <i className="ri-shield-keyhole-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
                <span>Audit Trail</span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-link"
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', marginBottom: '4px' }}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            <i className={`${theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'} sidebar-link-icon`} style={{ fontSize: '16px', color: theme === 'dark' ? '#FBBF24' : '#60A5FA' }}></i>
            <span>{theme === 'dark' ? 'Light Mode' : 'Night Mode'}</span>
          </button>
          <Link to="/change-password" className="sidebar-link" style={{ marginBottom: '8px' }} onClick={onMobileClose}>
            <i className="ri-lock-password-line sidebar-link-icon" style={{ fontSize: '16px' }}></i>
            <span>Change Password</span>
          </Link>
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <i className="ri-logout-box-r-line" style={{ marginRight: '6px' }}></i>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
