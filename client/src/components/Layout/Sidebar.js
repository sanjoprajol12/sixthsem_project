import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: '📊', label: 'Dashboard', exact: true }
    ]
  },
  {
    label: 'Inventory',
    items: [
      { path: '/products',   icon: '📦', label: 'Products' },
      { path: '/inventory',  icon: '🏷️', label: 'Stock & Ledger' },
      { path: '/damages',    icon: '🔴', label: 'Damage & Loss', roles: ['super_admin','admin','inventory_manager'] }
    ]
  },
  {
    label: 'Procurement',
    items: [
      { path: '/purchase-orders', icon: '🛒', label: 'Purchase Orders' },
      { path: '/suppliers',       icon: '🏭', label: 'Suppliers', roles: ['super_admin','admin','inventory_manager','purchase_staff'] }
    ]
  },
  {
    label: 'Sales',
    items: [
      { path: '/sales-orders', icon: '🧾', label: 'Sales Orders' },
      { path: '/customers',    icon: '👥', label: 'Customers' }
    ]
  },
  {
    label: 'Analytics',
    items: [
      { path: '/reports',    icon: '📈', label: 'Reports' },
      { path: '/algorithms', icon: '🤖', label: 'Demand & Reorder' }
    ]
  },
  {
    label: 'Administration',
    roles: ['super_admin','admin'],
    items: [
      { path: '/categories', icon: '🗂️', label: 'Categories',  roles: ['super_admin','admin'] },
      { path: '/users',      icon: '👤', label: 'User Management', roles: ['super_admin','admin'] },
      { path: '/audit-logs', icon: '🔍', label: 'Audit Trail', roles: ['super_admin','admin'] }
    ]
  }
];

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
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canView = (roles) => {
    if (!roles) return true;
    return roles.includes(user?.role);
  };

  const avatarInitials = (user?.full_name || user?.username || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
            <div className="sidebar-brand-icon">📦</div>
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
            <div className="sidebar-user-role">{ROLE_LABELS[user?.role] || user?.role}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map(section => {
            if (section.roles && !canView(section.roles)) return null;
            const visibleItems = section.items.filter(item => canView(item.roles));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label}>
                <div className="sidebar-section-label">{section.label}</div>
                {visibleItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    onClick={onMobileClose}
                  >
                    <span className="sidebar-link-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <Link to="/change-password" className="sidebar-link" style={{marginBottom: '8px'}} onClick={onMobileClose}>
            <span className="sidebar-link-icon">🔑</span>
            Change Password
          </Link>
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <span>🚪</span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
