import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>Inventory System</h2>
      </div>
      <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        ☰
      </button>
      <ul className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <li><Link to="/" className={isActive('/') ? 'active' : ''}>Dashboard</Link></li>
        <li><Link to="/products" className={isActive('/products') ? 'active' : ''}>Products</Link></li>
        <li><Link to="/categories" className={isActive('/categories') ? 'active' : ''}>Categories</Link></li>
        <li><Link to="/suppliers" className={isActive('/suppliers') ? 'active' : ''}>Suppliers</Link></li>
        <li><Link to="/purchase-orders" className={isActive('/purchase-orders') ? 'active' : ''}>Purchase Order</Link></li>
        <li><Link to="/sales-orders" className={isActive('/sales-orders') ? 'active' : ''}>Sales Order</Link></li>
        <li><Link to="/reports" className={isActive('/reports') ? 'active' : ''}>Reports</Link></li>
        <li><Link to="/algorithms" className={isActive('/algorithms') ? 'active' : ''}>Algorithms</Link></li>
        <li className="user-info">
          <span>{user?.username} ({user?.role})</span>
          <button onClick={handleLogout}>Logout</button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;

