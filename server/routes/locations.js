const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { Location, Product } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all locations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const locations = await Location.find().sort({ is_default: -1, name: 1 });
    res.json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create location (Admin only)
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  [
    body('name').notEmpty().withMessage('Location name is required'),
    body('code').notEmpty().withMessage('Location code is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, code, address, is_default } = req.body;

      if (is_default) {
        await Location.updateMany({}, { is_default: false });
      }

      const location = await Location.create({
        name,
        code: code.toUpperCase(),
        address: address || '',
        is_default: Boolean(is_default)
      });

      res.status(201).json({ message: 'Location created successfully', location });
    } catch (error) {
      console.error('Create location error:', error);
      res.status(500).json({ error: error.message || 'Error creating location' });
    }
  }
);

module.exports = router;
