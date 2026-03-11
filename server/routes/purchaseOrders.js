const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { PurchaseOrder, Product, Supplier, User, InventoryTransaction } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all purchase orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate('supplier_id', 'name')
      .populate('created_by', 'username')
      .sort({ created_at: -1 });

    const formattedOrders = orders.map(order => {
      const orderObj = order.toObject();
      return {
        ...orderObj,
        id: orderObj._id,
        supplier_name: order.supplier_id?.name || null,
        created_by_name: order.created_by?.username || null,
        supplier_id: order.supplier_id?._id?.toString() || null,
        created_by: order.created_by?._id?.toString() || null
      };
    });

    res.json(formattedOrders);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get purchase order by ID with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier_id', 'name')
      .populate('created_by', 'username')
      .populate('items.product_id', 'name sku');

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const formattedOrder = {
      ...order.toObject(),
      supplier_name: order.supplier_id?.name || null,
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
    console.error('Get purchase order error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create purchase order
router.post('/', authenticateToken, [
  body('supplier_id').notEmpty().withMessage('Supplier ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { supplier_id, items } = req.body;
    const orderNumber = `PO-${Date.now()}`;
    
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

    const purchaseOrder = await PurchaseOrder.create({
      order_number: orderNumber,
      supplier_id,
      total_amount: totalAmount,
      created_by: req.user.id,
      items: orderItems
    });

    res.status(201).json({ 
      id: purchaseOrder._id, 
      order_number: orderNumber, 
      message: 'Purchase order created successfully' 
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ error: 'Error creating purchase order' });
  }
});

// Update purchase order status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid purchase order ID format' });
    }

    const { status } = req.body;
    
    const order = await PurchaseOrder.findById(req.params.id).populate('items.product_id');
    
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (status === 'received') {
      // Update inventory when order is received
      for (const item of order.items) {
        const productId = item.product_id?._id || item.product_id;
        
        if (!productId) {
          console.error('Product ID not found in item:', item);
          continue;
        }

        // Update product quantity
        await Product.findByIdAndUpdate(
          productId,
          { $inc: { quantity: item.quantity } }
        );

        // Record inventory transaction (FIFO/LIFO tracking)
        const product = await Product.findById(productId);
        if (product) {
          await InventoryTransaction.create({
            product_id: productId,
            transaction_type: 'purchase',
            quantity: item.quantity,
            unit_cost: product.cost,
            order_id: order._id
          });
        }
      }
    }

    order.status = status;
    order.updated_at = Date.now();
    await order.save();

    res.json({ message: 'Purchase order status updated successfully' });
  } catch (error) {
    console.error('Update purchase order status error:', error);
    res.status(500).json({ error: 'Error updating purchase order: ' + error.message });
  }
});

module.exports = router;
