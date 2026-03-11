import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    totalSuppliers: 0,
    pendingOrders: 0,
    totalSales: 0
  });
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [productsRes, alertsRes, suppliersRes, purchaseRes, salesRes] = await Promise.all([
        axios.get('/api/products'),
        axios.get('/api/reports/low-stock-alerts'),
        axios.get('/api/suppliers'),
        axios.get('/api/purchase-orders?status=pending'),
        axios.get('/api/sales-orders')
      ]);

      setStats({
        totalProducts: productsRes.data.length,
        lowStockItems: alertsRes.data.length,
        totalSuppliers: suppliersRes.data.length,
        pendingOrders: purchaseRes.data.filter(po => po.status === 'pending').length,
        totalSales: salesRes.data.length
      });

      setLowStockAlerts(alertsRes.data.slice(0, 5));
      setLoading(false);
    } catch (error) {
      toast.error('Error loading dashboard data');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Products</h3>
          <p className="stat-value">{stats.totalProducts}</p>
        </div>
        <div className="stat-card warning">
          <h3>Low Stock Items</h3>
          <p className="stat-value">{stats.lowStockItems}</p>
        </div>
        <div className="stat-card">
          <h3>Total Suppliers</h3>
          <p className="stat-value">{stats.totalSuppliers}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Orders</h3>
          <p className="stat-value">{stats.pendingOrders}</p>
        </div>
        <div className="stat-card">
          <h3>Total Sales</h3>
          <p className="stat-value">{stats.totalSales}</p>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h2>Low Stock Alerts</h2>
          {lowStockAlerts.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Supplier</th>
                </tr>
              </thead>
              <tbody>
                {lowStockAlerts.map(item => (
                  <tr key={item._id}>
                    <td>{item.sku}</td>
                    <td>{item.name}</td>
                    <td className="warning-text">{item.quantity}</td>
                    <td>{item.reorder_level}</td>
                    <td>{item.supplier_name || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No low stock alerts</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

