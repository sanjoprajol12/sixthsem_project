const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { Supplier } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all suppliers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ created_at: -1 });
    const formattedSuppliers = suppliers.map(supplier => {
      const supplierObj = supplier.toObject();
      return {
        ...supplierObj,
        id: supplierObj._id
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
    // Validate ObjectId format
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
      id: supplierObj._id
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create supplier
router.post('/', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, contact_person, email, phone, address } = req.body;

    const supplier = await Supplier.create({
      name,
      contact_person,
      email,
      phone,
      address
    });

    res.status(201).json({ id: supplier._id, message: 'Supplier created successfully' });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Error creating supplier' });
  }
});

// Update supplier
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supplier ID format' });
    }

    const { name, contact_person, email, phone, address } = req.body;

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      {
        name,
        contact_person,
        email,
        phone,
        address
      },
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Error updating supplier' });
  }
});

// Delete supplier
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Validate ObjectId format
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
