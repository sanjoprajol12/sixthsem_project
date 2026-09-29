const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { PurchaseOrder, Product, Supplier, User } = require('../models');
const {
  authenticateToken,
  canManagePurchases,
  canManageInventory,
  requireAdmin
} = require('../middleware/auth');
const InventoryService = require('../services/inventoryService');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');

const router = express.Router();

// Get all purchase orders with optional status or supplier filter
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, supplier, search } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (supplier && supplier !== 'all') {
      query.supplier_id = supplier;
    }

    if (search) {
      query.order_number = { $regex: search, $options: 'i' };
    }

    const orders = await PurchaseOrder.find(query)
      .populate('supplier_id', 'name contact_person email phone address')
      .populate('created_by', 'username role')
      .populate('approved_by', 'username role')
      .populate('items.product_id', 'name sku price cost unit_of_measure')
      .sort({ created_at: -1 });

    const formattedOrders = orders.map((order) => {
      const orderObj = order.toObject();
      return {
        ...orderObj,
        id: orderObj._id,
        supplier_name: order.supplier_id?.name || 'N/A',
        supplier_contact: order.supplier_id?.contact_person || '',
        created_by_name: order.created_by?.username || 'System',
        approved_by_name: order.approved_by?.username || null
      };
    });

    res.json(formattedOrders);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get purchase order by ID with item breakdowns
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid purchase order ID format' });
    }

    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier_id', 'name contact_person email phone address')
      .populate('created_by', 'username role email')
      .populate('approved_by', 'username role')
      .populate('items.product_id', 'name sku price cost unit_of_measure quantity');

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const formattedOrder = {
      ...order.toObject(),
      id: order._id,
      supplier_name: order.supplier_id?.name || 'N/A',
      created_by_name: order.created_by?.username || 'N/A',
      approved_by_name: order.approved_by?.username || null,
      items: order.items.map((item) => ({
        ...item.toObject(),
        product_name: item.product_id?.name || 'Unknown Item',
        sku: item.product_id?.sku || 'N/A',
        current_stock: item.product_id?.quantity || 0,
        unit_of_measure: item.product_id?.unit_of_measure || 'pcs',
        product_id: item.product_id?._id || item.product_id
      }))
    };

    res.json(formattedOrder);
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create purchase order (Purchase Staff, Inventory Managers, Admins)
router.post(
  '/',
  authenticateToken,
  canManagePurchases,
  [
    body('supplier_id').notEmpty().withMessage('Supplier is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { supplier_id, items, notes, expected_delivery_date, status = 'submitted' } = req.body;
      const orderNumber = `PO-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      let calculatedSubtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const prod = await Product.findById(item.product_id);
        if (!prod) {
          return res.status(400).json({ error: `Product ID ${item.product_id} not found` });
        }

        const quantity = parseInt(item.quantity, 10);
        const unitPrice = parseFloat(item.unit_price !== undefined ? item.unit_price : prod.cost);
        const discount = parseFloat(item.discount || 0);

        if (quantity <= 0) {
          return res.status(400).json({ error: `Quantity for ${prod.name} must be greater than 0` });
        }

        const gross = quantity * unitPrice;
        const discountAmount = (gross * discount) / 100;
        const totalPrice = gross - discountAmount;
        calculatedSubtotal += totalPrice;

        orderItems.push({
          product_id: prod._id,
          quantity,
          received_quantity: 0,
          unit_price: unitPrice,
          discount,
          total_price: parseFloat(totalPrice.toFixed(2))
        });
      }

      const purchaseOrder = await PurchaseOrder.create({
        order_number: orderNumber,
        supplier_id,
        subtotal: calculatedSubtotal,
        total_amount: calculatedSubtotal,
        created_by: req.user.id,
        status: status === 'draft' ? 'draft' : 'submitted',
        expected_delivery_date: expected_delivery_date ? new Date(expected_delivery_date) : null,
        notes: notes || '',
        items: orderItems
      });

      await AuditService.log({
        userId: req.user.id,
        username: req.user.username,
        action: 'PO_CREATE',
        entity: 'PurchaseOrder',
        entityId: purchaseOrder._id,
        details: { order_number: orderNumber, total_amount: calculatedSubtotal, items_count: orderItems.length },
        req
      });

      // Notify managers about new PO pending approval
      await NotificationService.notify({
        title: `New PO Created: ${orderNumber}`,
        message: `Purchase order ${orderNumber} created for NPR ${calculatedSubtotal.toFixed(2)}. Pending approval.`,
        type: 'po_pending',
        severity: 'info',
        targetRole: 'inventory_manager',
        referenceType: 'PurchaseOrder',
        referenceId: purchaseOrder._id
      });

      res.status(201).json({
        id: purchaseOrder._id,
        order_number: orderNumber,
        message: 'Purchase order created successfully',
        purchaseOrder
      });
    } catch (error) {
      console.error('Create purchase order error:', error);
      res.status(500).json({ error: 'Error creating purchase order: ' + error.message });
    }
  }
);

// Approve purchase order (Super Admin, Admin, Inventory Manager)
router.put('/:id/approve', authenticateToken, canManageInventory, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid purchase order ID format' });
    }

    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (order.status !== 'submitted' && order.status !== 'draft' && order.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve order with current status "${order.status}"` });
    }

    order.status = 'approved';
    order.approved_by = req.user.id;
    order.approved_at = new Date();
    await order.save();

    await AuditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'PO_APPROVE',
      entity: 'PurchaseOrder',
      entityId: order._id,
      details: { order_number: order.order_number, total_amount: order.total_amount },
      req
    });

    res.json({ message: 'Purchase order approved successfully', order });
  } catch (error) {
    console.error('Approve purchase order error:', error);
    res.status(500).json({ error: 'Error approving purchase order' });
  }
});

