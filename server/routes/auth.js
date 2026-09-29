const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const AuditService = require('../services/auditService');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';

// Register
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username is required').trim(),
    body('email').isEmail().withMessage('Valid email is required').trim(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const message = errors.array().map((e) => e.msg).join(', ');
        return res.status(400).json({ error: message });
      }

      const { username, email, password, full_name, role = 'sales_staff' } = req.body;

      const existingUser = await User.findOne({
        $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User with this username or email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // If there are zero users in the database, automatically make the first user super_admin
      const userCount = await User.countDocuments();
      const assignedRole = userCount === 0 ? 'super_admin' : (['sales_staff', 'purchase_staff', 'staff'].includes(role) ? role : 'sales_staff');
      const assignedStatus = userCount === 0 ? 'active' : 'pending';

      const user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        full_name: full_name || '',
        role: assignedRole,
        status: assignedStatus
      });

      await AuditService.log({
        userId: user._id,
        username: user.username,
        action: 'USER_REGISTER',
        entity: 'User',
        entityId: user._id,
        details: { role: user.role, status: user.status },
        req
      });

      const message =
        assignedStatus === 'active'
          ? 'Registration successful. You may now log in.'
          : 'Registration successful. Your account is pending admin approval.';

      res.status(201).json({ message, user: { id: user._id, username: user.username, role: user.role, status: user.status } });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Server error during registration' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username or email is required').trim(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const message = errors.array().map((e) => e.msg).join(', ');
        return res.status(400).json({ error: message });
      }

      const { username, password } = req.body;
      const cleanUsername = username.toLowerCase();

      const user = await User.findOne({
        $or: [{ username: cleanUsername }, { email: cleanUsername }]
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Account pending approval by administrator' });
      }

      if (user.status === 'disabled') {
        return res.status(403).json({ error: 'Your account is disabled. Please contact administrator.' });
      }

      const token = jwt.sign(
        {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          full_name: user.full_name || user.username
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      await AuditService.log({
        userId: user._id,
        username: user.username,
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user._id,
        details: { role: user.role },
        req
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          full_name: user.full_name || user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

module.exports = router;
