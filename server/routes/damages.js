const express = require('express');
const { Damage } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all damage records (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const damages = await Damage.find({})
      .populate('product_id')
      .populate('deleted_by', 'username role')
      .sort({ created_at: -1 });

    const formatted = damages.map((d) => {
      const obj = d.toObject();
      return {
        ...obj,
        id: obj._id
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get damages error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;

