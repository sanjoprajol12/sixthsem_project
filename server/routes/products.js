const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { Product, Supplier, Category } = require('../models');
const { authenticateToken, canManageInventory, requireAdmin } = require('../middleware/auth');
const InventoryService = require('../services/inventoryService');
const AuditService = require('../services/auditService');

const router = express.Router();

// Get products by barcode
router.get('/barcode/:barcode', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode.trim() })
      .populate('supplier_id', 'name contact_person phone')
      .populate('location_id', 'name code');

    if (!product) {
      return res.status(404).json({ error: 'Product not found with this barcode' });
    }

    const productObj = product.toObject();
    res.json({
      ...productObj,
      id: productObj._id,
      supplier_name: product.supplier_id?.name || null,
      supplier_id: product.supplier_id?._id?.toString() || null,
      location_name: product.location_id?.name || 'Main Warehouse'
    });
  } catch (error) {
    console.error('Get product by barcode error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all products with rich filtering and stock status calculation
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, category, supplier, stockStatus, minStock, maxStock, status } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    } else {
      // By default exclude archived unless asked
      query.status = { $ne: 'archived' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (supplier && supplier !== 'all') {
      query.supplier_id = supplier;
    }

    if (minStock !== undefined && minStock !== '') {
      query.quantity = { ...query.quantity, $gte: parseInt(minStock, 10) };
    }

    if (maxStock !== undefined && maxStock !== '') {
      query.quantity = { ...query.quantity, $lte: parseInt(maxStock, 10) };
    }

    const products = await Product.find(query)
      .populate('supplier_id', 'name contact_person email phone')
      .populate('location_id', 'name code')
      .sort({ created_at: -1 });

    let formattedProducts = products.map((product) => {
      const productObj = product.toObject({ virtuals: true });
      return {
        ...productObj,
        id: productObj._id,
        supplier_name: product.supplier_id?.name || null,
        supplier_id: product.supplier_id?._id?.toString() || null,
        location_name: product.location_id?.name || 'Main Warehouse'
      };
    });

    // In-memory filter for computed virtual stock_status if specified
    if (stockStatus && stockStatus !== 'all') {
      formattedProducts = formattedProducts.filter((p) => p.stock_status === stockStatus);
    }

    res.json(formattedProducts);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get product by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    const product = await Product.findById(req.params.id)
      .populate('supplier_id', 'name contact_person email phone address')
      .populate('location_id', 'name code');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productObj = product.toObject({ virtuals: true });
    res.json({
      ...productObj,
      id: productObj._id,
      supplier_name: product.supplier_id?.name || null,
      supplier_id: product.supplier_id?._id?.toString() || null,
      location_name: product.location_id?.name || 'Main Warehouse'
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create product (Inventory Managers & Admins)
router.post(
  '/',
  authenticateToken,
  canManageInventory,
  [
    body('sku').notEmpty().withMessage('SKU is required').trim(),
    body('name').notEmpty().withMessage('Product name is required').trim(),
    body('price').isFloat({ min: 0 }).withMessage('Selling price must be non-negative'),
    body('cost').isFloat({ min: 0 }).withMessage('Cost price must be non-negative')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        sku,
        name,
        description,
        category,
        brand,
        unit_of_measure,
        quantity,
        reorder_level,
        minimum_stock,
        maximum_stock,
        price,
        cost,
        supplier_id,
        location_id,
        barcode,
        batch_number,
        expiry_date,
        lead_time_days
      } = req.body;

      const upperSku = sku.toUpperCase();

      // Check for SKU conflict
      const existingProduct = await Product.findOne({ sku: upperSku });
      if (existingProduct) {
        return res.status(400).json({ error: `SKU "${upperSku}" already exists` });
      }

      const initialQty = parseInt(quantity, 10) || 0;
      const initialCost = parseFloat(cost) || 0;

      const product = await Product.create({
        sku: upperSku,
        name,
        description: description || '',
        category: category || 'General',
        brand: brand || '',
        unit_of_measure: unit_of_measure || 'pcs',
        quantity: initialQty,
        reorder_level: parseInt(reorder_level, 10) || 10,
        minimum_stock: parseInt(minimum_stock, 10) || 5,
        maximum_stock: parseInt(maximum_stock, 10) || 200,
        price: parseFloat(price) || 0,
        cost: initialCost,
        supplier_id: supplier_id || null,
        location_id: location_id || null,
        barcode: barcode ? barcode.trim() : null,
        batch_number: batch_number || '',
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        lead_time_days: parseInt(lead_time_days, 10) || 7,
        status: 'active'
      });

      // If initial quantity > 0, log an initial inventory transaction in the ledger
      if (initialQty > 0) {
        await InventoryService.applyStockMovement({
          productId: product._id,
          quantityChange: 0, // already in product, just write transaction
          transactionType: 'INITIAL_COUNT',
          unitCost: initialCost,
          referenceType: 'Manual',
          referenceNumber: 'INITIAL-STOCK',
          performedBy: req.user.id,
          notes: 'Initial stock recorded on product creation'
        });
      }

      await AuditService.log({
        userId: req.user.id,
        username: req.user.username,
        action: 'PRODUCT_CREATE',
        entity: 'Product',
        entityId: product._id,
        details: { sku: product.sku, name: product.name, initialQty, price, cost },
        req
      });

      res.status(201).json({
        id: product._id,
        product,
        message: 'Product created successfully'
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Error creating product: ' + error.message });
    }
  }
);

// Update product (Inventory Managers & Admins)
router.put('/:id', authenticateToken, canManageInventory, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    const {
      name,
      description,
      category,
      brand,
      unit_of_measure,
      reorder_level,
      minimum_stock,
      maximum_stock,
      price,
      cost,
      supplier_id,
      location_id,
      barcode,
      batch_number,
      expiry_date,
      lead_time_days,
      status
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Notice: quantity is NOT directly edited here! It goes through InventoryService to maintain audit trail.
    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (category) product.category = category;
    if (brand !== undefined) product.brand = brand;
    if (unit_of_measure) product.unit_of_measure = unit_of_measure;
    if (reorder_level !== undefined) product.reorder_level = parseInt(reorder_level, 10);
    if (minimum_stock !== undefined) product.minimum_stock = parseInt(minimum_stock, 10);
    if (maximum_stock !== undefined) product.maximum_stock = parseInt(maximum_stock, 10);
    if (price !== undefined) product.price = parseFloat(price);
    if (cost !== undefined) product.cost = parseFloat(cost);
    if (supplier_id !== undefined) product.supplier_id = supplier_id || null;
    if (location_id !== undefined) product.location_id = location_id || null;
    if (barcode !== undefined) product.barcode = barcode ? barcode.trim() : null;
    if (batch_number !== undefined) product.batch_number = batch_number;
    if (expiry_date !== undefined) product.expiry_date = expiry_date ? new Date(expiry_date) : null;
    if (lead_time_days !== undefined) product.lead_time_days = parseInt(lead_time_days, 10);
    if (status) product.status = status;

    await product.save();

    await AuditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'PRODUCT_UPDATE',
      entity: 'Product',
      entityId: product._id,
      details: { sku: product.sku, name: product.name, price: product.price, cost: product.cost },
      req
    });

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Error updating product: ' + error.message });
  }
});

// Archive product instead of hard deleting (Preserves data integrity)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete/archive
    product.status = 'archived';
    await product.save();

    await AuditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'PRODUCT_ARCHIVE',
      entity: 'Product',
      entityId: product._id,
      details: { sku: product.sku, name: product.name },
      req
    });

    res.json({ message: 'Product archived successfully. Historical transaction data preserved.' });
  } catch (error) {
    console.error('Archive product error:', error);
    res.status(500).json({ error: 'Error archiving product' });
  }
});

// Move product quantity to damage using centralized inventory engine (Admin & Inventory Managers)
// NEVER deletes product when quantity reaches 0!
router.post(
  '/:id/damage',
  authenticateToken,
  canManageInventory,
  [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be an integer >= 1'),
    body('remark').notEmpty().withMessage('Remark/reason is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const message = errors.array().map((e) => e.msg).join(', ');
        return res.status(400).json({ error: message });
      }

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid product ID format' });
      }

      const { quantity, remark, damage_type } = req.body;

      const damage = await InventoryService.recordDamage({
        productId: req.params.id,
        quantity,
        damageType: damage_type || 'Broken / Transit Damage',
        remark,
        userId: req.user.id,
        req
      });

      const updatedProduct = await Product.findById(req.params.id);

      res.json({
        message: 'Damage recorded successfully and inventory reduced.',
        damage,
        remaining_quantity: updatedProduct ? updatedProduct.quantity : 0
      });
    } catch (error) {
      console.error('Move to damage error:', error);
      res.status(400).json({ error: error.message || 'Error moving product to damage' });
    }
  }
);

module.exports = router;
