import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Reports.css';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('stock-levels');
  const [stockLevels, setStockLevels] = useState([]);
  const [salesTrends, setSalesTrends] = useState([]);
  const [inventoryTurnover, setInventoryTurnover] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [loading, setLoading] = useState(false);
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    fetchReportData();
  }, [activeTab, daysFilter]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'stock-levels':
          const stockRes = await axios.get('/api/reports/stock-levels');
          setStockLevels(stockRes.data);
          break;
        case 'sales-trends':
          const trendsRes = await axios.get(`/api/reports/sales-trends?days=${daysFilter}`);
          setSalesTrends(trendsRes.data);
          break;
        case 'inventory-turnover':
          const turnoverRes = await axios.get('/api/reports/inventory-turnover');
          setInventoryTurnover(turnoverRes.data);
          break;
        case 'low-stock':
          const alertsRes = await axios.get('/api/reports/low-stock-alerts');
          setLowStockAlerts(alertsRes.data);
          break;
        case 'top-selling':
          const topRes = await axios.get(`/api/reports/top-selling?days=${daysFilter}&limit=10`);
          setTopSelling(topRes.data);
          break;
        default:
          break;
      }
      setLoading(false);
    } catch (error) {
      toast.error('Error loading report data');
      setLoading(false);
    }
  };

  return (
    <div className="reports">
      <div className="page-header">
        <h1>Reports & Analytics</h1>
      </div>

      <div className="tabs">
        <button
          className={activeTab === 'stock-levels' ? 'active' : ''}
          onClick={() => setActiveTab('stock-levels')}
        >
          Stock Levels
        </button>
        <button
          className={activeTab === 'sales-trends' ? 'active' : ''}
          onClick={() => setActiveTab('sales-trends')}
        >
          Sales Trends
        </button>
        <button
          className={activeTab === 'inventory-turnover' ? 'active' : ''}
          onClick={() => setActiveTab('inventory-turnover')}
        >
          Inventory Turnover
        </button>
        <button
          className={activeTab === 'low-stock' ? 'active' : ''}
          onClick={() => setActiveTab('low-stock')}
        >
          Low Stock Alerts
        </button>
        <button
          className={activeTab === 'top-selling' ? 'active' : ''}
          onClick={() => setActiveTab('top-selling')}
        >
          Top Selling Products
        </button>
      </div>

      {(activeTab === 'sales-trends' || activeTab === 'top-selling') && (
        <div className="filter-controls">
          <label>Period: </label>
          <select value={daysFilter} onChange={(e) => setDaysFilter(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="report-content">
          {activeTab === 'stock-levels' && (
            <div className="report-section">
              <h2>Stock Levels Report</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Reorder Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLevels.map(product => (
                    <tr key={product.id} className={product.status === 'Low Stock' ? 'low-stock' : ''}>
                      <td>{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{product.quantity}</td>
                      <td>{product.reorder_level}</td>
                      <td>
                        <span className={`status-badge ${product.status === 'Low Stock' ? 'status-warning' : 'status-ok'}`}>
                          {product.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'sales-trends' && (
            <div className="report-section">
              <h2>Sales Trends</h2>
              {salesTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={salesTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total_revenue" stroke="#8884d8" name="Revenue (Rs.)" />
                    <Line type="monotone" dataKey="total_quantity" stroke="#82ca9d" name="Quantity Sold" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>No sales data available for the selected period</p>
              )}
            </div>
          )}

          {activeTab === 'inventory-turnover' && (
            <div className="report-section">
              <h2>Inventory Turnover Rates</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Current Stock</th>
                    <th>Total Sold</th>
                    <th>Turnover Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryTurnover.map(product => (
                    <tr key={product.id}>
                      <td>{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{product.quantity}</td>
                      <td>{product.total_sold}</td>
                      <td>{product.turnover_rate.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'low-stock' && (
            <div className="report-section">
              <h2>Low Stock Alerts</h2>
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
                  {lowStockAlerts.map(product => (
                    <tr key={product.id} className="low-stock">
                      <td>{product.sku}</td>
                      <td>{product.name}</td>
                      <td className="warning-text">{product.quantity}</td>
                      <td>{product.reorder_level}</td>
                      <td>{product.supplier_name || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'top-selling' && (
            <div className="report-section">
              <h2>Top Selling Products</h2>
              {topSelling.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topSelling}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total_sold" fill="#8884d8" name="Quantity Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                  <table className="data-table" style={{ marginTop: '20px' }}>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Total Sold</th>
                        <th>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSelling.map(product => (
                        <tr key={product.id}>
                          <td>{product.sku}</td>
                          <td>{product.name}</td>
                          <td>{product.total_sold}</td>
                          <td>Rs. {product.total_revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p>No sales data available for the selected period</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;

