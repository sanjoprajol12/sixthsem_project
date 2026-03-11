const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { Category } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(
      categories.map((cat) => ({
        ...cat.toObject(),
        id: cat._id
      }))
    );
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create category
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  [body('name').notEmpty().withMessage('Name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;

      const existing = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (existing) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }

      const category = await Category.create({ name, description });

      res.status(201).json({ id: category._id, message: 'Category created successfully' });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Error creating category' });
    }
  }
);

// Update category
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid category ID format' });
    }

    const { name, description } = req.body;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, updated_at: Date.now() },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Error updating category' });
  }
});

// Delete category
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid category ID format' });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Error deleting category' });
  }
});

module.exports = router;