// Mark purchase order as ordered to supplier
router.put('/:id/order', authenticateToken, canManagePurchases, async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== 'approved') {
      return res.status(400).json({ error: 'Purchase order must be approved before placing with supplier' });
    }

    order.status = 'ordered';
    await order.save();

    res.json({ message: 'Purchase order status updated to Ordered', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Receive goods (Supports Partial Receiving and Full Receiving)
// Increases inventory strictly by received amounts and writes audit ledger transactions!
router.post('/:id/receive', authenticateToken, canManageInventory, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid purchase order ID format' });
    }

    const { itemsReceived, notes } = req.body;

    if (!itemsReceived || !Array.isArray(itemsReceived) || itemsReceived.length === 0) {
      return res.status(400).json({ error: 'Items to receive are required' });
    }

    const updatedOrder = await InventoryService.receivePurchaseOrder({
      purchaseOrderId: req.params.id,
      itemsReceived,
      userId: req.user.id,
      notes,
      req
    });

    res.json({
      message: `Goods received successfully. Status is now ${updatedOrder.status.toUpperCase()}.`,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Receive goods error:', error);
    res.status(400).json({ error: error.message || 'Error receiving purchase order goods' });
  }
});

// Cancel purchase order
router.put('/:id/cancel', authenticateToken, canManageInventory, async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (['received', 'closed'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot cancel an order that has already been fully received.' });
    }

    order.status = 'cancelled';
    order.notes = (order.notes || '') + ` | Cancelled by ${req.user.username}: ${req.body.reason || ''}`;
    await order.save();

    await AuditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'PO_CANCEL',
      entity: 'PurchaseOrder',
      entityId: order._id,
      details: { order_number: order.order_number, reason: req.body.reason },
      req
    });

    res.json({ message: 'Purchase order cancelled successfully', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Legacy status update compatibility
router.put('/:id/status', authenticateToken, canManageInventory, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await PurchaseOrder.findById(req.params.id).populate('items.product_id');

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (status === 'received') {
      // If legacy calls set status='received', receive all remaining unreceived items
      const itemsToReceive = order.items.map((it) => ({
        itemId: it._id.toString(),
        quantityReceived: it.quantity - (it.received_quantity || 0)
      })).filter((it) => it.quantityReceived > 0);

      if (itemsToReceive.length > 0) {
        await InventoryService.receivePurchaseOrder({
          purchaseOrderId: order._id,
          itemsReceived: itemsToReceive,
          userId: req.user.id,
          notes: 'Received via legacy status update',
          req
        });
      }
    } else {
      order.status = status;
      await order.save();
    }

    res.json({ message: 'Purchase order status updated successfully' });
  } catch (error) {
    console.error('Update PO status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
