const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { InventoryTransaction, StockAdjustment, Product } = require('../models');
const { authenticateToken, canManageInventory, canViewReports } = require('../middleware/auth');
const InventoryService = require('../services/inventoryService');

const router = express.Router();

// Get complete inventory transaction ledger / audit history
router.get('/ledger', authenticateToken, canViewReports, async (req, res) => {
  try {
    const { productId, type, startDate, endDate, limit = 100 } = req.query;
    let query = {};

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      query.product_id = productId;
    }

    if (type && type !== 'all') {
      query.transaction_type = type;
    }

    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.created_at.$lte = end;
      }
    }

    const transactions = await InventoryTransaction.find(query)
      .populate('product_id', 'sku name category unit_of_measure')
      .populate('performed_by', 'username role')
      .populate('location_id', 'name code')
      .sort({ created_at: -1 })
      .limit(parseInt(limit, 10));

    const formatted = transactions.map((t) => {
      const obj = t.toObject();
      return {
        ...obj,
        id: obj._id,
        product_name: t.product_id?.name || 'Unknown',
        product_sku: t.product_id?.sku || 'N/A',
        unit_of_measure: t.product_id?.unit_of_measure || 'pcs',
        performed_by_name: t.performed_by?.username || 'System',
        location_name: t.location_id?.name || 'Main Warehouse'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({ error: 'Database error fetching inventory ledger' });
  }
});

// Calculate Inventory Valuation (Weighted Average, FIFO, LIFO)
router.get('/valuation', authenticateToken, canViewReports, async (req, res) => {
  try {
    const { method = 'weighted_average' } = req.query;
    const valuation = await InventoryService.calculateValuation(method.toLowerCase());
    res.json(valuation);
  } catch (error) {
    console.error('Inventory valuation error:', error);
    res.status(500).json({ error: error.message || 'Error calculating inventory valuation' });
  }
});

// Create physical inventory adjustment reconciliation
router.post(
  '/adjust',
  authenticateToken,
  canManageInventory,
  [
    body('reason').notEmpty().withMessage('Reason for adjustment is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required for adjustment')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items, reason, notes, location_id } = req.body;

      const adjustment = await InventoryService.adjustStock({
        items,
        reason,
        notes,
        locationId: location_id,
        userId: req.user.id,
        req
      });

      res.status(201).json({
        message: 'Stock adjustment applied successfully and ledger updated.',
        adjustment
      });
    } catch (error) {
      console.error('Stock adjustment error:', error);
      res.status(400).json({ error: error.message || 'Error applying stock adjustment' });
    }
  }
);

// Get previous stock adjustments
router.get('/adjustments', authenticateToken, canViewReports, async (req, res) => {
  try {
    const adjustments = await StockAdjustment.find()
      .populate('performed_by', 'username role')
      .populate('items.product_id', 'sku name category')
      .sort({ created_at: -1 });

    res.json(adjustments);
  } catch (error) {
    console.error('Get adjustments error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get stock health distribution
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find({ status: { $ne: 'archived' } });

    let outOfStock = 0;
    let critical = 0;
    let lowStock = 0;
    let healthy = 0;
    let overstocked = 0;

    products.forEach((p) => {
      const status = p.stock_status;
      if (status === 'OUT_OF_STOCK') outOfStock++;
      else if (status === 'CRITICAL') critical++;
      else if (status === 'LOW_STOCK') lowStock++;
      else if (status === 'OVERSTOCKED') overstocked++;
      else healthy++;
    });

    res.json({
      total_products: products.length,
      out_of_stock: outOfStock,
      critical,
      low_stock: lowStock,
      healthy,
      overstocked
    });
  } catch (error) {
    console.error('Stock health error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
