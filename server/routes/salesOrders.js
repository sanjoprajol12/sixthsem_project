const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { SalesOrder, Product, Customer, User } = require('../models');
const { authenticateToken, canManageSales, requireAdmin } = require('../middleware/auth');
const InventoryService = require('../services/inventoryService');
const AuditService = require('../services/auditService');

const router = express.Router();

// Get all sales orders with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, customer, paymentStatus, search } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.payment_status = paymentStatus;
    }

    if (customer) {
      query.$or = [
        { customer_name: { $regex: customer, $options: 'i' } },
        { customer_id: mongoose.Types.ObjectId.isValid(customer) ? customer : null }
      ];
    }

    if (search) {
      query.$or = [
        { order_number: { $regex: search, $options: 'i' } },
        { invoice_number: { $regex: search, $options: 'i' } },
        { customer_name: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await SalesOrder.find(query)
      .populate('customer_id', 'name email phone customer_type')
      .populate('created_by', 'username role')
      .populate('items.product_id', 'name sku price cost unit_of_measure')
      .sort({ created_at: -1 });

    const formattedOrders = orders.map((order) => {
      const orderObj = order.toObject();
      return {
        ...orderObj,
        id: orderObj._id,
        created_by_name: order.created_by?.username || 'Staff',
        customer_name: order.customer_id?.name || order.customer_name || 'Walk-in Customer'
      };
    });

    res.json(formattedOrders);
  } catch (error) {
    console.error('Get sales orders error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get sales order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid sales order ID format' });
    }

    const order = await SalesOrder.findById(req.params.id)
      .populate('customer_id')
      .populate('created_by', 'username role email')
      .populate('items.product_id', 'name sku price cost unit_of_measure barcode');

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    const formattedOrder = {
      ...order.toObject(),
      id: order._id,
      created_by_name: order.created_by?.username || 'Staff',
      items: order.items.map((item) => ({
        ...item.toObject(),
        product_name: item.product_id?.name || 'Unknown Item',
        sku: item.product_id?.sku || 'N/A',
        unit_of_measure: item.product_id?.unit_of_measure || 'pcs',
        barcode: item.product_id?.barcode || '',
        product_id: item.product_id?._id || item.product_id
      }))
    };

    res.json(formattedOrder);
  } catch (error) {
    console.error('Get sales order error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create sales order (Draft, Confirmed, or Completed with immediate inventory deduction)
router.post(
  '/',
  authenticateToken,
  canManageSales,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        customer_id,
        customer_name,
        customer_phone,
        items,
        payment_method = 'cash',
        payment_status = 'paid',
        status = 'completed',
        discount_amount = 0,
        tax_rate = 0,
        notes
      } = req.body;

      const orderNumber = `SO-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Verify stock availability for all items before creating the record
      for (const item of items) {
        const product = await Product.findById(item.product_id);
        if (!product) {
          return res.status(400).json({ error: `Product ID ${item.product_id} not found` });
        }
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.quantity}, Requested: ${item.quantity}`
          });
        }
      }

      // 2. Prepare line items and calculate totals
      let calculatedSubtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product_id);
        const qty = parseInt(item.quantity, 10);
        const unitPrice = parseFloat(item.unit_price !== undefined ? item.unit_price : product.price);
        const itemDiscount = parseFloat(item.discount || 0);

        const gross = qty * unitPrice;
        const discountVal = (gross * itemDiscount) / 100;
        const lineTotal = gross - discountVal;
        calculatedSubtotal += lineTotal;

        orderItems.push({
          product_id: product._id,
          quantity: qty,
          returned_quantity: 0,
          unit_price: unitPrice,
          unit_cost: product.cost || 0,
          discount: itemDiscount,
          total_price: parseFloat(lineTotal.toFixed(2))
        });
      }

      const discountTotal = parseFloat(discount_amount) || 0;
      const taxable = Math.max(0, calculatedSubtotal - discountTotal);
      const taxTotal = parseFloat(((taxable * (parseFloat(tax_rate) || 0)) / 100).toFixed(2));
      const grandTotal = parseFloat((taxable + taxTotal).toFixed(2));

      // 3. Create the SalesOrder record
      const salesOrder = await SalesOrder.create({
        order_number: orderNumber,
        invoice_number: invoiceNumber,
        customer_id: customer_id || null,
        customer_name: customer_name || 'Walk-in Customer',
        customer_phone: customer_phone || '',
        status: status || 'completed',
        stock_deducted: false, // will be deducted cleanly by InventoryService
        payment_method,
        payment_status: payment_status || 'paid',
        subtotal: parseFloat(calculatedSubtotal.toFixed(2)),
        discount_amount: discountTotal,
        tax_amount: taxTotal,
        total_amount: grandTotal,
        paid_amount: payment_status === 'paid' ? grandTotal : 0,
        created_by: req.user.id,
        notes: notes || '',
        items: orderItems
      });

      // 4. If status is completed or confirmed, deduct stock via centralized engine
      if (salesOrder.status === 'completed' || salesOrder.status === 'confirmed') {
        await InventoryService.deductSale({
          salesOrderId: salesOrder._id,
          userId: req.user.id,
          req
        });
      }

      await AuditService.log({
        userId: req.user.id,
        username: req.user.username,
        action: 'SALE_CREATE',
        entity: 'SalesOrder',
        entityId: salesOrder._id,
        details: {
          order_number: orderNumber,
          customer: salesOrder.customer_name,
          total_amount: grandTotal,
          payment_method
        },
        req
      });

      res.status(201).json({
        id: salesOrder._id,
        order_number: orderNumber,
        invoice_number: invoiceNumber,
        total_amount: grandTotal,
        message: 'Sales order created and processed successfully'
      });
    } catch (error) {
      console.error('Create sales order error:', error);
      res.status(500).json({ error: error.message || 'Error creating sales order' });
    }
  }
);

