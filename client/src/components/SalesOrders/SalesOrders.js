import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './SalesOrders.css';

const SalesOrders = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }]
  });

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/sales-orders');
      setOrders(res.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error loading sales orders');
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
    } catch (error) {
      // Handle error
    }
  };

  const fetchOrderDetails = async (id) => {
    try {
      const res = await axios.get(`/api/sales-orders/${id}`);
      setSelectedOrder(res.data);
    } catch (error) {
      toast.error('Error loading order details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/sales-orders', formData);
      toast.success('Sales order created successfully');
      setShowModal(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error creating sales order');
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await axios.put(`/api/sales-orders/${orderId}/status`, { status });
      toast.success('Order status updated successfully');
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        fetchOrderDetails(orderId);
      }
    } catch (error) {
      toast.error('Error updating order status');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1, unit_price: 0, discount: 0 }]
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    if (field === 'quantity' || field === 'unit_price' || field === 'discount') {
      newItems[index][field] = parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    
    // Auto-fill unit price when product is selected
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        newItems[index].unit_price = product.price;
        // Check stock availability
        if (product.quantity < newItems[index].quantity) {
          toast.warning(`Only ${product.quantity} units available for ${product.name}`);
        }
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      items: [{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }]
    });
  };

  const getStatusBadge = (status) => {
    const statusClass = {
      pending: 'status-pending',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return <span className={`status-badge ${statusClass[status] || ''}`}>{status}</span>;
  };

  return (
    <div className="sales-orders">
      <div className="page-header">
        <h1>Sales Orders</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          Create Sales Order
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Customer</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.order_number}</td>
                <td>{order.customer_name || 'Walk-in'}</td>
                <td>Rs. {order.total_amount.toFixed(2)}</td>
                <td>{getStatusBadge(order.status)}</td>
                <td>{order.created_by_name || 'N/A'}</td>
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-edit" onClick={() => { fetchOrderDetails(order.id); setShowModal(true); }}>
                    View
                  </button>
                  {order.status === 'pending' && (
                    <button className="btn-primary" onClick={() => handleStatusUpdate(order.id, 'completed')}>
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setSelectedOrder(null); resetForm(); }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedOrder ? 'Order Details' : 'Create Sales Order'}</h2>
            
            {selectedOrder ? (
              <div className="order-details">
                <div className="order-info">
                  <p><strong>Order Number:</strong> {selectedOrder.order_number}</p>
                  <p><strong>Customer:</strong> {selectedOrder.customer_name || 'Walk-in'}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
                  <p><strong>Total Amount:</strong> Rs. {selectedOrder.total_amount.toFixed(2)}</p>
                  <p><strong>Created:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, index) => (
                      <tr key={item._id || index}>
                        <td>{item.product_name}</td>
                        <td>{item.sku}</td>
                        <td>{item.quantity}</td>
                        <td>Rs. {item.unit_price.toFixed(2)}</td>
                        <td>Rs. {item.total_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedOrder.status === 'pending' && (
                  <div className="modal-actions">
                    <button className="btn-primary" onClick={() => handleStatusUpdate(selectedOrder.id, 'completed')}>
                      Mark as Completed
                    </button>
                    <button className="btn-secondary" onClick={() => { setShowModal(false); setSelectedOrder(null); }}>
                      Close
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Leave empty for walk-in customer"
                  />
                </div>

                <div className="form-section">
                  <div className="section-header">
                    <h3>Items</h3>
                    <button type="button" className="btn-secondary" onClick={addItem}>Add Item</button>
                  </div>
                  {formData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map(prod => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} ({prod.sku}) - Stock: {prod.quantity}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        required
                        min="1"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Unit Price"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        required
                        min="0"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Discount %"
                        value={item.discount}
                        onChange={(e) => updateItem(index, 'discount', e.target.value)}
                        min="0"
                        max="100"
                      />
                      <button type="button" className="btn-delete" onClick={() => removeItem(index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-primary">Create Order</button>
                  <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrders;

