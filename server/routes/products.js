const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { Product, Supplier, Damage } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get products by barcode
// NOTE: Must be defined before "/:id" to avoid route conflicts.
router.get('/barcode/:barcode', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode })
      .populate('supplier_id', 'name');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productObj = product.toObject();
    const formattedProduct = {
      ...productObj,
      id: productObj._id,
      supplier_name: product.supplier_id?.name || null,
      supplier_id: product.supplier_id?._id?.toString() || null
    };

    res.json(formattedProduct);
  } catch (error) {
    console.error('Get product by barcode error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all products with search and filter
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, category, supplier, minStock, maxStock } = req.query;
    
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (supplier) {
      query.supplier_id = supplier;
    }

    if (minStock) {
      query.quantity = { ...query.quantity, $gte: parseInt(minStock) };
    }

    if (maxStock) {
      query.quantity = { ...query.quantity, $lte: parseInt(maxStock) };
    }

    const products = await Product.find(query)
      .populate('supplier_id', 'name')
      .sort({ created_at: -1 });

    const formattedProducts = products.map(product => {
      const productObj = product.toObject();
      return {
        ...productObj,
        id: productObj._id,
        supplier_name: product.supplier_id?.name || null,
        supplier_id: product.supplier_id?._id?.toString() || null
      };
    });

    res.json(formattedProducts);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get products by barcode
// NOTE: Must be defined before "/:id" to avoid route conflicts.
router.get('/barcode/:barcode', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode })
      .populate('supplier_id', 'name');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productObj = product.toObject();
    const formattedProduct = {
      ...productObj,
      id: productObj._id,
      supplier_name: product.supplier_id?.name || null,
      supplier_id: product.supplier_id?._id?.toString() || null
    };

    res.json(formattedProduct);
  } catch (error) {
    console.error('Get product by barcode error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get product by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    const product = await Product.findById(req.params.id)
      .populate('supplier_id', 'name');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productObj = product.toObject();
    const formattedProduct = {
      ...productObj,
      id: productObj._id,
      supplier_name: product.supplier_id?.name || null,
      supplier_id: product.supplier_id?._id?.toString() || null
    };

    res.json(formattedProduct);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create product (Admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('sku').notEmpty().withMessage('SKU is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('cost').isFloat({ min: 0 }).withMessage('Cost must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sku, name, description, category, quantity, reorder_level, price, cost, supplier_id, barcode } = req.body;

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    const product = await Product.create({
      sku,
      name,
      description,
      category,
      quantity: quantity || 0,
      reorder_level: reorder_level || 10,
      price,
      cost,
      supplier_id: supplier_id || null,
      barcode: barcode || null
    });

    res.status(201).json({ id: product._id, message: 'Product created successfully' });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Error creating product' });
  }
});

// Update product (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    const { name, description, category, quantity, reorder_level, price, cost, supplier_id, barcode } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        category,
        quantity,
        reorder_level,
        price,
        cost,
        supplier_id: supplier_id || null,
        barcode: barcode || null,
        updated_at: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Error updating product' });
  }
});

// Delete product (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// Move product quantity to damage (Admin only)
router.post('/:id/damage', authenticateToken, requireAdmin, [
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be an integer >= 1'),
  body('remark')
    .notEmpty()
    .withMessage('Remark is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors.array().map((e) => e.msg).join(', ');
      return res.status(400).json({ error: message });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    const qty = parseInt(req.body.quantity);
    const remark = (req.body.remark || '').trim();

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (qty > product.quantity) {
      return res.status(400).json({ error: `Quantity cannot exceed available stock (${product.quantity})` });
    }

    await Damage.create({
      product_id: product._id,
      quantity: qty,
      remark,
      deleted_by: req.user?.id || null,
      product_snapshot: {
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        cost: product.cost,
        supplier_id: product.supplier_id || null,
        barcode: product.barcode || null
      }
    });

    const newQty = product.quantity - qty;
    if (newQty <= 0) {
      await Product.findByIdAndDelete(product._id);
      return res.json({ message: 'Product moved to damage and deleted (quantity reached 0)' });
    }

    product.quantity = newQty;
    await product.save();

    res.json({ message: 'Product moved to damage successfully', remaining_quantity: newQty });
  } catch (error) {
    console.error('Move to damage error:', error);
    res.status(500).json({ error: 'Error moving product to damage' });
  }
});

module.exports = router;
