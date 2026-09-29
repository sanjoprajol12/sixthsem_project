const express = require('express');
const { Damage, Product } = require('../models');
const { authenticateToken, canManageInventory } = require('../middleware/auth');
const InventoryService = require('../services/inventoryService');

const router = express.Router();

// Get all damage records with rich metadata
router.get('/', authenticateToken, canManageInventory, async (req, res) => {
  try {
    const damages = await Damage.find({})
      .populate('product_id', 'sku name category cost price quantity')
      .populate('recorded_by', 'username role')
      .populate('deleted_by', 'username role')
      .populate('location_id', 'name code')
      .sort({ created_at: -1 });

    const formatted = damages.map((d) => {
      const obj = d.toObject();
      return {
        ...obj,
        id: obj._id,
        product_name: d.product_id?.name || d.product_snapshot?.name || 'Archived Product',
        product_sku: d.product_id?.sku || d.product_snapshot?.sku || 'N/A',
        recorded_by_name: d.recorded_by?.username || d.deleted_by?.username || 'Staff',
        location_name: d.location_id?.name || 'Main Warehouse'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get damages error:', error);
    res.status(500).json({ error: 'Database error fetching damages' });
  }
});

// Record new damage directly
router.post('/', authenticateToken, canManageInventory, async (req, res) => {
  try {
    const { product_id, quantity, damage_type, remark, location_id } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ error: 'Product and quantity are required' });
    }

    const damage = await InventoryService.recordDamage({
      productId: product_id,
      quantity,
      damageType: damage_type,
      remark,
      locationId: location_id,
      userId: req.user.id,
      req
    });

    res.status(201).json({ message: 'Damage recorded successfully', damage });
  } catch (error) {
    console.error('Create damage error:', error);
    res.status(400).json({ error: error.message || 'Error recording damage' });
  }
});

module.exports = router;
