const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const AuditService = require('../services/auditService');

const router = express.Router();

// Allowed roles in the system
const VALID_ROLES = [
  'super_admin',
  'admin',
  'inventory_manager',
  'sales_staff',
  'purchase_staff',
  'staff'
];

// Get all users (Admin & Super Admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 });
    res.json(
      users.map((u) => ({
        id: u._id,
        username: u.username,
        email: u.email,
        full_name: u.full_name || '',
        phone: u.phone || '',
        role: u.role,
        status: u.status,
        created_at: u.created_at
      }))
    );
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create new user with specific role (Admin only)
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  [
    body('username').notEmpty().withMessage('Username is required').trim(),
    body('email').isEmail().withMessage('Valid email is required').trim(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(VALID_ROLES).withMessage('Invalid role specified')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const message = errors.array().map((e) => e.msg).join(', ');
        return res.status(400).json({ error: message });
      }

      const { username, email, password, role, full_name, phone, status = 'active' } = req.body;

      const existing = await User.findOne({
        $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
      });

      if (existing) {
        return res.status(400).json({ error: 'User with that username or email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        full_name: full_name || '',
        phone: phone || '',
        role,
        status
      });

      await AuditService.log({
        userId: req.user.id,
        username: req.user.username,
        action: 'USER_CREATE',
        entity: 'User',
        entityId: user._id,
        details: { username: user.username, role: user.role },
        req
      });

      res.status(201).json({
        id: user._id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Error creating user' });
    }
  }
);

// Update user role
router.put('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Protect super admin role modifications
    const targetIsSuper = (user.role || '').toLowerCase().replace(/[\s-]+/g, '_') === 'super_admin';
    const requesterIsSuper = (req.user.role || '').toLowerCase().replace(/[\s-]+/g, '_') === 'super_admin';
    if (targetIsSuper && !requesterIsSuper) {
      return res.status(403).json({ error: 'Only Super Admins can modify Super Admin accounts' });
    }

    user.role = role;
    await user.save();

    await AuditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'USER_ROLE_CHANGE',
      entity: 'User',
      entityId: user._id,
      details: { username: user.username, new_role: role },
      req
    });

    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
      status: user.status,
      message: `User role updated to ${role}`
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Error updating user role' });
  }
});

// Update user status (active, disabled, pending)
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

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ error: 'You cannot change the status of your own account' });
    }

    if (user.role === 'super_admin' && status === 'disabled') {
      return res.status(400).json({ error: 'Cannot disable Super Admin account' });
    }

    user.status = status;
    await user.save();

    await AuditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'USER_STATUS_CHANGE',
      entity: 'User',
      entityId: user._id,
      details: { username: user.username, new_status: status },
      req
    });

    res.json({
      id: user._id,
      username: user.username,
      status: user.status,
      message: `User status changed to ${status}`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Error updating user status' });
  }
});

// Admin change user password
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
      await user.save();

      await AuditService.log({
        userId: req.user.id,
        username: req.user.username,
        action: 'USER_PASSWORD_RESET',
        entity: 'User',
        entityId: user._id,
        details: { username: user.username },
        req
      });

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Admin change password error:', error);
      res.status(500).json({ error: 'Error updating password' });
    }
  }
);

// Delete user (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'super_admin') {
      return res.status(400).json({ error: 'Cannot delete Super Admin account' });
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);

    await AuditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'USER_DELETE',
      entity: 'User',
      entityId: req.params.id,
      details: { username: user.username },
      req
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
});

module.exports = router;
