import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BREADCRUMB_LABELS = {
  '/':               { label: 'Dashboard',         icon: '📊' },
  '/products':       { label: 'Products',           icon: '📦' },
  '/inventory':      { label: 'Stock & Ledger',     icon: '🏷️' },
  '/damages':        { label: 'Damage & Loss',      icon: '🔴' },
  '/purchase-orders':{ label: 'Purchase Orders',    icon: '🛒' },
  '/suppliers':      { label: 'Suppliers',          icon: '🏭' },
  '/sales-orders':   { label: 'Sales Orders',       icon: '🧾' },
  '/customers':      { label: 'Customers',          icon: '👥' },
  '/reports':        { label: 'Reports',            icon: '📈' },
  '/algorithms':     { label: 'Demand & Reorder',   icon: '🤖' },
  '/categories':     { label: 'Categories',         icon: '🗂️' },
  '/users':          { label: 'User Management',    icon: '👤' },
  '/audit-logs':     { label: 'Audit Trail',        icon: '🔍' },
  '/change-password':{ label: 'Change Password',    icon: '🔑' }
};

const Topbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
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
  const pathname = window.location.pathname;
  const pageInfo = BREADCRUMB_LABELS[pathname] || { label: 'Page', icon: '📄' };

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
    } catch (err) {
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
      case 'product':    navigate(`/products?search=${item.sku}`); break;
      case 'customer':   navigate(`/customers?search=${item.name}`); break;
      case 'supplier':   navigate(`/suppliers?search=${item.name}`); break;
      case 'salesOrder': navigate(`/sales-orders?search=${item.order_number}`); break;
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
          className="topbar-icon-btn"
          onClick={onMenuToggle}
          style={{ display: 'none' }}
          id="mobile-menu-btn"
        >
          ☰
        </button>

        {/* Page breadcrumb */}
        <div className="topbar-breadcrumb">
          <span>{pageInfo.icon}</span>
          <span>/</span>
          <span className="topbar-breadcrumb-current">{pageInfo.label}</span>
        </div>
      </div>

      {/* Global Search */}
      <div className="topbar-search" ref={searchRef}>
        <span className="topbar-search-icon">🔍</span>
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
              <div style={{ padding: '14px 16px', fontSize: '13px', color: '#6B7280' }}>
                Searching...
              </div>
            )}
            {!searchLoading && !hasResults && searchQuery.length >= 2 && (
              <div style={{ padding: '14px 16px', fontSize: '13px', color: '#6B7280' }}>
                No results found for "{searchQuery}"
              </div>
            )}
            {!searchLoading && searchResults?.products?.length > 0 && (
              <>
                <div className="search-result-section-title">Products</div>
                {searchResults.products.map(p => (
                  <div key={p._id} className="search-result-item" onClick={() => handleSearchResult('product', p)}>
                    <span>📦</span>
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
                    <span>👥</span>
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
                    <span>🧾</span>
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
                    <span>🛒</span>
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
        {/* Notifications */}
        <div className="topbar-dropdown" ref={notifRef}>
          <button
            className="topbar-icon-btn"
            onClick={() => setShowNotifs(!showNotifs)}
            title="Notifications"
          >
            🔔
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
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 8).map(n => (
                  <div key={n._id} className={`notif-item${n.is_read ? '' : ' unread'}`}
                    style={!n.is_read ? { backgroundColor: '#EFF6FF' } : {}}>
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
