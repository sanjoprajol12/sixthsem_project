import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChangePassword from './components/Auth/ChangePassword';
import Dashboard from './components/Dashboard/Dashboard';
import Products from './components/Products/Products';
import Inventory from './components/Inventory/Inventory';
import Customers from './components/Customers/Customers';
import Suppliers from './components/Suppliers/Suppliers';
import PurchaseOrders from './components/PurchaseOrders/PurchaseOrders';
import SalesOrders from './components/SalesOrders/SalesOrders';
import Reports from './components/Reports/Reports';
import Algorithms from './components/Algorithms/Algorithms';
import Categories from './components/Categories/Categories';
import Damages from './components/Damages/Damages';
import Users from './components/Users/Users';
import AuditLogs from './components/AuditLogs/AuditLogs';
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import { SidebarCountsProvider } from './context/SidebarCountsContext';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <span>Loading StockMaster...</span>
      </div>
    );
  }

  const isActiveUser = user && user.status !== 'disabled' && user.status !== 'inactive' && user.status !== 'pending';
  return isActiveUser ? children : <Navigate to="/login" replace />;
};

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="main-content-area">
        <Topbar onMenuToggle={() => setMobileOpen(prev => !prev)} />
        <main className="page-wrapper">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/sales-orders" element={<SalesOrders />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/algorithms" element={<Algorithms />} />
            <Route path="/damages" element={<Damages />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SidebarCountsProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <AppLayout />
                  </PrivateRoute>
                }
              />
            </Routes>
            <ToastContainer position="top-right" autoClose={3000} />
          </Router>
        </SidebarCountsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
