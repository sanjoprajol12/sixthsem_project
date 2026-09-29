import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useSidebarCounts } from '../../context/SidebarCountsContext';
import ActionMenu from '../Common/ActionMenu';
import ConfirmDialog from '../Common/ConfirmDialog';
import './SalesOrders.css';

const fmtCurrency = (val) => `Rs. ${(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SalesOrders = () => {
  const { user } = useAuth();
  const { refreshCounts } = useSidebarCounts();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }],
    payment_method: 'cash',
    payment_status: 'paid',
    status: 'completed',
    discount_amount: 0,
    tax_rate: 13, // Standard 13% VAT default
    notes: ''
  });

  const rawRole = (user?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const canManage = ['super_admin', 'superadmin', 'admin', 'inventory_manager', 'sales_staff'].includes(rawRole);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/sales-orders');
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error('Error loading sales orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await axios.get('/api/customers');
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchProducts();
  }, [fetchOrders, fetchCustomers, fetchProducts]);

  const fetchOrderDetails = async (id) => {
    try {
      const res = await axios.get(`/api/sales-orders/${id}`);
      setSelectedOrder(res.data);
    } catch (error) {
      toast.error('Error loading order details');
    }
  };

  // Live Financial Calculations
  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    formData.items.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const discPercent = parseFloat(item.discount) || 0;
      const gross = qty * price;
      const lineDisc = (gross * discPercent) / 100;
      subtotal += Math.max(0, gross - lineDisc);
    });

    const extraDiscount = Math.min(subtotal, Math.max(0, parseFloat(formData.discount_amount) || 0));
    const taxable = Math.max(0, subtotal - extraDiscount);
    const taxRate = Math.max(0, parseFloat(formData.tax_rate) || 0);
    const taxAmount = (taxable * taxRate) / 100;
    const grandTotal = taxable + taxAmount;

    return {
      subtotal,
      extraDiscount,
      taxable,
      taxAmount,
      grandTotal
    };
  }, [formData.items, formData.discount_amount, formData.tax_rate]);

  const resetForm = () => {
    setIsWalkIn(true);
    setFormData({
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      items: [{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }],
      payment_method: 'cash',
      payment_status: 'paid',
      status: 'completed',
      discount_amount: 0,
      tax_rate: 13,
      notes: ''
    });
  };

  const handleCustomerSelect = (customerId) => {
    if (!customerId) {
      setIsWalkIn(true);
      setFormData(prev => ({
        ...prev,
        customer_id: '',
        customer_name: '',
        customer_phone: ''
      }));
      return;
    }

    const selectedCust = customers.find(c => String(c._id || c.id) === String(customerId));
    if (selectedCust) {
      setIsWalkIn(false);
      setFormData(prev => ({
        ...prev,
        customer_id: selectedCust._id || selectedCust.id,
        customer_name: selectedCust.name || '',
        customer_phone: selectedCust.phone || ''
      }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1, unit_price: 0, discount: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    const targetItem = { ...newItems[index] };

    if (field === 'quantity') {
      const q = Math.max(1, parseInt(value, 10) || 1);
      targetItem.quantity = q;
      // Check stock
      if (targetItem.product_id) {
        const prod = products.find(p => String(p._id || p.id) === String(targetItem.product_id));
        if (prod && prod.quantity < q) {
          toast.warning(`Only ${prod.quantity} units currently available for "${prod.name}"`);
        }
      }
    } else if (field === 'unit_price' || field === 'discount') {
      targetItem[field] = Math.max(0, parseFloat(value) || 0);
    } else if (field === 'product_id') {
      targetItem.product_id = value;
      const prod = products.find(p => String(p._id || p.id) === String(value));
      if (prod) {
        targetItem.unit_price = prod.price || 0;
        if (prod.quantity < targetItem.quantity) {
          toast.warning(`Warning: "${prod.name}" stock is ${prod.quantity}`);
        }
      }
    } else {
      targetItem[field] = value;
    }

    newItems[index] = targetItem;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const validItems = formData.items.filter(it => it.product_id);
    if (validItems.length === 0) {
      toast.error('Please add at least one valid product to the order');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        items: validItems,
        customer_name: formData.customer_name || 'Walk-in Customer'
      };

      await axios.post('/api/sales-orders', payload);
      toast.success('Sales order created successfully');
      setShowModal(false);
      resetForm();
      fetchOrders();
      refreshCounts?.();
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Error creating sales order';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setActionLoading(true);
      await axios.put(`/api/sales-orders/${orderId}/status`, { status: newStatus });
      toast.success(`Sales order marked as ${newStatus}`);
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
    if (status === 'cancelled') {
      setConfirmAction({
        orderId,
        status: 'cancelled',
        title: 'Cancel Sales Order?',
        message: `Are you sure you want to cancel order "${orderNumber}"? Stock deductions associated with this order will be reversed back to inventory.`,
        confirmLabel: 'Cancel Order',
        danger: true
      });
    } else if (status === 'completed' || status === 'fulfilled') {
      setConfirmAction({
        orderId,
        status,
        title: `Mark Order as ${status === 'completed' ? 'Completed' : 'Fulfilled'}?`,
        message: `Confirm that all line items for order "${orderNumber}" have been handed over to the customer.`,
        confirmLabel: 'Confirm',
        danger: false
      });
    } else {
      handleStatusUpdate(orderId, status);
    }
  };

  const getStatusBadge = (status) => {
    const statusClass = {
      completed: 'status-approved',
      fulfilled: 'status-approved',
      confirmed: 'status-pending',
      pending: 'status-pending',
      cancelled: 'status-disapproved'
    };
    return (
      <span className={`status-badge ${statusClass[status] || 'status-pending'}`}>
        <i className={status === 'completed' || status === 'fulfilled' ? 'ri-checkbox-circle-line' : status === 'cancelled' ? 'ri-close-circle-line' : 'ri-time-line'} />
        {status}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus) => {
    if (paymentStatus === 'paid') {
      return <span className="badge badge-success">Paid</span>;
    }
    if (paymentStatus === 'partially_paid') {
      return <span className="badge badge-warning">Partial</span>;
    }
    return <span className="badge badge-neutral">Unpaid</span>;
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const numMatch = (o.order_number || '').toLowerCase().includes(q);
        const custMatch = (o.customer_name || '').toLowerCase().includes(q);
        if (!numMatch && !custMatch) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  // Quick stats
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const completedCount = orders.filter(o => o.status === 'completed' || o.status === 'fulfilled').length;
    const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    return { totalCount, completedCount, pendingCount, totalRevenue };
  }, [orders]);

  return (
    <div className="sales-orders">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Sales Orders</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--gray-500)', fontSize: '13.5px' }}>
            Process customer sales, generate invoices, and manage order fulfillment
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
            New Sales Order
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="so-stats-row">
        <div className="so-stat-card">
          <div className="so-stat-icon primary">
            <i className="ri-shopping-cart-2-line" />
          </div>
          <div>
            <div className="so-stat-value">{stats.totalCount}</div>
            <div className="so-stat-label">Total Orders</div>
          </div>
        </div>
        <div className="so-stat-card">
          <div className="so-stat-icon success">
            <i className="ri-checkbox-circle-line" />
          </div>
          <div>
            <div className="so-stat-value">{stats.completedCount}</div>
            <div className="so-stat-label">Completed Orders</div>
          </div>
        </div>
        <div className="so-stat-card">
          <div className="so-stat-icon warning">
            <i className="ri-time-line" />
          </div>
          <div>
            <div className="so-stat-value">{stats.pendingCount}</div>
            <div className="so-stat-label">Pending / Processing</div>
          </div>
        </div>
        <div className="so-stat-card">
          <div className="so-stat-icon success">
            <i className="ri-money-dollar-circle-line" />
          </div>
          <div>
            <div className="so-stat-value">{fmtCurrency(stats.totalRevenue)}</div>
            <div className="so-stat-label">Total Net Sales</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="so-filters-bar">
        <div className="so-search-box">
          <i className="ri-search-line" />
          <input
            type="text"
            placeholder="Search by Order # or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '160px', padding: '7px 12px', fontSize: '13px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {(search || statusFilter !== 'all') && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Orders Table */}
      {loading ? (
        <div className="loading">Loading sales orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: 'var(--radius-lg)' }}>
          <i className="ri-shopping-bag-line" style={{ fontSize: '40px', color: 'var(--gray-400)', display: 'block', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--gray-800)' }}>No sales orders match your criteria</h3>
          <p style={{ margin: '0 0 16px', color: 'var(--gray-500)', fontSize: '13.5px' }}>
            Create a new sales order or clear the applied filters.
          </p>
          {canManage && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
              New Sales Order
            </button>
          )}
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Date</th>
              <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => {
              const orderId = order.id || order._id;
              const isPending = order.status === 'pending' || order.status === 'confirmed';
              const canCancel = order.status !== 'cancelled';

              return (
                <tr key={orderId}>
                  <td style={{ fontWeight: 600 }}>{order.order_number}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{order.customer_name || 'Walk-in Customer'}</div>
                    {order.customer_phone && (
                      <span style={{ fontSize: '11.5px', color: 'var(--gray-500)' }}>{order.customer_phone}</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {fmtCurrency(order.total_amount)}
                  </td>
                  <td>{getPaymentBadge(order.payment_status || 'paid')}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>{order.created_by_name || order.created_by?.username || 'Staff'}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'center' }}>
                    <ActionMenu
                      actions={[
                        {
                          label: 'View Order Details',
                          icon: 'ri-eye-line',
                          onClick: () => {
                            fetchOrderDetails(orderId);
                            setShowModal(true);
                          }
                        },
                        ...(canManage && isPending ? [{
                          label: 'Mark Completed',
                          icon: 'ri-checkbox-circle-line',
                          success: true,
                          onClick: () => promptStatusUpdate(orderId, 'completed', order.order_number)
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

      {/* Modal: Create Order or View Details */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setSelectedOrder(null); resetForm(); }}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: selectedOrder ? '760px' : '980px' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ margin: 0 }}>
                  {selectedOrder ? `Invoice / Order: ${selectedOrder.order_number}` : 'New Sales Order'}
                </h2>
                <div className="modal-subtitle">
                  {selectedOrder ? `Generated on ${new Date(selectedOrder.created_at).toLocaleString()}` : 'Record customer sale and decrement live warehouse stock'}
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => { setShowModal(false); setSelectedOrder(null); resetForm(); }}
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
              {selectedOrder ? (
                /* ORDER DETAILS VIEW */
                <div>
                  <div className="so-details-grid">
                    <div>
                      <div className="so-meta-label">Customer</div>
                      <div className="so-meta-val">{selectedOrder.customer_name || 'Walk-in Customer'}</div>
                      {selectedOrder.customer_phone && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{selectedOrder.customer_phone}</div>
                      )}
                    </div>
                    <div>
                      <div className="so-meta-label">Order Status</div>
                      <div style={{ marginTop: 2 }}>{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                    <div>
                      <div className="so-meta-label">Payment</div>
                      <div style={{ marginTop: 2 }}>
                        {getPaymentBadge(selectedOrder.payment_status || 'paid')}
                        <span style={{ marginLeft: 6, fontSize: '12px', textTransform: 'capitalize', color: 'var(--gray-600)' }}>
                          ({selectedOrder.payment_method || 'cash'})
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="so-meta-label">Sales Rep</div>
                      <div className="so-meta-val">{selectedOrder.created_by_name || selectedOrder.created_by?.username || 'Staff'}</div>
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600 }}>Line Items</h4>
                  <table className="data-table" style={{ marginBottom: '16px' }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>SKU</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Discount</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item, idx) => (
                        <tr key={item._id || idx}>
                          <td style={{ fontWeight: 600 }}>{item.product_name || 'Product'}</td>
                          <td>{item.sku || 'N/A'}</td>
                          <td>{item.quantity}</td>
                          <td>{fmtCurrency(item.unit_price)}</td>
                          <td>{item.discount ? `${item.discount}%` : '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {fmtCurrency(item.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '280px', background: 'var(--gray-50)', padding: '14px 18px', borderRadius: 'var(--radius-md)' }}>
                      <table className="so-summary-table">
                        <tbody>
                          <tr>
                            <td>Subtotal</td>
                            <td className="val">{fmtCurrency(selectedOrder.subtotal || selectedOrder.total_amount)}</td>
                          </tr>
                          {selectedOrder.discount_amount > 0 && (
                            <tr>
                              <td>Discount</td>
                              <td className="val" style={{ color: 'var(--danger)' }}>-{fmtCurrency(selectedOrder.discount_amount)}</td>
                            </tr>
                          )}
                          {selectedOrder.tax_amount > 0 && (
                            <tr>
                              <td>Tax ({selectedOrder.tax_rate}%)</td>
                              <td className="val">+{fmtCurrency(selectedOrder.tax_amount)}</td>
                            </tr>
                          )}
                          <tr className="total-row">
                            <td>Grand Total</td>
                            <td className="val">{fmtCurrency(selectedOrder.total_amount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selectedOrder.notes && (
                    <div style={{ marginTop: '16px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                      <strong>Notes:</strong> {selectedOrder.notes}
                    </div>
                  )}
                </div>
              ) : (
                /* CREATE SALES ORDER FORM */
                <form id="sales-order-form" onSubmit={handleSubmit}>
                  <div className="so-form-grid">
                    {/* Main Section */}
                    <div className="so-form-main">
                      {/* Customer Selector */}
                      <div className="card" style={{ padding: '16px', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Customer Details</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${isWalkIn ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => {
                                setIsWalkIn(true);
                                setFormData(p => ({ ...p, customer_id: '', customer_name: '', customer_phone: '' }));
                              }}
                            >
                              Walk-in
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${!isWalkIn ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => setIsWalkIn(false)}
                            >
                              Registered Customer
                            </button>
                          </div>
                        </div>

                        {isWalkIn ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Walk-in Customer Name (Optional)"
                                value={formData.customer_name}
                                onChange={(e) => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Contact Phone (Optional)"
                                value={formData.customer_phone}
                                onChange={(e) => setFormData(p => ({ ...p, customer_phone: e.target.value }))}
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <select
                              className="form-control"
                              value={formData.customer_id}
                              onChange={(e) => handleCustomerSelect(e.target.value)}
                              required
                            >
                              <option value="">Select Existing Customer</option>
                              {customers.map(c => {
                                const cid = c._id || c.id;
                                return (
                                  <option key={cid} value={cid}>
                                    {c.name} {c.phone ? `(${c.phone})` : ''} - {c.customer_type || 'Retail'}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Items Table */}
                      <div className="card" style={{ padding: '16px', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Order Line Items</label>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                            <i className="ri-add-line" style={{ marginRight: 4 }} />
                            Add Item
                          </button>
                        </div>

                        <div className="so-items-container">
                          {formData.items.map((item, index) => {
                            const lineTotal = Math.max(0, (item.quantity * item.unit_price) * (1 - (item.discount || 0) / 100));

                            return (
                              <div key={index} className="so-item-row">
                                {/* Product Select */}
                                <div>
                                  <select
                                    className="form-control"
                                    value={item.product_id}
                                    onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                                    required
                                  >
                                    <option value="">Select Product...</option>
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

                                {/* Qty */}
                                <div>
                                  <input
                                    type="number"
                                    className="form-control"
                                    placeholder="Qty"
                                    title="Quantity"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                    min="1"
                                    required
                                  />
                                </div>

                                {/* Unit Price */}
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    placeholder="Price"
                                    title="Unit Price (NPR)"
                                    value={item.unit_price}
                                    onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                    min="0"
                                    required
                                  />
                                </div>

                                {/* Disc % */}
                                <div>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="form-control"
                                    placeholder="Disc %"
                                    title="Discount %"
                                    value={item.discount}
                                    onChange={(e) => updateItem(index, 'discount', e.target.value)}
                                    min="0"
                                    max="100"
                                  />
                                </div>

                                {/* Line Total */}
                                <div className="so-item-line-total">
                                  {fmtCurrency(lineTotal)}
                                </div>

                                {/* Delete button */}
                                <div>
                                  {formData.items.length > 1 && (
                                    <button
                                      type="button"
                                      className="btn-delete"
                                      style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      onClick={() => removeItem(index)}
                                    >
                                      <i className="ri-delete-bin-line" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Order Notes / Memo</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          placeholder="Special delivery instructions or order remarks..."
                          value={formData.notes}
                          onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Sidebar Calculation & Payment */}
                    <div className="so-form-side">
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Order Financials</h4>

                      <table className="so-summary-table">
                        <tbody>
                          <tr>
                            <td>Items Subtotal</td>
                            <td className="val">{fmtCurrency(calculatedTotals.subtotal)}</td>
                          </tr>
                          <tr>
                            <td>
                              <label style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>Order Discount (Rs.)</label>
                              <input
                                type="number"
                                className="form-control"
                                style={{ width: '100%', padding: '4px 8px', fontSize: '12.5px' }}
                                value={formData.discount_amount}
                                onChange={(e) => setFormData(p => ({ ...p, discount_amount: e.target.value }))}
                                min="0"
                              />
                            </td>
                            <td className="val" style={{ verticalAlign: 'bottom', color: 'var(--danger)' }}>
                              -{fmtCurrency(calculatedTotals.extraDiscount)}
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <label style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>Tax Rate (%)</label>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <select
                                  className="form-control"
                                  style={{ padding: '4px 8px', fontSize: '12.5px' }}
                                  value={formData.tax_rate}
                                  onChange={(e) => setFormData(p => ({ ...p, tax_rate: e.target.value }))}
                                >
                                  <option value="0">0% (Tax Exempt)</option>
                                  <option value="13">13% (Standard VAT)</option>
                                  <option value="5">5% (Reduced)</option>
                                </select>
                              </div>
                            </td>
                            <td className="val" style={{ verticalAlign: 'bottom' }}>
                              +{fmtCurrency(calculatedTotals.taxAmount)}
                            </td>
                          </tr>
                          <tr className="total-row">
                            <td>Grand Total</td>
                            <td className="val">{fmtCurrency(calculatedTotals.grandTotal)}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '14px' }}>
                        <div className="form-group" style={{ marginBottom: '10px' }}>
                          <label className="form-label" style={{ fontSize: '12.5px' }}>Payment Method</label>
                          <select
                            className="form-control"
                            value={formData.payment_method}
                            onChange={(e) => setFormData(p => ({ ...p, payment_method: e.target.value }))}
                          >
                            <option value="cash">Cash</option>
                            <option value="credit_card">Card / POS</option>
                            <option value="bank_transfer">Bank Transfer / QR</option>
                            <option value="cheque">Cheque</option>
                            <option value="credit">On Account / Credit</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '10px' }}>
                          <label className="form-label" style={{ fontSize: '12.5px' }}>Payment Status</label>
                          <select
                            className="form-control"
                            value={formData.payment_status}
                            onChange={(e) => setFormData(p => ({ ...p, payment_status: e.target.value }))}
                          >
                            <option value="paid">Paid in Full</option>
                            <option value="partially_paid">Partially Paid</option>
                            <option value="unpaid">Unpaid</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '12.5px' }}>Fulfillment Status</label>
                          <select
                            className="form-control"
                            value={formData.status}
                            onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                          >
                            <option value="completed">Completed (Immediate Delivery)</option>
                            <option value="confirmed">Confirmed (Pending Dispatch)</option>
                            <option value="pending">Draft / Pending</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="modal-footer">
              {selectedOrder ? (
                <>
                  {canManage && (selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed') && (
                    <button
                      className="btn-primary"
                      onClick={() => {
                        const oid = selectedOrder.id || selectedOrder._id;
                        promptStatusUpdate(oid, 'completed', selectedOrder.order_number);
                      }}
                    >
                      <i className="ri-checkbox-circle-line" style={{ marginRight: 6 }} />
                      Mark Completed
                    </button>
                  )}
                  {canManage && selectedOrder.status !== 'cancelled' && (
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
                  <button className="btn btn-secondary" onClick={() => { setShowModal(false); setSelectedOrder(null); }}>
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="sales-order-form"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Generating Invoice...' : `Confirm & Place Order (${fmtCurrency(calculatedTotals.grandTotal)})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Status Updates / Cancellations */}
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

export default SalesOrders;
