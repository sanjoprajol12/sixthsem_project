import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './PurchaseOrders.css';

const PurchaseOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0 }]
  });

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/purchase-orders');
      setOrders(res.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error loading purchase orders');
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get('/api/suppliers');
      setSuppliers(res.data);
    } catch (error) {
      // Handle error
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
      const res = await axios.get(`/api/purchase-orders/${id}`);
      setSelectedOrder(res.data);
    } catch (error) {
      toast.error('Error loading order details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/purchase-orders', formData);
      toast.success('Purchase order created successfully');
      setShowModal(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error creating purchase order');
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await axios.put(`/api/purchase-orders/${orderId}/status`, { status });
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
        newItems[index].unit_price = product.cost;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      items: [{ product_id: '', quantity: 1, unit_price: 0 }]
    });
  };

  const getStatusBadge = (status) => {
    const statusClass = {
      pending: 'status-pending',
      received: 'status-received',
      cancelled: 'status-cancelled'
    };
    return <span className={`status-badge ${statusClass[status] || ''}`}>{status}</span>;
  };

  return (
    <div className="purchase-orders">
      <div className="page-header">
        <h1>Purchase Orders</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          Create Purchase Order
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Supplier</th>
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
                <td>{order.supplier_name || 'N/A'}</td>
                <td>Rs. {order.total_amount.toFixed(2)}</td>
                <td>{getStatusBadge(order.status)}</td>
                <td>{order.created_by_name || 'N/A'}</td>
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-edit" onClick={() => { fetchOrderDetails(order.id); setShowModal(true); }}>
                    View
                  </button>
                  {order.status === 'pending' && (
                    <button className="btn-primary" onClick={() => handleStatusUpdate(order.id, 'received')}>
                      Mark Received
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
            <h2>{selectedOrder ? 'Order Details' : 'Create Purchase Order'}</h2>
            
            {selectedOrder ? (
              <div className="order-details">
                <div className="order-info">
                  <p><strong>Order Number:</strong> {selectedOrder.order_number}</p>
                  <p><strong>Supplier:</strong> {selectedOrder.supplier_name}</p>
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
                    <button className="btn-primary" onClick={() => handleStatusUpdate(selectedOrder.id, 'received')}>
                      Mark as Received
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
                  <label>Supplier *</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <div className="section-header">
                    <h3>Items</h3>
                    <button type="button" className="btn-secondary" onClick={addItem}>Add Item</button>
                  </div>
                  {formData.items.map((item, index) => (
  <div key={index} className="item-row">

    <div className="field">
      <label>Product</label>
      <select
        value={item.product_id}
        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
        required
      >
        <option value="">Select Product</option>
        {products.map(prod => (
          <option key={prod.id} value={prod.id}>
            {prod.name} ({prod.sku})
          </option>
        ))}
      </select>
    </div>

    <div className="field">
      <label>Quantity</label>
      <input
        type="number"
        placeholder="Enter quantity"
        value={item.quantity}
        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
        required
        min="1"
      />
    </div>

    <div className="field">
      <label>Unit Price</label>
      <input
        type="number"
        step="0.01"
        placeholder="Enter price"
        value={item.unit_price}
        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
        required
        min="0"
      />
    </div>

    <button
      type="button"
      className="btn-delete"
      onClick={() => removeItem(index)}
    >
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

export default PurchaseOrders;