// Cancel sales order - restores inventory safely exactly once!
router.post('/:id/cancel', authenticateToken, canManageSales, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid sales order ID format' });
    }

    const { reason } = req.body;
    const cancelledOrder = await InventoryService.cancelSale({
      salesOrderId: req.params.id,
      userId: req.user.id,
      reason,
      req
    });

    res.json({
      message: 'Sales order cancelled and inventory restored to stock.',
      order: cancelledOrder
    });
  } catch (error) {
    console.error('Cancel sales order error:', error);
    res.status(400).json({ error: error.message || 'Error cancelling sales order' });
  }
});

// Process customer return - adds returned items back to stock
router.post('/:id/return', authenticateToken, canManageSales, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid sales order ID format' });
    }

    const { returnItems, reason } = req.body;

    if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
      return res.status(400).json({ error: 'Items to return are required' });
    }

    const updatedOrder = await InventoryService.processCustomerReturn({
      salesOrderId: req.params.id,
      returnItems,
      reason,
      userId: req.user.id,
      req
    });

    res.json({
      message: 'Customer return processed and inventory replenished.',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Customer return error:', error);
    res.status(400).json({ error: error.message || 'Error processing customer return' });
  }
});

// Update sales order status (legacy compatibility)
router.put('/:id/status', authenticateToken, canManageSales, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid sales order ID format' });
    }

    const { status, payment_status } = req.body;

    if (status === 'cancelled') {
      const cancelled = await InventoryService.cancelSale({
        salesOrderId: req.params.id,
        userId: req.user.id,
        reason: 'Cancelled via status update',
        req
      });
      return res.json({ message: 'Order cancelled and stock restored', order: cancelled });
    }

    const order = await SalesOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    if (status) order.status = status;
    if (payment_status) order.payment_status = payment_status;

    // If changing to completed or confirmed from draft, ensure stock is deducted
    if ((status === 'completed' || status === 'confirmed') && !order.stock_deducted) {
      await InventoryService.deductSale({
        salesOrderId: order._id,
        userId: req.user.id,
        req
      });
    }

    await order.save();
    res.json({ message: 'Sales order updated successfully', order });
  } catch (error) {
    console.error('Update sales order status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
