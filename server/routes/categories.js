const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { Category } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const categories = await Category.find(query).sort({ name: 1 });
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

      const { name, description, status = 'active' } = req.body;

      const existing = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (existing) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }

      const category = await Category.create({ name, description, status });

      res.status(201).json({ id: category._id, category, message: 'Category created successfully' });
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

    const { name, description, status } = req.body;
    const updateData = { updated_at: Date.now() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully', category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Error updating category' });
  }
});

// Toggle / update category status
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid category ID format' });
    }

    const { status } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const newStatus = status || (category.status === 'active' ? 'inactive' : 'active');
    category.status = newStatus;
    category.updated_at = Date.now();
    await category.save();

    res.json({ message: `Category status updated to ${newStatus}`, category });
  } catch (error) {
    console.error('Update category status error:', error);
    res.status(500).json({ error: 'Error updating category status' });
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

