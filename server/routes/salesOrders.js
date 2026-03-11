const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { SalesOrder, Product, User, SalesHistory } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all sales orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const orders = await SalesOrder.find()
      .populate('created_by', 'username')
      .sort({ created_at: -1 });

    const formattedOrders = orders.map(order => {
      const orderObj = order.toObject();
      return {
        ...orderObj,
        id: orderObj._id,
        created_by_name: order.created_by?.username || null,
        created_by: order.created_by?._id?.toString() || null
      };
    });

    res.json(formattedOrders);
  } catch (error) {
    console.error('Get sales orders error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get sales order by ID with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id)
      .populate('created_by', 'username')
      .populate('items.product_id', 'name sku');

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    const formattedOrder = {
      ...order.toObject(),
      created_by_name: order.created_by?.username || null,
      items: order.items.map(item => ({
        ...item.toObject(),
        product_name: item.product_id?.name || null,
        sku: item.product_id?.sku || null,
        product_id: item.product_id?._id || null
      }))
    };

    res.json(formattedOrder);
  } catch (error) {
    console.error('Get sales order error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create sales order
router.post('/', authenticateToken, [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_name, items } = req.body;
    const orderNumber = `SO-${Date.now()}`;

    // Check stock availability
    for (const item of items) {
      const product = await Product.findById(item.product_id);
      if (!product) {
        return res.status(400).json({ error: `Product ${item.product_id} not found` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for product ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}` 
        });
      }
    }

    let totalAmount = 0;
    const orderItems = items.map(item => {
      const discount = item.discount || 0;
      const gross = item.quantity * item.unit_price;
      const discountAmount = (gross * discount) / 100;
      const totalPrice = gross - discountAmount;
      totalAmount += totalPrice;
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount,
        total_price: totalPrice
      };
    });

    const salesOrder = await SalesOrder.create({
      order_number: orderNumber,
      customer_name,
      total_amount: totalAmount,
      created_by: req.user.id,
      items: orderItems
    });

    // Update product quantities and record sales history
    for (const item of items) {
      // Update product quantity
      await Product.findByIdAndUpdate(
        item.product_id,
        { $inc: { quantity: -item.quantity } }
      );

      // Record sales history for forecasting
      const product = await Product.findById(item.product_id);
      if (product) {
        await SalesHistory.create({
          product_id: item.product_id,
          quantity: item.quantity,
          sale_date: new Date(),
          unit_price: item.unit_price,
          sales_order_id: salesOrder._id
        });
      }
    }

    res.status(201).json({ 
      id: salesOrder._id, 
      order_number: orderNumber, 
      message: 'Sales order created successfully' 
    });
  } catch (error) {
    console.error('Create sales order error:', error);
    res.status(500).json({ error: 'Error creating sales order' });
  }
});

// Update sales order status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid sales order ID format' });
    }

    const { status } = req.body;

    const order = await SalesOrder.findByIdAndUpdate(
      req.params.id,
      { status, updated_at: Date.now() },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    res.json({ message: 'Sales order status updated successfully' });
  } catch (error) {
    console.error('Update sales order status error:', error);
    res.status(500).json({ error: 'Error updating sales order: ' + error.message });
  }
});

module.exports = router;
