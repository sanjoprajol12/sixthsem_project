import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Algorithms.css';

const Algorithms = () => {
  const [activeTab, setActiveTab] = useState('auto-reorder');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [algorithmResults, setAlgorithmResults] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'demand-forecast' && selectedProduct) {
      fetchDemandForecast();
    } else if (activeTab === 'inventory-optimization') {
      fetchInventoryOptimization();
    } else {
      setAlgorithmResults(null);
    }
  }, [activeTab, selectedProduct]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
    } catch (error) {
      toast.error('Error loading products');
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get('/api/algorithms/summary');
      setSummary(res.data);
    } catch (error) {
      // Handle error silently
    }
  };

  const handleAutoReorder = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/algorithms/auto-reorder');
      toast.success(res.data.message);
      setAlgorithmResults(res.data);
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error generating auto reorder');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryOptimization = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/algorithms/inventory-optimization?days=60');
      setOptimizationResults(res.data);
    } catch (error) {
      toast.error('Error fetching inventory optimization insights');
    } finally {
      setLoading(false);
    }
  };

  const fetchDemandForecast = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/algorithms/demand-forecast/${selectedProduct}?days=30`);
      setAlgorithmResults(res.data);
    } catch (error) {
      toast.error('Error fetching demand forecast');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="algorithms">
      <div className="page-header">
        <h1>Advanced Algorithms</h1>
      </div>

      {summary && (
        <div className="algorithm-summary">
          {summary.auto_reorder && (
            <div className="summary-card">
              <h3>Auto Reorder</h3>
              <p>Products needing reorder: <strong>{summary.auto_reorder.products_needing_reorder || 0}</strong></p>
              <p>Pending auto orders: <strong>{summary.auto_reorder.pending_auto_orders || 0}</strong></p>
            </div>
          )}
          {summary.demand_forecast && (
            <div className="summary-card">
              <h3>Demand Forecast</h3>
              <p>Available for all products with sales history</p>
            </div>
          )}
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'auto-reorder' ? 'active' : ''}
          onClick={() => setActiveTab('auto-reorder')}
        >
          Automated Reordering
        </button>
        <button
          className={activeTab === 'demand-forecast' ? 'active' : ''}
          onClick={() => setActiveTab('demand-forecast')}
        >
          Demand Forecasting
        </button>
        <button
          className={activeTab === 'inventory-optimization' ? 'active' : ''}
          onClick={() => setActiveTab('inventory-optimization')}
        >
          Inventory Optimization
        </button>
      </div>

      <div className="algorithm-content">
        {activeTab === 'auto-reorder' && (
          <div className="algorithm-section">
            <h2>Automated Reordering Algorithm</h2>
            <p>This algorithm automatically generates purchase orders when stock levels fall below predefined thresholds.</p>
            <button className="btn-primary" onClick={handleAutoReorder} disabled={loading}>
              {loading ? 'Processing...' : 'Generate Auto Reorder'}
            </button>

            {algorithmResults && (
              <div className="results">
                <h3>Results</h3>
                <p>{algorithmResults.message || 'No results available'}</p>
                {algorithmResults.orders && algorithmResults.orders.length > 0 && (
                  <div>
                    <h4>Created Purchase Orders</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Order Number</th>
                          <th>Supplier ID</th>
                          <th>Items Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {algorithmResults.orders.map(order => (
                          <tr key={order.id || order.order_number}>
                            <td>{order.order_number || 'N/A'}</td>
                            <td>{order.supplier_id || 'N/A'}</td>
                            <td>{order.items?.length || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {algorithmResults.skipped && algorithmResults.skipped.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ color: '#ff9800' }}>⚠️ Skipped Products (No Supplier Assigned)</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Product Name</th>
                          <th>Current Stock</th>
                          <th>Reorder Level</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {algorithmResults.skipped.map(product => (
                          <tr key={product.product_id}>
                            <td>{product.sku}</td>
                            <td>{product.name}</td>
                            <td>{product.quantity}</td>
                            <td>{product.reorder_level}</td>
                            <td>{product.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p style={{ marginTop: '10px', color: '#666' }}>
                      Please assign suppliers to these products in the Products page to enable automatic reordering.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'demand-forecast' && (
          <div className="algorithm-section">
            <h2>Demand Forecasting Algorithm</h2>
            <p>Forecast future inventory needs based on historical sales data and seasonal trends.</p>
            <div className="form-group">
              <label>Select Product:</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">Select a product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            {loading && <div className="loading">Calculating forecast...</div>}

            {algorithmResults && (
              <div className="results">
                <h3>Forecast Results</h3>
                {algorithmResults.forecast?.method === 'insufficient_data' ? (
                  <div className="forecast-data">
                    <p>Insufficient sales data available for forecasting. This product needs sales history to generate forecasts.</p>
                    <p>Forecast for next 30/60/90 days: 0 units</p>
                  </div>
                ) : (
                  <div className="forecast-data">
                    {algorithmResults.historical_data && (
                      <div className="forecast-item">
                        <strong>Historical Data:</strong>
                        <p>Total Sales: {algorithmResults.historical_data.total_sales || 0}</p>
                        <p>Days Analyzed: {algorithmResults.historical_data.days_analyzed || 0}</p>
                        <p>Average Daily Sales: {algorithmResults.historical_data.average_daily_sales || 0}</p>
                      </div>
                    )}
                    {algorithmResults.forecast && (
                      <div className="forecast-item">
                        <strong>Forecast:</strong>
                        <p>Next 30 days: {algorithmResults.forecast.next_30_days || 0} units</p>
                        <p>Next 60 days: {algorithmResults.forecast.next_60_days || 0} units</p>
                        <p>Next 90 days: {algorithmResults.forecast.next_90_days || 0} units</p>
                        <p>Method: {algorithmResults.forecast.method || 'N/A'}</p>
                      </div>
                    )}
                    {algorithmResults.recommendation && (
                      <div className="forecast-item">
                        <strong>Recommendation:</strong>
                        <p>Current Stock: {algorithmResults.recommendation.current_stock || 0}</p>
                        <p>Recommended Order: {algorithmResults.recommendation.recommended_order_quantity || 0} units</p>
                        <p>Reorder Urgent: {algorithmResults.recommendation.reorder_urgent ? 'Yes' : 'No'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory-optimization' && (
          <div className="algorithm-section">
            <h2>Inventory Optimization Algorithm</h2>
            <p>
              Analyze sales and stock levels to identify slow-moving, overstocked, and
              understocked products, with suggested reorder levels.
            </p>

            {loading && <div className="loading">Analyzing inventory...</div>}

            {optimizationResults && (
              <div className="results">
                <h3>Summary</h3>
                <p>
                  Products analyzed:{' '}
                  <strong>{optimizationResults.summary?.products_analyzed || 0}</strong> | Slow
                  moving:{' '}
                  <strong>{optimizationResults.summary?.slow_moving_products || 0}</strong> |
                  Overstocked:{' '}
                  <strong>{optimizationResults.summary?.overstocked_products || 0}</strong> |
                  Understocked:{' '}
                  <strong>{optimizationResults.summary?.understocked_products || 0}</strong>
                </p>

                <h3 style={{ marginTop: '20px' }}>Recommendations</h3>
                {optimizationResults.recommendations &&
                optimizationResults.recommendations.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>Current Stock</th>
                        <th>Reorder Level</th>
                        <th>Suggested Reorder</th>
                        <th>Avg Daily Sales</th>
                        <th>Days of Cover</th>
                        <th>Demand</th>
                        <th>Stock Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optimizationResults.recommendations.map((item) => (
                        <tr key={item.product_id}>
                          <td>{item.sku}</td>
                          <td>{item.name}</td>
                          <td>{item.current_stock}</td>
                          <td>{item.reorder_level}</td>
                          <td>{item.suggested_reorder_level}</td>
                          <td>{item.avg_daily_sales}</td>
                          <td>{item.days_of_cover ?? '-'}</td>
                          <td>{item.demand_classification}</td>
                          <td>{item.stock_classification}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No recommendations available.</p>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Algorithms;

