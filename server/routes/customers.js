const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { Customer, SalesOrder } = require('../models');
const { authenticateToken, canManageSales, requireAdmin } = require('../middleware/auth');
const AuditService = require('../services/auditService');

const router = express.Router();

// Get all customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, type, status } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      query.customer_type = type;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { customer_code: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(query).sort({ created_at: -1 });
    res.json(
      customers.map((c) => ({
        ...c.toObject(),
        id: c._id
      }))
    );
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get customer by ID with sales history
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const orders = await SalesOrder.find({ customer_id: customer._id })
      .sort({ created_at: -1 })
      .limit(20);

    const totalPurchased = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_amount : 0), 0);

    res.json({
      ...customer.toObject(),
      id: customer._id,
      orders_count: orders.length,
      total_purchased: parseFloat(totalPurchased.toFixed(2)),
      recent_orders: orders
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create customer
router.post(
  '/',
  authenticateToken,
  canManageSales,
  [
    body('name').notEmpty().withMessage('Customer name is required').trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        email,
        phone,
        address,
        customer_type = 'retail',
        tax_number,
        credit_limit,
        notes
      } = req.body;

      const customerCode = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;

      const customer = await Customer.create({
        name,
        customer_code: customerCode,
        email: email || '',
        phone: phone || '',
        address: address || '',
        customer_type,
        tax_number: tax_number || '',
        credit_limit: parseFloat(credit_limit) || 0,
        notes: notes || '',
        status: 'active'
      });

      await AuditService.log({
        userId: req.user.id,
        username: req.user.username,
        action: 'CUSTOMER_CREATE',
        entity: 'Customer',
        entityId: customer._id,
        details: { name: customer.name, phone: customer.phone, customer_type },
        req
      });

      res.status(201).json({ id: customer._id, customer, message: 'Customer created successfully' });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({ error: error.message || 'Error creating customer' });
    }
  }
);

// Update customer
router.put('/:id', authenticateToken, canManageSales, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }

    const { name, email, phone, address, customer_type, tax_number, credit_limit, notes, status } = req.body;
    const updateData = { updated_at: Date.now() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (customer_type !== undefined) updateData.customer_type = customer_type;
    if (tax_number !== undefined) updateData.tax_number = tax_number;
    if (credit_limit !== undefined) updateData.credit_limit = credit_limit;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer updated successfully', customer });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Error updating customer' });
  }
});

// Toggle / update customer status
router.put('/:id/status', authenticateToken, canManageSales, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }

    const { status } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const newStatus = status || (customer.status === 'active' ? 'inactive' : 'active');
    customer.status = newStatus;
    customer.updated_at = Date.now();
    await customer.save();

    res.json({ message: `Customer status updated to ${newStatus}`, customer });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({ error: 'Error updating customer status' });
  }
});

// Delete customer
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }

    const customer = await Customer.findByIdAndUpdate(req.params.id, { status: 'inactive' });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deactivated successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Error deactivating customer' });
  }
});

module.exports = router;
