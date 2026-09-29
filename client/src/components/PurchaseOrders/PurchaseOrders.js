import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCounts } from '../../context/SidebarCountsContext';
import ActionMenu from '../Common/ActionMenu';
import ConfirmDialog from '../Common/ConfirmDialog';
import './PurchaseOrders.css';

const PurchaseOrders = () => {
  const { user } = useAuth();
  const { refreshCounts } = useSidebarCounts();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { orderId, status, title, message, danger }
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0 }]
  });

  const rawRole = (user?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const canManage = ['super_admin', 'superadmin', 'admin', 'inventory_manager', 'purchase_staff'].includes(rawRole);

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/purchase-orders');
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error('Error loading purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get('/api/suppliers');
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
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
    if (!formData.supplier_id) {
      toast.warning('Please select a supplier');
      return;
    }
    if (!formData.items.length || !formData.items[0].product_id) {
      toast.warning('Please add at least one product');
      return;
    }

    try {
      await axios.post('/api/purchase-orders', formData);
      toast.success('Purchase order created successfully');
      setShowModal(false);
      resetForm();
      fetchOrders();
      refreshCounts?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error creating purchase order');
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      setActionLoading(true);
      await axios.put(`/api/purchase-orders/${orderId}/status`, { status });
      toast.success(`Purchase order marked as ${status}`);
      setConfirmAction(null);
      fetchOrders();
      refreshCounts?.();
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder._id === orderId)) {
        fetchOrderDetails(orderId);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error updating order status');
    } finally {
      setActionLoading(false);
    }
  };

  const promptStatusUpdate = (orderId, status, orderNumber) => {
    if (status === 'received') {
      setConfirmAction({
        orderId,
        status: 'received',
        title: 'Receive Purchase Order?',
        message: `Marking PO "${orderNumber || orderId}" as Received will automatically update inventory stock for the included items.`,
        confirmLabel: 'Confirm Receipt',
        danger: false
      });
    } else if (status === 'cancelled') {
      setConfirmAction({
        orderId,
        status: 'cancelled',
        title: 'Cancel Purchase Order?',
        message: `Are you sure you want to cancel PO "${orderNumber || orderId}"? This action cannot be undone.`,
        confirmLabel: 'Cancel Order',
        danger: true
      });
    } else {
      handleStatusUpdate(orderId, status);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1, unit_price: 0 }]
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
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index][field] = parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }

    // Auto-fill unit price when product is selected
    if (field === 'product_id' && value) {
      const product = products.find(p => String(p._id || p.id) === String(value));
      if (product) {
        newItems[index].unit_price = product.cost !== undefined ? product.cost : (product.cost_price || product.price || 0);
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
    const map = {
      pending: { label: 'Pending', cls: 'status-pending' },
      draft: { label: 'Draft', cls: 'status-pending' },
      submitted: { label: 'Submitted', cls: 'status-pending' },
      approved: { label: 'Approved', cls: 'status-approved' },
      ordered: { label: 'Ordered', cls: 'status-pending' },
      partially_received: { label: 'Partially Received', cls: 'status-pending' },
      received: { label: 'Received', cls: 'status-approved' },
      closed: { label: 'Closed', cls: 'status-approved' },
      cancelled: { label: 'Cancelled', cls: 'status-disapproved' }
    };
    const s = map[status] || { label: status || 'Pending', cls: 'status-pending' };
    return <span className={`status-badge ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div className="purchase-orders">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Purchase Orders</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--gray-500)', fontSize: '13.5px' }}>
            Manage supplier replenishment orders, receiving logs, and stock inbounds
          </p>
        </div>
        {canManage && (
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setSelectedOrder(null);
              setShowModal(true);
            }}
          >
            <i className="ri-add-line" style={{ marginRight: 6 }} />
            Create Purchase Order
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading purchase orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: 'var(--radius-lg)' }}>
          <i className="ri-file-list-3-line" style={{ fontSize: '40px', color: 'var(--gray-400)', display: 'block', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--gray-800)' }}>No purchase orders found</h3>
          <p style={{ margin: '0 0 16px', color: 'var(--gray-500)', fontSize: '13.5px' }}>
            Create your first purchase order to restock inventory from suppliers.
          </p>
          {canManage && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
              Create Purchase Order
            </button>
          )}
        </div>
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
              <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const orderId = order.id || order._id;
              const canReceive = ['pending', 'ordered', 'submitted', 'approved', 'partially_received', 'processing'].includes(order.status);
              const canCancel = !['received', 'closed', 'cancelled'].includes(order.status);

              return (
                <tr key={orderId}>
                  <td style={{ fontWeight: 600 }}>{order.order_number}</td>
                  <td>{order.supplier_name || order.supplier_id?.name || 'N/A'}</td>
                  <td style={{ fontWeight: 600 }}>Rs. {Number(order.total_amount || 0).toLocaleString()}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>{order.created_by_name || order.created_by?.username || 'N/A'}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'center' }}>
                    <ActionMenu
                      actions={[
                        {
                          label: 'View Details',
                          icon: 'ri-eye-line',
                          onClick: () => {
                            fetchOrderDetails(orderId);
                            setShowModal(true);
                          }
                        },
                        ...(canManage && canReceive ? [{
                          label: 'Mark Received',
                          icon: 'ri-checkbox-circle-line',
                          success: true,
                          onClick: () => promptStatusUpdate(orderId, 'received', order.order_number)
                        }] : []),
                        ...(canManage && canCancel ? [{
                          label: 'Cancel Order',
                          icon: 'ri-close-circle-line',
                          danger: true,
                          onClick: () => promptStatusUpdate(orderId, 'cancelled', order.order_number)
                        }] : [])
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Details or Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setSelectedOrder(null); resetForm(); }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedOrder ? `Order: ${selectedOrder.order_number}` : 'Create Purchase Order'}</h2>

            {selectedOrder ? (
              <div className="order-details">
                <div className="order-info" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px', background: 'var(--gray-50)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div><strong>Order Number:</strong> <br />{selectedOrder.order_number}</div>
                  <div><strong>Supplier:</strong> <br />{selectedOrder.supplier_name || selectedOrder.supplier_id?.name || 'N/A'}</div>
                  <div><strong>Status:</strong> <br />{getStatusBadge(selectedOrder.status)}</div>
                  <div><strong>Total Amount:</strong> <br />Rs. {Number(selectedOrder.total_amount || 0).toLocaleString()}</div>
                  <div><strong>Created:</strong> <br />{new Date(selectedOrder.created_at).toLocaleString()}</div>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>Ordered Items</h3>
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
                        <td style={{ fontWeight: 600 }}>{item.product_name || item.product_id?.name || 'Item'}</td>
                        <td>{item.sku || item.product_id?.sku || 'N/A'}</td>
                        <td>{item.quantity}</td>
                        <td>Rs. {Number(item.unit_price || 0).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>Rs. {Number(item.total_price || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="modal-actions" style={{ marginTop: '24px' }}>
                  {canManage && ['pending', 'ordered', 'submitted', 'approved', 'partially_received'].includes(selectedOrder.status) && (
                    <button
                      className="btn-primary"
                      onClick={() => {
                        const oid = selectedOrder.id || selectedOrder._id;
                        promptStatusUpdate(oid, 'received', selectedOrder.order_number);
                      }}
                    >
                      <i className="ri-checkbox-circle-line" style={{ marginRight: 6 }} />
                      Mark as Received
                    </button>
                  )}
                  {canManage && !['received', 'closed', 'cancelled'].includes(selectedOrder.status) && (
                    <button
                      className="btn btn-outline"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => {
                        const oid = selectedOrder.id || selectedOrder._id;
                        promptStatusUpdate(oid, 'cancelled', selectedOrder.order_number);
                      }}
                    >
                      Cancel Order
                    </button>
                  )}
                  <button className="btn-secondary" onClick={() => { setShowModal(false); setSelectedOrder(null); }}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Supplier *</label>
                  <select
                    className="form-control"
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(sup => {
                      const sid = sup._id || sup.id;
                      return (
                        <option key={sid} value={sid}>
                          {sup.name} {sup.phone ? `(${sup.phone})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-section">
                  <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px' }}>Line Items</h3>
                    <button type="button" className="btn-secondary btn-sm" onClick={addItem}>
                      <i className="ri-add-line" style={{ marginRight: 4 }} />
                      Add Item
                    </button>
                  </div>

                  {formData.items.map((item, index) => (
                    <div key={index} className="item-row" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '12px' }}>
                      <div className="field" style={{ flex: 2 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>Product</label>
                        <select
                          className="form-control"
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                          required
                        >
                          <option value="">Select Product</option>
                          {products.map(prod => {
                            const pid = prod._id || prod.id;
                            return (
                              <option key={pid} value={pid}>
                                {prod.name} ({prod.sku || 'No SKU'}) — Stock: {prod.quantity ?? 0}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="field" style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>Quantity</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          required
                          min="1"
                        />
                      </div>

                      <div className="field" style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>Unit Price (Rs.)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          required
                          min="0"
                        />
                      </div>

                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          className="btn-delete"
                          style={{ height: '38px', padding: '0 12px' }}
                          onClick={() => removeItem(index)}
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Purchase Order
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Status Updates */}
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel || 'Confirm'}
        danger={confirmAction?.danger}
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction) {
            handleStatusUpdate(confirmAction.orderId, confirmAction.status);
          }
        }}
      />
    </div>
  );
};

export default PurchaseOrders;
