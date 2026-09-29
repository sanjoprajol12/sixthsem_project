const express = require('express');
const { AuditLog } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get audit logs with filters (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { action, entity, user, startDate, endDate, limit = 100 } = req.query;
    let query = {};

    if (action && action !== 'all') {
      query.action = action;
    }

    if (entity && entity !== 'all') {
      query.entity = entity;
    }

    if (user) {
      query.username = { $regex: user, $options: 'i' };
    }

    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.created_at.$lte = end;
      }
    }

    const logs = await AuditLog.find(query)
      .populate('user_id', 'username role')
      .sort({ created_at: -1 })
      .limit(parseInt(limit, 10));

    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Database error fetching audit logs' });
  }
});

module.exports = router;
