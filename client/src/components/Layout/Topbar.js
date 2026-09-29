import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';

const BREADCRUMB_LABELS = {
  '/':               { label: 'Dashboard',         icon: 'ri-dashboard-3-line' },
  '/products':       { label: 'Products',           icon: 'ri-box-3-line' },
  '/inventory':      { label: 'Stock & Ledger',     icon: 'ri-database-2-line' },
  '/damages':        { label: 'Damage & Loss',      icon: 'ri-error-warning-line' },
  '/purchase-orders':{ label: 'Purchase Orders',    icon: 'ri-shopping-cart-2-line' },
  '/suppliers':      { label: 'Suppliers',          icon: 'ri-building-line' },
  '/sales-orders':   { label: 'Sales Orders',       icon: 'ri-file-list-3-line' },
  '/customers':      { label: 'Customers',          icon: 'ri-team-line' },
  '/reports':        { label: 'Reports',            icon: 'ri-bar-chart-grouped-line' },
  '/algorithms':     { label: 'Demand & Reorder',   icon: 'ri-robot-2-line' },
  '/categories':     { label: 'Categories',         icon: 'ri-folder-3-line' },
  '/users':          { label: 'User Management',    icon: 'ri-user-settings-line' },
  '/audit-logs':     { label: 'Audit Trail',        icon: 'ri-shield-keyhole-line' },
  '/change-password':{ label: 'Change Password',    icon: 'ri-lock-password-line' }
};

const Topbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);

  // Get current page info
  const pathname = location.pathname;
  const pageInfo = BREADCRUMB_LABELS[pathname] || { label: 'Page', icon: 'ri-file-line' };

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // silent fail
    }
  };

  // Global search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.results);
      } catch {
        setSearchResults(null);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchResult = (type, item) => {
    setSearchQuery('');
    setShowSearch(false);
    setSearchResults(null);
    switch (type) {
      case 'product':       navigate(`/products?search=${item.sku}`); break;
      case 'customer':      navigate(`/customers?search=${item.name}`); break;
      case 'supplier':      navigate(`/suppliers?search=${item.name}`); break;
      case 'salesOrder':    navigate(`/sales-orders?search=${item.order_number}`); break;
      case 'purchaseOrder': navigate(`/purchase-orders?search=${item.order_number}`); break;
      default: break;
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put('/api/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const hasResults = searchResults && (
    searchResults.products?.length > 0 ||
    searchResults.customers?.length > 0 ||
    searchResults.suppliers?.length > 0 ||
    searchResults.salesOrders?.length > 0 ||
    searchResults.purchaseOrders?.length > 0
  );

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Mobile menu toggle */}
        <button
          className="topbar-icon-btn topbar-mobile-menu-btn"
          onClick={onMenuToggle}
          id="mobile-menu-btn"
          aria-label="Toggle Navigation"
        >
          <i className="ri-menu-line"></i>
        </button>

        {/* Page breadcrumb */}
        <div className="topbar-breadcrumb">
          <i className={pageInfo.icon}></i>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="topbar-breadcrumb-current">{pageInfo.label}</span>
        </div>
      </div>

      {/* Global Search */}
      <div className="topbar-search" ref={searchRef}>
        <i className="ri-search-line topbar-search-icon"></i>
        <input
          type="text"
          placeholder="Search products, orders, customers..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
          onFocus={() => setShowSearch(true)}
        />

        {showSearch && (searchLoading || hasResults || (searchQuery.length >= 2 && !searchLoading)) && (
          <div className="topbar-search-results">
            {searchLoading && (
              <div style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Searching...
              </div>
            )}
            {!searchLoading && !hasResults && searchQuery.length >= 2 && (
              <div style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                No results found for "{searchQuery}"
              </div>
            )}
            {!searchLoading && searchResults?.products?.length > 0 && (
              <>
                <div className="search-result-section-title">Products</div>
                {searchResults.products.map(p => (
                  <div key={p._id} className="search-result-item" onClick={() => handleSearchResult('product', p)}>
                    <i className="ri-box-3-line" style={{ color: 'var(--primary)' }}></i>
                    <div>
                      <div className="search-result-item-name">{p.name}</div>
                      <div className="search-result-item-sub">SKU: {p.sku} · Stock: {p.quantity}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {!searchLoading && searchResults?.customers?.length > 0 && (
              <>
                <div className="search-result-section-title">Customers</div>
                {searchResults.customers.map(c => (
                  <div key={c._id} className="search-result-item" onClick={() => handleSearchResult('customer', c)}>
                    <i className="ri-team-line" style={{ color: 'var(--primary)' }}></i>
                    <div>
                      <div className="search-result-item-name">{c.name}</div>
                      <div className="search-result-item-sub">{c.phone}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {!searchLoading && searchResults?.salesOrders?.length > 0 && (
              <>
                <div className="search-result-section-title">Sales Orders</div>
                {searchResults.salesOrders.map(o => (
                  <div key={o._id} className="search-result-item" onClick={() => handleSearchResult('salesOrder', o)}>
                    <i className="ri-file-list-3-line" style={{ color: 'var(--primary)' }}></i>
                    <div>
                      <div className="search-result-item-name">{o.order_number}</div>
                      <div className="search-result-item-sub">{o.customer_name}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {!searchLoading && searchResults?.purchaseOrders?.length > 0 && (
              <>
                <div className="search-result-section-title">Purchase Orders</div>
                {searchResults.purchaseOrders.map(o => (
                  <div key={o._id} className="search-result-item" onClick={() => handleSearchResult('purchaseOrder', o)}>
                    <i className="ri-shopping-cart-2-line" style={{ color: 'var(--primary)' }}></i>
                    <div>
                      <div className="search-result-item-name">{o.order_number}</div>
                      <div className="search-result-item-sub">NPR {(o.total_amount || 0).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Light / Night Switch */}
        <button
          className="topbar-icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Night Mode'}
          id="theme-toggle-btn"
        >
          <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'}></i>
        </button>

        {/* Notifications */}
        <div className="topbar-dropdown" ref={notifRef}>
          <button
            className="topbar-icon-btn"
            onClick={() => setShowNotifs(!showNotifs)}
            title="Notifications"
          >
            <i className="ri-notification-3-line"></i>
            {unreadCount > 0 && (
              <span className="topbar-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          {showNotifs && (
            <div className="topbar-dropdown-menu">
              <div className="topbar-dropdown-header">
                <span>Notifications {unreadCount > 0 && `(${unreadCount} new)`}</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead}>Mark all read</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 8).map(n => (
                  <div key={n._id} className={`notif-item${n.is_read ? '' : ' unread'}`}>
                    <div className="notif-item-title">
                      <span className={`notif-severity-dot ${n.severity}`} />
                      {n.title}
                    </div>
                    <div className="notif-item-msg">{n.message}</div>
                    <div className="notif-item-time">
                      {new Date(n.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
