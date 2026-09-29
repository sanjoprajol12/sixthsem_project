const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(403).json({ error: 'Invalid token payload' });
    }

    // Always check database to ensure user is active and has not been disabled
    const dbUser = await User.findById(decoded.id).select('-password');
    if (!dbUser) {
      return res.status(401).json({ error: 'User account not found' });
    }

    if (dbUser.status === 'disabled' || dbUser.status === 'inactive') {
      return res.status(403).json({
        error: 'Your account is deactivated. Please contact an administrator.',
        account_disabled: true
      });
    }

    if (dbUser.status === 'pending') {
      return res.status(403).json({
        error: 'Your account is pending administrator approval.',
        account_pending: true
      });
    }

    req.user = {
      id: dbUser._id.toString(),
      username: dbUser.username,
      email: dbUser.email,
      full_name: dbUser.full_name || dbUser.username,
      role: dbUser.role,
      status: dbUser.status
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Flexible RBAC middleware.
 * Super Admins and Admins automatically inherit all operational permissions.
 */
const normalizeRole = (r) => (r || '').toLowerCase().trim().replace(/[\s-]+/g, '_');

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = normalizeRole(req.user.role);
    const normalizedAllowed = allowedRoles.map(normalizeRole);

    // Super Admin and Admin have universal bypass for all roles
    if (userRole === 'super_admin' || userRole === 'superadmin' || userRole === 'admin') {
      return next();
    }

    if (normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`
    });
  };
};

const requireAdmin = requireRole('super_admin', 'admin');
const canManageInventory = requireRole('super_admin', 'admin', 'inventory_manager');
const canManagePurchases = requireRole('super_admin', 'admin', 'inventory_manager', 'purchase_staff');
const canManageSales = requireRole('super_admin', 'admin', 'sales_staff', 'staff');
const canViewReports = requireRole('super_admin', 'admin', 'inventory_manager', 'purchase_staff', 'sales_staff', 'staff');

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  canManageInventory,
  canManagePurchases,
  canManageSales,
  canViewReports
};
