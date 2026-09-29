const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { Supplier } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all suppliers with optional filtering
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
        { contact_person: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const suppliers = await Supplier.find(query).sort({ created_at: -1 });
    const formattedSuppliers = suppliers.map(supplier => {
      const supplierObj = supplier.toObject();
      return {
        ...supplierObj,
        id: supplierObj._id,
        status: supplierObj.status || 'active'
      };
    });
    res.json(formattedSuppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get supplier by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supplier ID format' });
    }

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const supplierObj = supplier.toObject();
    res.json({
      ...supplierObj,
      id: supplierObj._id,
      status: supplierObj.status || 'active'
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create supplier (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array().map(e => e.msg).join(', '),
        errors: errors.array() 
      });
    }

    const { name, contact_person, email, phone, address, status } = req.body;

    const supplier = await Supplier.create({
      name: name.trim(),
      contact_person: (contact_person || '').trim(),
      email: (email || '').trim().toLowerCase(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      status: status || 'active'
    });

    res.status(201).json({ id: supplier._id, message: 'Supplier created successfully', supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: error.message || 'Error creating supplier' });
  }
});

// Update supplier (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supplier ID format' });
    }

    const { name, contact_person, email, phone, address, status } = req.body;
    const updateData = { name, contact_person, email, phone, address };
    if (status) updateData.status = status;

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: 'Supplier updated successfully', supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Error updating supplier' });
  }
});

// Toggle / Update supplier status
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supplier ID format' });
    }

    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active or inactive' });
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: `Supplier marked as ${status}`, supplier });
  } catch (error) {
    console.error('Update supplier status error:', error);
    res.status(500).json({ error: 'Error updating supplier status' });
  }
});

// Delete supplier (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supplier ID format' });
    }

    const supplier = await Supplier.findByIdAndDelete(req.params.id);

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Error deleting supplier' });
  }
});

module.exports = router;
