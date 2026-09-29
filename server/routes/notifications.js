const express = require('express');
const { Notification } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get notifications for current user/role
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const query = {
      $or: [
        { target_role: 'all' },
        { target_role: userRole },
        { target_role: userRole === 'super_admin' ? 'admin' : null }
      ]
    };

    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      ...query,
      is_read: false
    });

    res.json({
      unread_count: unreadCount,
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mark single notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { is_read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ is_read: false }, { is_read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
