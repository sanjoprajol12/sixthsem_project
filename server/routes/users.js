const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 });
    res.json(
      users.map((u) => ({
        id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        created_at: u.created_at,
      }))
    );
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create staff user (admin only)
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const message = errors.array().map((e) => e.msg).join(', ');
        return res.status(400).json({ error: message });
      }

      const { username, email, password } = req.body;

      const existing = await User.findOne({
        $or: [{ username }, { email }],
      });
      if (existing) {
        return res.status(400).json({ error: 'User with that username or email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role: 'staff',
        status: 'active',
      });

      res.status(201).json({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Error creating user' });
    }
  }
);

// Update user role (admin only) - only allow changing staff roles; no new admins
router.put('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (role === 'admin') {
      return res.status(400).json({ error: 'Creating additional admins is not allowed' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Changing admin role is not allowed' });
    }

    user.role = role;
    user.updated_at = Date.now();
    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Error updating user role' });
  }
});

// Update user status (admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Changing admin status is not allowed' });
    }

    user.status = status;
    user.updated_at = Date.now();
    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Error updating user status' });
  }
});

// Change current user's password
router.put(
  '/me/password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const message = errors.array().map((e) => e.msg).join(', ');
        return res.status(400).json({ error: message });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      user.password = hashed;
      user.updated_at = Date.now();
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change own password error:', error);
      res.status(500).json({ error: 'Error updating password' });
    }
  }
);

// Admin change any staff password
router.put(
  '/:id/password',
  authenticateToken,
  requireAdmin,
  [body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const message = errors.array().map((e) => e.msg).join(', ');
        return res.status(400).json({ error: message });
      }

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const hashed = await bcrypt.hash(req.body.newPassword, 10);
      user.password = hashed;
      user.updated_at = Date.now();
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Admin change user password error:', error);
      res.status(500).json({ error: 'Error updating password' });
    }
  }
);

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
});

module.exports = router;

